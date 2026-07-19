/**
 * POST /api/create-connect-account
 *
 * Creates or retrieves a Stripe Connect Express account for the landlord,
 * then returns an Account Link URL so they can complete onboarding.
 * If the account is already fully onboarded, returns { alreadyComplete: true }.
 *
 * Required env vars (set in Vercel → Settings → Environment Variables):
 *   STRIPE_SECRET_KEY          sk_test_... or sk_live_...
 *   SUPABASE_SERVICE_ROLE_KEY  service-role JWT
 *   VITE_SUPABASE_URL          https://<ref>.supabase.co
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function jsonError(res, status, message) {
  return res.status(status).json({ error: message })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return jsonError(res, 405, 'Method not allowed')
  }

  // ── Env guard ───────────────────────────────────────────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY || !supabaseUrl) {
    console.error('[create-connect-account] Missing env vars')
    return jsonError(res, 500, 'Server misconfiguration — contact support.')
  }

  // ── Init clients ────────────────────────────────────────────────────────────
  let stripe, supabase
  try {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
    supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
  } catch (err) {
    console.error('[create-connect-account] Client init error:', err.message)
    return jsonError(res, 500, 'Server initialization error.')
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonError(res, 401, 'Please sign in to continue.')
  }
  const token = authHeader.replace('Bearer ', '')
  let user
  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return jsonError(res, 401, 'Session expired — please sign in again.')
    user = data.user
  } catch (err) {
    return jsonError(res, 500, 'Authentication error.')
  }

  // ── Body ─────────────────────────────────────────────────────────────────────
  const { return_url, refresh_url } = req.body ?? {}
  if (!return_url || !refresh_url) {
    return jsonError(res, 400, 'return_url and refresh_url are required.')
  }

  try {
    // ── Get or create Stripe Connect account ──────────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id, full_name')
      .eq('id', user.id)
      .single()

    let accountId = profile?.stripe_account_id

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: { supabase_id: user.id },
      })
      accountId = account.id

      await supabase
        .from('profiles')
        .update({ stripe_account_id: accountId, connect_onboarding_status: 'pending' })
        .eq('id', user.id)
    }

    // ── Check if already onboarded ────────────────────────────────────────────
    const account = await stripe.accounts.retrieve(accountId)
    if (account.details_submitted) {
      await supabase
        .from('profiles')
        .update({ connect_onboarding_status: 'complete' })
        .eq('id', user.id)
      return res.status(200).json({ alreadyComplete: true })
    }

    // ── Generate onboarding link ──────────────────────────────────────────────
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url,
      return_url,
      type: 'account_onboarding',
    })

    console.log('[create-connect-account] Account link created:', { userId: user.id, accountId })
    return res.status(200).json({ url: accountLink.url })

  } catch (err) {
    console.error('[create-connect-account] Stripe error:', err.message)
    return jsonError(res, err.statusCode ?? 500, err.message || 'Failed to set up bank account — please try again.')
  }
}
