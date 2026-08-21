/**
 * GET /api/saved-search-alerts
 *
 * Daily cron: checks saved_searches against listings published in the last 24 hours
 * and emails matching tenants via SendGrid.
 *
 * Vercel cron.json:  { "path": "/api/saved-search-alerts", "schedule": "0 9 * * *" }
 * Required env vars: SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL,
 *                    SENDGRID_API_KEY, CRON_SECRET
 */

import { createClient } from '@supabase/supabase-js'
import sgMail from '@sendgrid/mail'

export default async function handler(req, res) {
  // Protect with CRON_SECRET
  const auth = req.headers.authorization || ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SENDGRID_API_KEY) {
    return res.status(500).json({ error: 'Missing env vars' })
  }

  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)

  // Fetch all saved searches with email alerts on
  const { data: searches, error: searchErr } = await supabase
    .from('saved_searches')
    .select('*, profiles(email, first_name)')
    .eq('email_alerts', true)

  if (searchErr) {
    console.error('[saved-search-alerts] fetch searches error:', searchErr.message)
    return res.status(500).json({ error: searchErr.message })
  }

  if (!searches?.length) {
    return res.status(200).json({ message: 'No saved searches with alerts.' })
  }

  // Fetch listings published in the last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: newListings, error: listErr } = await supabase
    .from('properties')
    .select('id, neighborhood, zip_code, bedrooms, bathrooms, rent_amount, photos, property_type, pets_allowed, accessibility')
    .eq('status', 'active')
    .gte('created_at', since)

  if (listErr) {
    console.error('[saved-search-alerts] fetch listings error:', listErr.message)
    return res.status(500).json({ error: listErr.message })
  }

  if (!newListings?.length) {
    return res.status(200).json({ message: 'No new listings in last 24h.' })
  }

  let sent = 0

  for (const search of searches) {
    const f = search.filters || {}
    const email = search.profiles?.email
    const firstName = search.profiles?.first_name || 'there'
    if (!email) continue

    // Filter new listings against this search's saved filters
    const matches = newListings.filter(l => {
      if (f.search && !l.neighborhood?.toLowerCase().includes(f.search.toLowerCase()) &&
          !l.zip_code?.includes(f.search)) return false
      if (f.beds) {
        const n = parseInt(f.beds)
        if (n >= 4 && l.bedrooms < 4) return false
        if (n < 4 && l.bedrooms !== n) return false
      }
      if (f.propertyType && l.property_type !== f.propertyType) return false
      if (f.voucherAmount && l.rent_amount > parseFloat(f.voucherAmount)) return false
      if (f.maxRent && l.rent_amount > parseFloat(f.maxRent)) return false
      if (f.minRent && l.rent_amount < parseFloat(f.minRent)) return false
      if (f.petsAllowed && !l.pets_allowed) return false
      if (f.accessibleOnly && (!l.accessibility || l.accessibility.length === 0)) return false
      return true
    })

    if (!matches.length) continue

    const listingLines = matches.slice(0, 5).map(l => {
      const beds = l.bedrooms === 0 ? 'Studio' : `${l.bedrooms} BR`
      return `• ${beds} in ${l.neighborhood || l.zip_code} — $${l.rent_amount?.toLocaleString()}/mo
  View: https://settleed.com/listing/${l.id}`
    }).join('\n\n')

    const msg = {
      to: email,
      from: { name: 'Settleed', email: 'noreply@settleed.com' },
      subject: `${matches.length} new listing${matches.length > 1 ? 's' : ''} match your saved search "${search.name}"`,
      text: `Hi ${firstName},

${matches.length} new listing${matches.length > 1 ? 's match' : ' matches'} your saved search "${search.name}":

${listingLines}

View all results: https://settleed.com/tenant/search

To manage your saved searches, visit your profile at https://settleed.com/tenant/profile

— The Settleed Team`,
    }

    try {
      await sgMail.send(msg)
      sent++
    } catch (err) {
      console.error(`[saved-search-alerts] email failed for ${email}:`, err.message)
    }
  }

  console.log(`[saved-search-alerts] Sent ${sent} alert emails`)
  return res.status(200).json({ sent, searchesChecked: searches.length, newListings: newListings.length })
}
