// api/alerts.js
// Combined alerts/notifications handler — routes by ?action=admin|match|recert|search
// Replaces: api/admin-notify.js, api/send-match-alerts.js,
//           api/recertification-alerts.js, api/saved-search-alerts.js

import { createClient } from '@supabase/supabase-js'

const SG_URL = 'https://api.sendgrid.com/v3/mail/send'

async function sgSend(payload) {
  const res = await fetch(SG_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) { const b = await res.text(); throw new Error(`SendGrid ${res.status}: ${b}`) }
}

export default async function handler(req, res) {
  const action = req.query.action

  // ── Admin Notify ──────────────────────────────────────────────────────────
  if (action === 'admin') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    if (!process.env.SENDGRID_API_KEY) return res.status(500).json({ error: 'No email config' })
    const ADMIN_EMAIL = 'odtrius@gmail.com'
    const { event, payload = {} } = req.body || {}
    let subject, text
    if (event === 'landlord_signup') {
      subject = `🏠 New landlord signed up — ${payload.email || 'unknown'}`
      text = `A new landlord just created a Settleed account.\n\nName: ${payload.name || 'N/A'}\nEmail: ${payload.email || 'N/A'}\nTime: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET\n\nReview at: https://settleed.com/admin/queue`
    } else if (event === 'listing_review') {
      subject = `📋 New listing submitted for review — ${payload.address || 'unknown'}`
      text = `A landlord just submitted a listing for review.\n\nAddress: ${payload.address || 'N/A'}\nNeighborhood: ${payload.neighborhood || 'N/A'}\nLandlord ID: ${payload.landlord_id || 'N/A'}\nTime: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET\n\nReview at: https://settleed.com/admin/queue`
    } else if (event === 'agency_inquiry') {
      subject = `🏛 New agency inquiry — ${payload.agency || 'unknown'}`
      text = `A housing authority just submitted a partnership inquiry.\n\nContact: ${payload.contact_name || 'N/A'}\nTitle: ${payload.contact_title || 'N/A'}\nAgency: ${payload.agency || 'N/A'}\nEmail: ${payload.email || 'N/A'}\nPhone: ${payload.phone || 'N/A'}\nMessage: ${payload.message || '(none)'}\nTime: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`
    } else {
      return res.status(400).json({ error: 'Unknown event type' })
    }
    try {
      await sgSend({ personalizations: [{ to: [{ email: ADMIN_EMAIL }] }], from: { name: 'Settleed Alerts', email: 'noreply@settleed.com' }, subject, content: [{ type: 'text/plain', value: text }] })
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('[alerts/admin]', err.message)
      return res.status(500).json({ error: err.message })
    }
  }

  // ── Send Match Alerts ─────────────────────────────────────────────────────
  if (action === 'match') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    if (!process.env.SENDGRID_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY || !supabaseUrl) {
      return res.status(200).json({ sent: 0, skipped: true, reason: 'env_not_configured' })
    }
    const { listing_id } = req.body ?? {}
    if (!listing_id) return res.status(400).json({ error: 'listing_id is required' })
    const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { data: listing, error: listingErr } = await supabase.from('properties').select('*').eq('id', listing_id).single()
    if (listingErr || !listing) return res.status(404).json({ error: 'Listing not found' })
    const { data: tenants } = await supabase.from('profiles').select('id, full_name, voucher_bedroom_size, notification_preferences').eq('role', 'tenant').not('voucher_bedroom_size', 'is', null)
    const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const emailMap = {}
    for (const u of authUsers?.users ?? []) emailMap[u.id] = u.email
    const voucherSizesAccepted = listing.voucher_sizes_accepted || []
    const matching = (tenants || []).filter(t => {
      if (!t.voucher_bedroom_size) return false
      if (voucherSizesAccepted.length > 0 && !voucherSizesAccepted.includes(t.voucher_bedroom_size)) return false
      if ((t.notification_preferences || {}).new_matches === false) return false
      return true
    })
    let sent = 0
    for (const tenant of matching) {
      const email = emailMap[tenant.id]
      if (!email) continue
      const beds = listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} BR`
      const firstName = tenant.full_name?.split(' ')[0] || 'there'
      try {
        await sgSend({ from: { email: 'info@settleed.com', name: 'Settleed' }, to: [{ email }], subject: `New match: ${beds} in ${listing.city || 'Atlanta'} — Settleed`, content: [{ type: 'text/plain', value: `Hi ${firstName},\n\nA new ${beds} listing matches your voucher!\n\nRent: $${listing.rent_amount?.toLocaleString()}/mo\nView & Apply: https://settleed.com/tenant/listing/${listing.id}\n\n— Settleed Team` }] })
        sent++
      } catch (err) { console.error('[alerts/match] email error:', err.message) }
    }
    return res.status(200).json({ sent, matched: matching.length })
  }

  // ── Recertification Alerts (cron) ─────────────────────────────────────────
  if (action === 'recert') {
    const auth = req.headers.authorization || ''
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized' })
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SENDGRID_API_KEY) {
      return res.status(500).json({ error: 'Missing env vars' })
    }
    const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const ALERT_DAYS = [90, 60, 30, 14, 7]
    const today = new Date(); today.setHours(0, 0, 0, 0)
    let totalSent = 0; const errors = []
    for (const days of ALERT_DAYS) {
      const targetDate = new Date(today); targetDate.setDate(targetDate.getDate() + days)
      const targetStr = targetDate.toISOString().split('T')[0]
      const { data: tenants, error: fetchErr } = await supabase.from('profiles').select('id, full_name, email, recertification_date, ha_name').eq('role', 'tenant').eq('recertification_date', targetStr).eq('recert_alert_opt_in', true)
      if (fetchErr) { errors.push({ days, error: fetchErr.message }); continue }
      for (const tenant of tenants || []) {
        const { data: existing } = await supabase.from('recert_alerts').select('id').eq('tenant_id', tenant.id).eq('days_before', days).gte('sent_at', today.toISOString()).maybeSingle()
        if (existing) continue
        try {
          await sgSend({ personalizations: [{ to: [{ email: tenant.email }] }], from: { name: 'Settleed', email: 'info@settleed.com' }, subject: `Reminder: Your Section 8 recertification is in ${days} days`, content: [{ type: 'text/plain', value: `Hi ${tenant.full_name?.split(' ')[0] || 'there'},\n\nYour Section 8 recertification is in ${days} days. Start gathering your documents now.\n\nContact your housing authority at least 2 weeks before your recertification date.\n\n— Settleed Team` }] })
          await supabase.from('recert_alerts').insert({ tenant_id: tenant.id, days_before: days, email_type: 'recertification_reminder' })
          totalSent++
        } catch (err) { errors.push({ tenant: tenant.id, days, error: err.message }) }
      }
    }
    return res.status(200).json({ success: true, sent: totalSent, errors: errors.length ? errors : undefined })
  }

  // ── Saved Search Alerts (cron) ────────────────────────────────────────────
  if (action === 'search') {
    const auth = req.headers.authorization || ''
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized' })
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SENDGRID_API_KEY) {
      return res.status(500).json({ error: 'Missing env vars' })
    }
    const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { data: searches, error: searchErr } = await supabase.from('saved_searches').select('*, profiles(email, first_name)').eq('email_alerts', true)
    if (searchErr) return res.status(500).json({ error: searchErr.message })
    if (!searches?.length) return res.status(200).json({ message: 'No saved searches with alerts.' })
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: newListings, error: listErr } = await supabase.from('properties').select('id, neighborhood, zip_code, bedrooms, rent_amount, property_type, pets_allowed').eq('status', 'active').gte('created_at', since)
    if (listErr) return res.status(500).json({ error: listErr.message })
    if (!newListings?.length) return res.status(200).json({ message: 'No new listings in last 24h.' })
    let sent = 0
    for (const search of searches) {
      const f = search.filters || {}
      const email = search.profiles?.email
      const firstName = search.profiles?.first_name || 'there'
      if (!email) continue
      const matches = newListings.filter(l => {
        if (f.search && !l.neighborhood?.toLowerCase().includes(f.search.toLowerCase()) && !l.zip_code?.includes(f.search)) return false
        if (f.beds) { const n = parseInt(f.beds); if (n >= 4 && l.bedrooms < 4) return false; if (n < 4 && l.bedrooms !== n) return false }
        if (f.propertyType && l.property_type !== f.propertyType) return false
        if (f.maxRent && l.rent_amount > parseFloat(f.maxRent)) return false
        if (f.petsAllowed && !l.pets_allowed) return false
        return true
      })
      if (!matches.length) continue
      const listingLines = matches.slice(0, 5).map(l => `• ${l.bedrooms === 0 ? 'Studio' : `${l.bedrooms} BR`} in ${l.neighborhood || l.zip_code} — $${l.rent_amount?.toLocaleString()}/mo\n  View: https://settleed.com/listing/${l.id}`).join('\n\n')
      try {
        await sgSend({ personalizations: [{ to: [{ email }] }], from: { name: 'Settleed', email: 'noreply@settleed.com' }, subject: `${matches.length} new listing${matches.length > 1 ? 's' : ''} match your saved search "${search.name}"`, content: [{ type: 'text/plain', value: `Hi ${firstName},\n\n${matches.length} new listing${matches.length > 1 ? 's match' : ' matches'} your saved search "${search.name}":\n\n${listingLines}\n\nView all: https://settleed.com/tenant/search\n\n— The Settleed Team` }] })
        sent++
      } catch (err) { console.error(`[alerts/search] email failed for ${email}:`, err.message) }
    }
    return res.status(200).json({ sent, searchesChecked: searches.length, newListings: newListings.length })
  }

  return res.status(400).json({ error: 'Unknown action' })
}
