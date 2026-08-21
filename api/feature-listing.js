// api/feature-listing.js
// Creates a Stripe Checkout session to feature a listing for 30 days ($19.99)
// POST { listing_id }

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { listing_id } = req.body
  if (!listing_id) return res.status(400).json({ error: 'listing_id required' })

  // Verify this listing belongs to the landlord
  const { data: listing, error: listingError } = await supabase
    .from('properties')
    .select('id, street_address, unit_number, neighborhood, landlord_id')
    .eq('id', listing_id)
    .eq('landlord_id', user.id)
    .single()

  if (listingError || !listing) {
    return res.status(404).json({ error: 'Listing not found or not yours' })
  }

  const address = `${listing.street_address}${listing.unit_number ? ` #${listing.unit_number}` : ''}`
  const label = `${address}, ${listing.neighborhood}`

  const origin = req.headers.origin || 'https://settleed.com'

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Featured Listing — 30 Days',
          description: `Your listing at ${label} will appear at the top of search results for 30 days.`,
        },
        unit_amount: 1999, // $19.99
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${origin}/landlord?featured=1`,
    cancel_url: `${origin}/landlord`,
    metadata: {
      type: 'feature_listing',
      listing_id,
      landlord_id: user.id,
    },
  })

  res.json({ url: session.url })
}
