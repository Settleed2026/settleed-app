/**
 * POST /api/cancel-subscription
 *
 * Cancels the landlord's Stripe subscription at the end of the current
 * billing period (they keep access until then).
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed')

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY || !supabaseUrl) {
    return jsonError(res, 500, 'Server misconfiguration.')
  }

  let stripe, supabase
  try {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
    supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
  } catch (err) {
    return jsonError(res, 500, 'Server initialization error.')
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return jsonError(res, 401, 'Please sign in.')
  const token = authHeader.replace('Bearer ', '')

  let user
  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return jsonError(res, 401, 'Session expired.')
    user = data.user
  } catch {
    return jsonError(res, 500, 'Authentication error.')
  }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, subscription_status')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_subscription_id) {
      return jsonError(res, 400, 'No active subscription found.')
    }

    const alreadyCanceled = ['canceled', 'incomplete_expired'].includes(profile.subscription_status)
    if (alreadyCanceled) {
      return jsonError(res, 400, 'Subscription is already canceled.')
    }

    // Cancel at period end — landlord keeps access until billing cycle ends
    const subscription = await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    // Update local status so the UI reflects the pending cancellation
    await supabase
      .from('profiles')
      .update({ subscription_status: 'canceling' })
      .eq('id', user.id)

    const cancelDate = new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    })

    console.log('[cancel-subscription] Scheduled cancellation:', { userId: user.id, cancelDate })
    return res.status(200).json({ success: true, cancelDate })
  } catch (err) {
    console.error('[cancel-subscription]', err.message)
    return jsonError(res, err.statusCode ?? 500, err.message || 'Failed to cancel subscription.')
  }
}
