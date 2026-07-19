/**
 * POST /api/create-connect-login
 *
 * Generates a Stripe Express Dashboard login link so the landlord can
 * manage their payout account (bank details, payout history, tax forms).
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
      .select('stripe_account_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_account_id) {
      return jsonError(res, 400, 'No payout account connected yet.')
    }

    const loginLink = await stripe.accounts.createLoginLink(profile.stripe_account_id)
    return res.status(200).json({ url: loginLink.url })
  } catch (err) {
    console.error('[create-connect-login]', err.message)
    return jsonError(res, err.statusCode ?? 500, err.message || 'Failed to generate login link.')
  }
}
