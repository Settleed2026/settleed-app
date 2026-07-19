import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify user JWT
    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

    const { role } = req.body

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name ?? undefined,
        metadata: { supabase_id: user.id, role: role ?? 'landlord' },
      })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const amount = role === 'tenant' ? 499 : 4900
    const productName = role === 'tenant' ? 'Settleed Voucher Holder' : 'Settleed Landlord'

    // Create subscription with 7-day trial — payment_behavior:'default_incomplete'
    // gives us a pending_setup_intent so we can collect the card upfront
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: productName },
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

    return res.status(200).json({ subscriptionId: subscription.id, clientSecret })
  } catch (err) {
    console.error('create-subscription error:', err)
    return res.status(500).json({ error: err.message })
  }
}
