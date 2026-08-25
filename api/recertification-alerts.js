// api/recertification-alerts.js
// Vercel cron job — runs daily at 8 AM ET
// Sends recertification reminder emails to tenants (and their landlords) at 90/60/30/14/7 days before recert date

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SG_URL = 'https://api.sendgrid.com/v3/mail/send'

async function sendEmails(messages) {
  for (const msg of messages) {
    const res = await fetch(SG_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: msg.to }] }],
        from: msg.from,
        subject: msg.subject,
        content: [{ type: 'text/html', value: msg.html }],
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`SendGrid ${res.status}: ${body}`)
    }
  }
}

const ALERT_DAYS = [90, 60, 30, 14, 7]

const CHECKLIST = [
  'Current photo ID (driver\'s license or passport)',
  'Social Security cards for all household members',
  'Birth certificates for all household members',
  'Proof of income for all adults (pay stubs, award letters, bank statements)',
  'Current lease agreement',
  'Documentation of any changes in household composition',
  'Utility bills in your name',
  'Any childcare or medical expense receipts (for deductions)',
]

export default async function handler(req, res) {
  // Verify this is called by Vercel cron (or admin)
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let totalSent = 0
  const errors = []

  for (const days of ALERT_DAYS) {
    // Calculate the target recertification date (today + N days)
    const targetDate = new Date(today)
    targetDate.setDate(targetDate.getDate() + days)
    const targetStr = targetDate.toISOString().split('T')[0]

    // Find tenants with this recertification date who opted in
    const { data: tenants, error: fetchError } = await supabase
      .from('profiles')
      .select('id, full_name, email, recertification_date, ha_name')
      .eq('role', 'tenant')
      .eq('recertification_date', targetStr)
      .eq('recert_alert_opt_in', true)

    if (fetchError) {
      errors.push({ days, error: fetchError.message })
      continue
    }

    for (const tenant of tenants || []) {
      // Check if we already sent this alert today (dedup)
      const { data: existing } = await supabase
        .from('recert_alerts')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('days_before', days)
        .gte('sent_at', today.toISOString())
        .maybeSingle()

      if (existing) continue // already sent today

      // Find the tenant's active landlord (via active lease)
      const { data: lease } = await supabase
        .from('leases')
        .select('landlord_id, properties(address)')
        .eq('tenant_id', tenant.id)
        .eq('status', 'active')
        .maybeSingle()

      let landlordEmail = null
      let landlordName = null
      let propertyAddress = null

      if (lease?.landlord_id) {
        const { data: landlord } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', lease.landlord_id)
          .maybeSingle()
        landlordEmail = landlord?.email
        landlordName = landlord?.full_name
        propertyAddress = lease?.properties?.address
      }

      const recertDate = new Date(tenant.recertification_date).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })

      const urgencyColor = days <= 14 ? '#dc2626' : days <= 30 ? '#d97706' : '#1D9E75'
      const urgencyLabel = days <= 7 ? '⚠️ URGENT' : days <= 14 ? '⚠️ Action Required' : '📋 Reminder'

      const checklistHtml = CHECKLIST.map(item => `
        <li style="margin-bottom:8px; padding-left:8px;">${item}</li>
      `).join('')

      // Email to tenant
      const tenantEmail = {
        to: tenant.email,
        from: { name: 'Settleed', email: 'info@settleed.com' },
        subject: `${urgencyLabel}: Your Section 8 recertification is in ${days} days`,
        html: `
          <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
            <div style="background:#1B3A6B;padding:24px 32px;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Settleed</h1>
              <p style="color:#93c5fd;margin:4px 0 0;font-size:14px;">Section 8 Housing Marketplace</p>
            </div>
            <div style="padding:32px;">
              <div style="background:${urgencyColor}15;border-left:4px solid ${urgencyColor};padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px;">
                <p style="color:${urgencyColor};font-weight:700;font-size:18px;margin:0;">
                  Your recertification is in <strong>${days} days</strong>
                </p>
                <p style="color:#374151;margin:8px 0 0;font-size:14px;">
                  Recertification date: <strong>${recertDate}</strong>
                  ${tenant.ha_name ? ` &bull; Housing Authority: <strong>${tenant.ha_name}</strong>` : ''}
                </p>
              </div>

              <p style="color:#111827;font-size:16px;">Hi ${tenant.full_name?.split(' ')[0] || 'there'},</p>
              <p style="color:#374151;font-size:15px;line-height:1.6;">
                Your annual Section 8 recertification is coming up. Missing your recertification deadline can cause your Housing Assistance Payments to be suspended — putting your housing at risk. Start gathering your documents now.
              </p>

              <h3 style="color:#1B3A6B;font-size:16px;margin-top:24px;">Documents to prepare:</h3>
              <ul style="color:#374151;font-size:14px;line-height:1.8;padding-left:20px;">
                ${checklistHtml}
              </ul>

              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-top:24px;">
                <p style="color:#166534;font-size:14px;margin:0;">
                  <strong>💡 Tip:</strong> Contact your housing authority at least 2 weeks before your recertification date to schedule your appointment and confirm what documents they require.
                </p>
              </div>

              <div style="text-align:center;margin-top:32px;">
                <a href="${process.env.VITE_SITE_URL}/tenant/profile"
                   style="background:#1B3A6B;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
                  View My Recertification Status
                </a>
              </div>
            </div>
            <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                You're receiving this because you have a Settleed account.
                <a href="${process.env.VITE_SITE_URL}/tenant/profile" style="color:#1B3A6B;">Manage notification preferences</a>
              </p>
            </div>
          </div>
        `
      }

      // Email to landlord (if they have an active lease)
      const landlordEmailMsg = landlordEmail ? {
        to: landlordEmail,
        from: { name: 'Settleed', email: 'info@settleed.com' },
        subject: `Heads up: Your tenant's Section 8 recertification is in ${days} days`,
        html: `
          <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
            <div style="background:#1B3A6B;padding:24px 32px;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Settleed</h1>
              <p style="color:#93c5fd;margin:4px 0 0;font-size:14px;">Section 8 Housing Marketplace</p>
            </div>
            <div style="padding:32px;">
              <div style="background:${urgencyColor}15;border-left:4px solid ${urgencyColor};padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px;">
                <p style="color:${urgencyColor};font-weight:700;font-size:18px;margin:0;">
                  Tenant recertification in <strong>${days} days</strong>
                </p>
                <p style="color:#374151;margin:8px 0 0;font-size:14px;">
                  Tenant: <strong>${tenant.full_name}</strong>
                  ${propertyAddress ? ` &bull; Property: <strong>${propertyAddress}</strong>` : ''}
                </p>
              </div>

              <p style="color:#374151;font-size:15px;line-height:1.6;">
                Hi ${landlordName?.split(' ')[0] || 'there'}, your tenant <strong>${tenant.full_name}</strong> has a Section 8 annual recertification coming up in <strong>${days} days</strong>.
              </p>
              <p style="color:#374151;font-size:15px;line-height:1.6;">
                If your tenant misses their recertification or fails it, Housing Assistance Payments to you will be suspended. We're alerting them at the same time — but a friendly check-in from you can make a real difference.
              </p>

              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin-top:16px;">
                <p style="color:#1e40af;font-size:14px;margin:0;">
                  <strong>What you can do:</strong> Remind your tenant to gather their income documents, ID, and household information. Offer to help them schedule their housing authority appointment if needed.
                </p>
              </div>
            </div>
            <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">Settleed — Protecting your guaranteed income stream</p>
            </div>
          </div>
        `
      } : null

      // Send emails
      try {
        const emailsToSend = [tenantEmail]
        if (landlordEmailMsg) emailsToSend.push(landlordEmailMsg)
        await sendEmails(emailsToSend)

        // Log the alert
        await supabase.from('recert_alerts').insert({
          tenant_id: tenant.id,
          days_before: days,
          email_type: 'recertification_reminder',
        })

        totalSent++
      } catch (emailErr) {
        errors.push({ tenant: tenant.id, days, error: emailErr.message })
      }
    }
  }

  return res.status(200).json({
    success: true,
    sent: totalSent,
    errors: errors.length ? errors : undefined,
  })
}
