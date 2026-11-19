/**
 * POST /api/create-rent-payment
 *
 * Handles two payment types via req.body.payment_type:
 *
 *   'rent' (default) — monthly rent from tenant to landlord
 *     Body: { property_id, amount_cents, due_date }
 *
 *   'application' — application fee charged to tenant
 *     Body: { payment_type: 'application', property_id }
 *     Charge = listing.application_fee + $5 Settleed service fee
 *     Landlord receives application_fee; Settleed keeps $5.
 *
 * After payment succeeds the stripe-webhook transfers funds to the
 * landlord's Stripe Connect account.
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

const SERVICE_FEE_CENTS = 500 // $5 flat Settleed service fee on applications

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

  const { payment_type = 'rent', property_id } = req.body ?? {}

  // ── APPLICATION FEE PAYMENT ──────────────────────────────────────────────
  if (payment_type === 'application') {
    if (!property_id) return jsonError(res, 400, 'property_id is required.')

    try {
      const { data: property } = await supabase
        .from('properties')
        .select('landlord_id, street_address, unit_number, application_fee, profiles:landlord_id(stripe_account_id)')
        .eq('id', property_id)
        .single()

      if (!property) return jsonError(res, 404, 'Property not found.')
      if (!property.application_fee || property.application_fee <= 0) {
        return jsonError(res, 400, 'This listing has no application fee.')
      }

      const landlordStripeId = property.profiles?.stripe_account_id
      if (!landlordStripeId) {
        return jsonError(res, 400, 'Landlord has not connected a payout account yet.')
      }

      const appFeeCents = Math.round(property.application_fee * 100)
      const totalChargeCents = appFeeCents + SERVICE_FEE_CENTS // tenant pays app fee + $5
      const landlordPayoutCents = appFeeCents                   // landlord gets app fee only

      const address = property.unit_number
        ? `${property.street_address} #${property.unit_number}`
        : property.street_address

      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalChargeCents,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        description: `Application fee — ${address}`,
        metadata: {
          payment_type: 'application_payment',
          tenant_id: user.id,
          landlord_id: property.landlord_id,
          property_id,
          landlord_stripe_id: landlordStripeId,
          landlord_payout_cents: landlordPayoutCents,
          service_fee_cents: SERVICE_FEE_CENTS,
        },
      })

      return res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        amount_cents: totalChargeCents,
        application_fee_cents: appFeeCents,
        service_fee_cents: SERVICE_FEE_CENTS,
        landlord_payout_cents: landlordPayoutCents,
      })
    } catch (err) {
      console.error('[create-rent-payment/application]', err.message)
      return jsonError(res, err.statusCode ?? 500, err.message || 'Failed to create application payment.')
    }
  }

  // ── RENT PAYMENT (default) ───────────────────────────────────────────────
  const { amount_cents, due_date } = req.body ?? {}
  if (!property_id || !amount_cents || !due_date) {
    return jsonError(res, 400, 'property_id, amount_cents, and due_date are required.')
  }
  if (amount_cents < 100) return jsonError(res, 400, 'Minimum payment is $1.00.')

  try {
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

    const landlordPayoutCents = amount_cents // 0% fee — Settleed takes nothing on rent

    const address = property.unit_number
      ? `${property.street_address} #${property.unit_number}`
      : property.street_address

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      description: `Rent payment — ${address} — ${due_date}`,
      metadata: {
        payment_type: 'rent_payment',
        tenant_id: user.id,
        landlord_id: property.landlord_id,
        property_id,
        due_date,
        landlord_stripe_id: landlordStripeId,
        landlord_payout_cents: landlordPayoutCents,
        platform_fee_cents: 0,
      },
    })

    await supabase.from('rent_payments').insert({
      property_id,
      tenant_id: user.id,
      landlord_id: property.landlord_id,
      amount_cents,
      due_date,
      status: 'pending',
      stripe_payment_intent_id: paymentIntent.id,
      platform_fee_cents: 0,
      landlord_payout_cents: landlordPayoutCents,
    })

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      amount_cents,
      platform_fee_cents: 0,
    })
  } catch (err) {
    console.error('[create-rent-payment/rent]', err.message)
    return jsonError(res, err.statusCode ?? 500, err.message || 'Failed to create payment.')
  }
}
