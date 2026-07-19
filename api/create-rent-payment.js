/**
 * POST /api/create-rent-payment
 *
 * Creates a Stripe PaymentIntent for a tenant's monthly rent portion.
 * After payment succeeds (via webhook), Settleed transfers funds to the
 * landlord's Stripe Connect account minus a 2% platform fee.
 *
 * Body: { property_id, amount_cents, due_date }
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VITE_SUPABASE_URL
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function jsonError(res, status, message) {
  return res.status(status).json({ error: message })
}

const PLATFORM_FEE_PCT = 0.02 // 2%

export default async function handler(req, res) {
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed')

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY || !supabaseUrl) {
    return jsonError(res, 500, 'Server misconfiguration.')
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return jsonError(res, 401, 'Please sign in.')
  const token = authHeader.replace('Bearer ', '')

  const { data: authData, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !authData?.user) return jsonError(res, 401, 'Session expired.')
  const user = authData.user

  const { property_id, amount_cents, due_date } = req.body ?? {}
  if (!property_id || !amount_cents || !due_date) {
    return jsonError(res, 400, 'property_id, amount_cents, and due_date are required.')
  }
  if (amount_cents < 100) return jsonError(res, 400, 'Minimum payment is $1.00.')

  try {
    // Get property + landlord's stripe_account_id
    const { data: property } = await supabase
      .from('properties')
      .select('landlord_id, street_address, unit_number, profiles:landlord_id(stripe_account_id)')
      .eq('id', property_id)
      .single()

    if (!property) return jsonError(res, 404, 'Property not found.')

    const landlordStripeId = property.profiles?.stripe_account_id
    if (!landlordStripeId) {
      return jsonError(res, 400, 'Landlord has not connected a payout account yet.')
    }

    const platformFeeCents = Math.round(amount_cents * PLATFORM_FEE_PCT)
    const landlordPayoutCents = amount_cents - platformFeeCents

    const address = property.unit_number
      ? `${property.street_address} #${property.unit_number}`
      : property.street_address

    // Create PaymentIntent on the platform account
    // Transfer to landlord happens in the webhook after payment succeeds
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      description: `Rent payment — ${address} — ${due_date}`,
      metadata: {
        tenant_id: user.id,
        landlord_id: property.landlord_id,
        property_id,
        due_date,
        landlord_stripe_id: landlordStripeId,
        landlord_payout_cents: landlordPayoutCents,
        platform_fee_cents: platformFeeCents,
      },
    })

    // Create a rent_payments record in pending state
    await supabase.from('rent_payments').insert({
      property_id,
      tenant_id: user.id,
      landlord_id: property.landlord_id,
      amount_cents,
      due_date,
      status: 'pending',
      stripe_payment_intent_id: paymentIntent.id,
      platform_fee_cents: platformFeeCents,
      landlord_payout_cents: landlordPayoutCents,
    })

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      amount_cents,
      platform_fee_cents: platformFeeCents,
    })
  } catch (err) {
    console.error('[create-rent-payment]', err.message)
    return jsonError(res, err.statusCode ?? 500, err.message || 'Failed to create payment.')
  }
}
