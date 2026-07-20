/**
 * POST /api/stripe-webhook
 *
 * Handles Stripe webhook events for Settleed.
 *
 * Events handled:
 *   payment_intent.succeeded       — marks rent_payment paid, transfers to landlord
 *   payment_intent.payment_failed  — marks rent_payment failed
 *   account.updated                — syncs Stripe Connect onboarding status
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET   ← from Stripe Dashboard > Webhooks after creating endpoint
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VITE_SUPABASE_URL
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Vercel must NOT parse the body — Stripe needs raw bytes for signature verification
export const config = { api: { bodyParser: false } }

// Read raw body from the request stream (no external deps needed)
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  if (
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.STRIPE_WEBHOOK_SECRET ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !supabaseUrl
  ) {
    console.error('[stripe-webhook] Missing env vars')
    return res.status(500).json({ error: 'Server misconfiguration.' })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Verify Stripe signature
  let event
  try {
    const rawBody = await getRawBody(req)
    const sig = req.headers['stripe-signature']
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook signature failed: ${err.message}` })
  }

  // ── payment_intent.succeeded ────────────────────────────────────────────
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object
    const {
      tenant_id,
      landlord_id,
      property_id,
      landlord_stripe_id,
      landlord_payout_cents,
      platform_fee_cents,
    } = pi.metadata ?? {}

    // Mark rent_payment as paid
    const { error: updateErr } = await supabase
      .from('rent_payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('stripe_payment_intent_id', pi.id)

    if (updateErr) {
      console.error('[stripe-webhook] Failed to mark payment paid:', updateErr.message)
    }

    // Transfer net amount to landlord's Connect account
    if (landlord_stripe_id && landlord_payout_cents) {
      try {
        await stripe.transfers.create({
          amount: parseInt(landlord_payout_cents, 10),
          currency: 'usd',
          destination: landlord_stripe_id,
          source_transaction: pi.latest_charge,
          description: `Rent payout — property ${property_id}`,
          metadata: { tenant_id, landlord_id, property_id, payment_intent_id: pi.id, platform_fee_cents },
        })
        console.log(`[stripe-webhook] Transferred $${(landlord_payout_cents / 100).toFixed(2)} to ${landlord_stripe_id}`)
      } catch (transferErr) {
        // Log but don't fail — payment already confirmed on tenant side
        console.error('[stripe-webhook] Transfer failed:', transferErr.message)
      }
    } else {
      console.warn('[stripe-webhook] No landlord_stripe_id in metadata — skipping transfer for PI:', pi.id)
    }
  }

  // ── payment_intent.payment_failed ───────────────────────────────────────
  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object
    await supabase
      .from('rent_payments')
      .update({ status: 'failed' })
      .eq('stripe_payment_intent_id', pi.id)
    console.log('[stripe-webhook] Payment failed for PI:', pi.id)
  }

  // ── account.updated (Stripe Connect onboarding) ─────────────────────────
  if (event.type === 'account.updated') {
    const account = event.data.object
    const isReady = account.details_submitted && account.charges_enabled && account.payouts_enabled

    if (isReady) {
      await supabase
        .from('profiles')
        .update({ connect_onboarding_status: 'complete' })
        .eq('stripe_account_id', account.id)
      console.log('[stripe-webhook] Connect account active:', account.id)
    }
  }

  return res.status(200).json({ received: true })
}
