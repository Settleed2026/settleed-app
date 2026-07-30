/**
 * POST /api/connect
 *
 * action: 'create_account' — creates/retrieves Stripe Connect Express account,
 *                             returns onboarding link or { alreadyComplete: true }
 * action: 'login_link'     — returns Express Dashboard login link for existing account
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function jsonError(res, status, message) {
  return res.status(status).json({ error: message })
}

async function initClients() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY || !supabaseUrl) {
    throw new Error('Server misconfiguration.')
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
  return { stripe, supabase }
}

async function getUser(supabase, req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw Object.assign(new Error('Please sign in.'), { status: 401 })
  const { data, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (error || !data?.user) throw Object.assign(new Error('Session expired.'), { status: 401 })
  return data.user
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed')

  let stripe, supabase
  try {
    ;({ stripe, supabase } = await initClients())
  } catch (err) {
    return jsonError(res, 500, err.message)
  }

  let user
  try {
    user = await getUser(supabase, req)
  } catch (err) {
    return jsonError(res, err.status || 401, err.message)
  }

  const { action, return_url, refresh_url } = req.body ?? {}

  // ── CREATE ACCOUNT ──────────────────────────────────────────────────────────
  if (action === 'create_account') {
    if (!return_url || !refresh_url) {
      return jsonError(res, 400, 'return_url and refresh_url are required.')
    }
    try {
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
          capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
          business_type: 'individual',
          metadata: { supabase_id: user.id },
        })
        accountId = account.id
        await supabase.from('profiles').update({
          stripe_account_id: accountId,
          connect_onboarding_status: 'pending',
        }).eq('id', user.id)
      }

      const account = await stripe.accounts.retrieve(accountId)
      if (account.details_submitted) {
        await supabase.from('profiles').update({ connect_onboarding_status: 'complete' }).eq('id', user.id)
        return res.status(200).json({ alreadyComplete: true })
      }

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url,
        return_url,
        type: 'account_onboarding',
      })
      return res.status(200).json({ url: accountLink.url })
    } catch (err) {
      console.error('[connect/create_account]', err.message)
      return jsonError(res, err.statusCode ?? 500, err.message || 'Failed to set up bank account.')
    }
  }

  // ── LOGIN LINK ──────────────────────────────────────────────────────────────
  if (action === 'login_link') {
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
      console.error('[connect/login_link]', err.message)
      return jsonError(res, err.statusCode ?? 500, err.message || 'Failed to generate login link.')
    }
  }

  return jsonError(res, 400, 'Invalid action. Use "create_account" or "login_link".')
}
