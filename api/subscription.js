// api/subscription.js
// Combined billing handler — routes by ?action=create|cancel|checkout|feature
// Replaces: api/create-subscription.js, api/cancel-subscription.js,
//           api/create-service-checkout.js, api/feature-listing.js

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function jsonError(res, status, message) {
  return res.status(status).json({ error: message })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed')

  const action = req.query.action
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL

  // ── Create Subscription ───────────────────────────────────────────────────
  if (action === 'create') {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY || !supabaseUrl) {
      return jsonError(res, 500, 'Server misconfiguration — contact support.')
    }
    let stripe, supabase
    try {
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
      supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
    } catch (err) { return jsonError(res, 500, 'Server initialization error.') }

    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) return jsonError(res, 401, 'Please sign in.')
    const { data, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !data?.user) return jsonError(res, 401, 'Session expired.')
    const user = data.user
    const { role } = req.body ?? {}

    try {
      const { data: profile } = await supabase.from('profiles').select('stripe_customer_id, full_name').eq('id', user.id).single()
      let customerId = profile?.stripe_customer_id
      if (!customerId) {
        const customer = await stripe.customers.create({ email: user.email, name: profile?.full_name ?? undefined, metadata: { supabase_id: user.id, role: role ?? 'landlord' } })
        customerId = customer.id
        await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
      }
      const amount = role === 'tenant' ? 499 : 4900
      const productName = role === 'tenant' ? 'Settleed Voucher Holder' : 'Settleed Landlord'
      const product = await stripe.products.create({ name: productName })
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price_data: { currency: 'usd', product: product.id, unit_amount: amount, recurring: { interval: 'month' } } }],
        trial_period_days: 7,
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['pending_setup_intent'],
      })
      const clientSecret = subscription.pending_setup_intent?.client_secret
      if (!clientSecret) return jsonError(res, 500, 'Subscription created but payment setup failed.')
      await supabase.from('profiles').update({ subscription_status: subscription.status }).eq('id', user.id)
      await supabase.from('profiles').update({ stripe_subscription_id: subscription.id }).eq('id', user.id)
      return res.status(200).json({ subscriptionId: subscription.id, clientSecret })
    } catch (err) {
      console.error('[subscription/create]', err.message)
      return jsonError(res, err.statusCode ?? 500, err.message || 'Unable to create subscription.')
    }
  }

  // ── Cancel Subscription ───────────────────────────────────────────────────
  if (action === 'cancel') {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY || !supabaseUrl) {
      return jsonError(res, 500, 'Server misconfiguration.')
    }
    let stripe, supabase
    try {
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
      supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
    } catch (err) { return jsonError(res, 500, 'Server initialization error.') }

    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) return jsonError(res, 401, 'Please sign in.')
    const { data, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !data?.user) return jsonError(res, 401, 'Session expired.')
    const user = data.user

    try {
      const { data: profile } = await supabase.from('profiles').select('stripe_subscription_id, subscription_status').eq('id', user.id).single()
      if (!profile?.stripe_subscription_id) return jsonError(res, 400, 'No active subscription found.')
      if (['canceled', 'incomplete_expired'].includes(profile.subscription_status)) return jsonError(res, 400, 'Subscription is already canceled.')
      const subscription = await stripe.subscriptions.update(profile.stripe_subscription_id, { cancel_at_period_end: true })
      await supabase.from('profiles').update({ subscription_status: 'canceling' }).eq('id', user.id)
      const cancelDate = new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      return res.status(200).json({ success: true, cancelDate })
    } catch (err) {
      console.error('[subscription/cancel]', err.message)
      return jsonError(res, err.statusCode ?? 500, err.message || 'Failed to cancel subscription.')
    }
  }

  // ── Service Checkout (consultation booking) ───────────────────────────────
  if (action === 'checkout') {
    if (!process.env.STRIPE_SECRET_KEY) return jsonError(res, 500, 'Server misconfiguration.')
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const { serviceId, serviceTitle, price, userId, userEmail } = req.body
    if (!serviceId || !price || !userId) return jsonError(res, 400, 'Missing required fields')
    const SERVICE_NAMES = { recert_prep: 'Recertification Prep Session', hqs_prep: 'HQS Inspection Prep', rent_increase: 'Rent Increase Service', fair_housing: 'Fair Housing Training' }
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: userEmail,
        line_items: [{ price_data: { currency: 'usd', unit_amount: price * 100, product_data: { name: SERVICE_NAMES[serviceId] || serviceTitle, description: 'Settleed consultation service' } }, quantity: 1 }],
        metadata: { service_id: serviceId, user_id: userId },
        success_url: `${process.env.VITE_SITE_URL}/services/success?service=${serviceId}`,
        cancel_url: `${process.env.VITE_SITE_URL}/services`,
      })
      return res.status(200).json({ sessionId: session.id })
    } catch (err) {
      console.error('[subscription/checkout]', err.message)
      return jsonError(res, 500, err.message)
    }
  }

  // ── Feature Listing ───────────────────────────────────────────────────────
  if (action === 'feature') {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY || !supabaseUrl) {
      return jsonError(res, 500, 'Server misconfiguration.')
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const token = (req.headers.authorization || '').replace('Bearer ', '')
    if (!token) return jsonError(res, 401, 'Unauthorized')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return jsonError(res, 401, 'Unauthorized')
    const { listing_id } = req.body
    if (!listing_id) return jsonError(res, 400, 'listing_id required')
    const { data: listing, error: listingErr } = await supabase.from('properties').select('id, street_address, unit_number, neighborhood, landlord_id').eq('id', listing_id).eq('landlord_id', user.id).single()
    if (listingErr || !listing) return jsonError(res, 404, 'Listing not found or not yours')
    const address = `${listing.street_address}${listing.unit_number ? ` #${listing.unit_number}` : ''}`
    const label = `${address}, ${listing.neighborhood}`
    const origin = req.headers.origin || 'https://settleed.com'
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', product_data: { name: 'Featured Listing — 30 Days', description: `Your listing at ${label} will appear at the top of search results for 30 days.` }, unit_amount: 1999 }, quantity: 1 }],
      mode: 'payment',
      success_url: `${origin}/landlord?featured=1`,
      cancel_url: `${origin}/landlord`,
      metadata: { type: 'feature_listing', listing_id, landlord_id: user.id },
    })
    return res.json({ url: session.url })
  }

  return jsonError(res, 400, 'Unknown action')
}
