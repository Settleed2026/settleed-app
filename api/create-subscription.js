/**
 * POST /api/create-subscription
 *
 * Creates a Stripe subscription with a 7-day free trial and returns the
 * SetupIntent client_secret so the frontend can collect card details via
 * Stripe Elements before any charge occurs.
 *
 * Required env vars (set in Vercel → Settings → Environment Variables):
 *   STRIPE_SECRET_KEY          sk_test_... or sk_live_...
 *   SUPABASE_SERVICE_ROLE_KEY  service-role JWT (never expose to browser)
 *   VITE_SUPABASE_URL          https://<ref>.supabase.co  (already set for frontend)
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Always respond with JSON so the frontend never sees Vercel's HTML error page */
function jsonError(res, status, message, detail = undefined) {
  const body = { error: message }
  if (detail && process.env.NODE_ENV !== 'production') body.detail = detail
  return res.status(status).json(body)
}

/** Check that all required env vars are present; return the first missing name or null */
function missingEnvVar() {
  const required = [
    'STRIPE_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]
  return required.find((k) => !process.env[k]) ?? null
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req, res) {
  // ── 0. Method guard ────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return jsonError(res, 405, 'Method not allowed')
  }

  // ── 1. Env-var guard (returns JSON, not Vercel's HTML crash page) ──────────
  const missing = missingEnvVar()
  if (missing) {
    console.error(`[create-subscription] Missing env var: ${missing}`)
    return jsonError(res, 500, 'Server misconfiguration — contact support.')
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  if (!supabaseUrl) {
    console.error('[create-subscription] Missing SUPABASE_URL / VITE_SUPABASE_URL')
    return jsonError(res, 500, 'Server misconfiguration — contact support.')
  }

  // ── 2. Lazy-init clients (inside handler so missing vars don't crash import) ─
  let stripe, supabase
  try {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
    supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
  } catch (initErr) {
    console.error('[create-subscription] Client init failed:', initErr.message)
    return jsonError(res, 500, 'Server initialization error — contact support.')
  }

  // ── 3. Authenticate the user ───────────────────────────────────────────────
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonError(res, 401, 'Please sign in to start your free trial.')
  }

  const token = authHeader.replace('Bearer ', '')
  let user
  try {
    const { data, error: authError } = await supabase.auth.getUser(token)
    if (authError || !data?.user) {
      return jsonError(res, 401, 'Your session has expired. Please sign in again.')
    }
    user = data.user
  } catch (authErr) {
    console.error('[create-subscription] Auth check failed:', authErr.message)
    return jsonError(res, 500, 'Authentication error — please try again.')
  }

  // ── 4. Parse body ──────────────────────────────────────────────────────────
  const { role } = req.body ?? {}

  // ── 5. Get or create Stripe customer ──────────────────────────────────────
  let customerId
  try {
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', user.id)
      .single()

    if (profileErr) {
      console.error('[create-subscription] Profile fetch error:', profileErr.message)
    }

    customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name ?? undefined,
        metadata: { supabase_id: user.id, role: role ?? 'landlord' },
      })
      customerId = customer.id

      // Persist so we reuse the same customer on future calls
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }
  } catch (customerErr) {
    console.error('[create-subscription] Customer creation failed:', customerErr.message)
    return jsonError(res, 500, 'Failed to set up your account — please try again.')
  }

  // ── 6. Create subscription with 7-day trial ────────────────────────────────
  //
  // payment_behavior: 'default_incomplete' → subscription starts but stays
  // incomplete until the SetupIntent is confirmed (card collected).
  // expand: ['pending_setup_intent'] → gives us the client_secret we need to
  // mount Stripe Elements on the frontend.
  //
  // No Price ID required — we use inline price_data so we don't need a
  // pre-created Stripe product/price.
  // ---------------------------------------------------------------------------
  try {
    const amount = role === 'tenant' ? 499 : 4900          // cents
    const productName = role === 'tenant'
      ? 'Settleed Voucher Holder'
      : 'Settleed Landlord'

    // Subscriptions API requires an existing product ID — create one on the fly
    const product = await stripe.products.create({ name: productName })

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price_data: {
          currency: 'usd',
          product: product.id,
          unit_amount: amount,
          recurring: { interval: 'month' },
        },
      }],
      trial_period_days: 7,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['pending_setup_intent'],
    })

    const setupIntent = subscription.pending_setup_intent
    const clientSecret = setupIntent?.client_secret

    if (!clientSecret) {
      // Subscription created but no SetupIntent — unexpected state
      console.error('[create-subscription] No client_secret on pending_setup_intent', {
        subscriptionId: subscription.id,
        status: subscription.status,
      })
      return jsonError(res, 500, 'Subscription created but payment setup failed — contact support.')
    }

    console.log('[create-subscription] Success:', {
      userId: user.id,
      subscriptionId: subscription.id,
      role,
    })

    return res.status(200).json({
      subscriptionId: subscription.id,
      clientSecret,
    })
  } catch (stripeErr) {
    // Log full error server-side; send only safe message to browser
    console.error('[create-subscription] Stripe error:', {
      type: stripeErr.type,
      code: stripeErr.code,
      message: stripeErr.message,
      statusCode: stripeErr.statusCode,
    })

    // Surface Stripe's user-facing message when available
    const userMessage = stripeErr.type?.startsWith('StripeCard')
      ? stripeErr.message
      : 'Unable to create subscription — please try again or contact support.'

    return jsonError(res, stripeErr.statusCode ?? 500, userMessage)
  }
}
