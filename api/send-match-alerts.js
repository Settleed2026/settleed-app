/**
 * POST /api/send-match-alerts
 *
 * Called internally when a listing is published (status → active).
 * Finds all tenants whose voucher size matches the listing and sends
 * an email alert via SendGrid.
 *
 * Required env vars:
 *   SENDGRID_API_KEY
 *   FROM_EMAIL          (default: info@settleed.com)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VITE_SUPABASE_URL
 */

import { createClient } from '@supabase/supabase-js'

const SPECIAL_LABELS = {
  no_credit_check:     'No credit check',
  no_app_fee:          'No application fee',
  pet_friendly:        'Pet friendly',
  move_in_ready:       'Move-in ready',
  no_security_deposit: 'No security deposit',
  section8_welcome:    'Section 8 welcome',
  utilities_included:  'Utilities included',
  furnished:           'Furnished',
}

function bedroomLabel(n) {
  if (n === 0) return 'Studio'
  return `${n} bedroom${n !== 1 ? 's' : ''}`
}

function buildEmail(listing, tenant) {
  const address = listing.street_address
    ? `${listing.street_address}${listing.unit_number ? ` #${listing.unit_number}` : ''}, ${listing.city || 'Atlanta'}, GA`
    : `${listing.city || 'Atlanta'}, GA`

  const specials = (listing.specials || [])
    .map(s => SPECIAL_LABELS[s] || s)
    .filter(Boolean)

  const specialsHtml = specials.length
    ? `<div style="margin:16px 0;">${specials.map(s =>
        `<span style="display:inline-block;background:#EBF9F4;color:#1D9E75;border-radius:4px;padding:4px 10px;font-size:13px;font-weight:600;margin:3px 4px 3px 0;">${s}</span>`
      ).join('')}</div>`
    : ''

  const firstName = tenant.full_name?.split(' ')[0] || 'there'
  const appUrl = `https://settleed.com/tenant/listing/${listing.id}`

  return {
    subject: `New match: ${bedroomLabel(listing.bedrooms)} in ${listing.city || 'Atlanta'} — Settleed`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F6F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:#1B3A6B;padding:28px 32px;">
          <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Settleed</div>
          <div style="color:#93B4D9;font-size:13px;margin-top:4px;">Section 8 Housing Marketplace</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0F172A;">Hi ${firstName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
            A new listing just went live that matches your voucher size. Don't wait — Section 8 listings go fast.
          </p>

          <!-- Listing card -->
          <div style="border:1.5px solid #E2E8F0;border-radius:10px;overflow:hidden;margin-bottom:24px;">
            <div style="background:#F8FAFC;padding:20px 24px;border-bottom:1px solid #E2E8F0;">
              <div style="font-size:17px;font-weight:700;color:#0F172A;">${bedroomLabel(listing.bedrooms)}</div>
              <div style="font-size:14px;color:#64748B;margin-top:4px;">${address}</div>
            </div>
            <div style="padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:50%;padding-bottom:12px;">
                    <div style="font-size:12px;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Monthly Rent</div>
                    <div style="font-size:20px;font-weight:700;color:#1D9E75;">$${listing.rent_amount?.toLocaleString() || '—'}</div>
                  </td>
                  <td style="width:50%;padding-bottom:12px;">
                    <div style="font-size:12px;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Bedrooms</div>
                    <div style="font-size:20px;font-weight:700;color:#0F172A;">${listing.bedrooms ?? '—'}</div>
                  </td>
                </tr>
                ${listing.available_date ? `
                <tr>
                  <td colspan="2" style="padding-bottom:4px;">
                    <div style="font-size:12px;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Available</div>
                    <div style="font-size:14px;color:#0F172A;font-weight:600;">${new Date(listing.available_date).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>
                  </td>
                </tr>` : ''}
              </table>
              ${specialsHtml}
            </div>
          </div>

          <a href="${appUrl}" style="display:block;background:#1B3A6B;color:#fff;text-align:center;padding:15px 24px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;">
            View Listing &amp; Apply →
          </a>

          <p style="margin:24px 0 0;font-size:13px;color:#94A3B8;text-align:center;line-height:1.6;">
            You're receiving this because your voucher size matches this listing.<br>
            <a href="https://settleed.com/tenant/profile/setup" style="color:#1B3A6B;">Update your preferences</a> to control which alerts you receive.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F8FAFC;padding:20px 32px;border-top:1px solid #E2E8F0;">
          <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center;">
            © ${new Date().getFullYear()} Settleed · Atlanta, GA · <a href="https://settleed.com" style="color:#1B3A6B;text-decoration:none;">settleed.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    text: `Hi ${firstName},\n\nA new ${bedroomLabel(listing.bedrooms)} listing in ${listing.city || 'Atlanta'} matches your voucher!\n\nRent: $${listing.rent_amount?.toLocaleString() || '—'}/mo\nAddress: ${address}\n${specials.length ? `\nSpecials: ${specials.join(', ')}\n` : ''}\nView & Apply: ${appUrl}\n\n— Settleed Team`,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  if (!process.env.SENDGRID_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY || !supabaseUrl) {
    console.warn('[send-match-alerts] Missing env vars — skipping alerts')
    return res.status(200).json({ sent: 0, skipped: true, reason: 'env_not_configured' })
  }

  const { listing_id } = req.body ?? {}
  if (!listing_id) return res.status(400).json({ error: 'listing_id is required' })

  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Fetch the listing
  const { data: listing, error: listingErr } = await supabase
    .from('properties')
    .select('*')
    .eq('id', listing_id)
    .single()

  if (listingErr || !listing) {
    return res.status(404).json({ error: 'Listing not found' })
  }

  // Find matching tenants:
  // - role is 'tenant'
  // - voucher_bedroom_size is in listing's voucher_sizes_accepted array
  // - notification preferences allow match emails (or not set)
  const { data: tenants, error: tenantErr } = await supabase
    .from('profiles')
    .select('id, full_name, email:id, voucher_bedroom_size, notification_preferences')
    .eq('role', 'tenant')
    .not('voucher_bedroom_size', 'is', null)

  if (tenantErr) {
    console.error('[send-match-alerts] Tenant fetch error:', tenantErr.message)
    return res.status(500).json({ error: 'Failed to fetch tenants' })
  }

  // Get tenant emails from auth.users via service role
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = {}
  for (const u of authUsers?.users ?? []) {
    emailMap[u.id] = u.email
  }

  const voucherSizesAccepted = listing.voucher_sizes_accepted || []
  const matchingTenants = (tenants || []).filter(t => {
    if (!t.voucher_bedroom_size) return false
    if (voucherSizesAccepted.length > 0 && !voucherSizesAccepted.includes(t.voucher_bedroom_size)) return false
    // Check notification prefs — default allow
    const prefs = t.notification_preferences || {}
    if (prefs.new_matches === false) return false
    return true
  })

  if (matchingTenants.length === 0) {
    return res.status(200).json({ sent: 0, matched: 0 })
  }

  // Send emails via SendGrid
  const fromEmail = process.env.FROM_EMAIL || 'info@settleed.com'
  let sent = 0
  let failed = 0

  for (const tenant of matchingTenants) {
    const tenantEmail = emailMap[tenant.id]
    if (!tenantEmail) continue

    const { subject, html, text } = buildEmail(listing, tenant)

    try {
      const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: { email: fromEmail, name: 'Settleed' },
          to: [{ email: tenantEmail }],
          subject,
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html },
          ],
        }),
      })

      if (sgRes.ok) {
        sent++
      } else {
        const err = await sgRes.text()
        console.error('[send-match-alerts] SendGrid error for', tenantEmail, err)
        failed++
      }
    } catch (err) {
      console.error('[send-match-alerts] Fetch error:', err.message)
      failed++
    }
  }

  console.log(`[send-match-alerts] listing=${listing_id} matched=${matchingTenants.length} sent=${sent} failed=${failed}`)
  return res.status(200).json({ sent, failed, matched: matchingTenants.length })
}
