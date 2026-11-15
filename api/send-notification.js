/**
 * POST /api/send-notification
 *
 * Generic notification endpoint. Sends transactional emails via SendGrid.
 * All calls are fire-and-forget — callers should not block on this.
 *
 * Body:
 *   type: 'new_application' | 'maintenance_request' | 'application_status'
 *   payload: { ... type-specific data ... }
 *
 * Required env vars:
 *   RESEND_API_KEY
 *   FROM_EMAIL          (default: info@settleed.com)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VITE_SUPABASE_URL
 */

import { createClient } from '@supabase/supabase-js'

function jsonError(res, status, message) {
  return res.status(status).json({ error: message })
}

function escHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY
  const from   = `Settleed <${process.env.FROM_EMAIL || 'info@settleed.com'}>`

  if (!apiKey) {
    console.warn('[send-notification] RESEND_API_KEY not set — skipping email to', to)
    return { skipped: true }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[send-notification] Resend error:', res.status, body)
    return { error: body }
  }

  return { sent: true }
}

// ── Email builders ──────────────────────────────────────────────────────────

function buildNewApplicationEmail({ tenantName, propertyAddress, applicationDate }) {
  return {
    subject: `New application received — ${propertyAddress}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
        <div style="background:#1B3A6B;border-radius:12px 12px 0 0;padding:24px">
          <h1 style="color:white;font-size:20px;margin:0">New Application</h1>
        </div>
        <div style="background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px">
          <p style="color:#374151;font-size:15px;margin:0 0 16px">
            <strong>${escHtml(tenantName)}</strong> has applied to your property at
            <strong>${escHtml(propertyAddress)}</strong>.
          </p>
          <p style="color:#6b7280;font-size:13px;margin:0 0 24px">Applied: ${escHtml(applicationDate)}</p>
          <a href="https://www.settleed.com/landlord/applications"
             style="display:inline-block;background:#1B3A6B;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
            View Application →
          </a>
          <p style="color:#9ca3af;font-size:12px;margin:24px 0 0">Settleed · Georgia Housing Choice Voucher Program (Section 8)</p>
        </div>
      </div>`,
  }
}

function buildMaintenanceEmail({ tenantName, category, urgency, description, propertyAddress }) {
  const urgencyColor = urgency === 'emergency' ? '#dc2626' : urgency === 'urgent' ? '#d97706' : '#6b7280'
  const urgencyLabel = urgency === 'emergency' ? '🚨 EMERGENCY' : urgency === 'urgent' ? '⚠️ Urgent' : 'Normal'
  return {
    subject: `Maintenance request — ${category} at ${propertyAddress}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
        <div style="background:#1B3A6B;border-radius:12px 12px 0 0;padding:24px">
          <h1 style="color:white;font-size:20px;margin:0">Maintenance Request</h1>
        </div>
        <div style="background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px">
          <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:16px">
            <p style="margin:0 0 6px;font-size:13px;color:#6b7280">Property</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#111827">${escHtml(propertyAddress)}</p>
          </div>
          <div style="display:flex;gap:12px;margin-bottom:16px">
            <div style="flex:1;background:#f9fafb;border-radius:8px;padding:12px">
              <p style="margin:0 0 4px;font-size:12px;color:#6b7280">Category</p>
              <p style="margin:0;font-size:14px;font-weight:600;color:#111827;text-transform:capitalize">${escHtml(category)}</p>
            </div>
            <div style="flex:1;background:#f9fafb;border-radius:8px;padding:12px">
              <p style="margin:0 0 4px;font-size:12px;color:#6b7280">Urgency</p>
              <p style="margin:0;font-size:14px;font-weight:600;color:${urgencyColor}">${escHtml(urgencyLabel)}</p>
            </div>
          </div>
          <p style="color:#374151;font-size:14px;margin:0 0 8px"><strong>From:</strong> ${escHtml(tenantName)}</p>
          <p style="color:#374151;font-size:14px;margin:0 0 24px;background:#f9fafb;padding:12px;border-radius:8px;line-height:1.6">
            "${escHtml(description)}"
          </p>
          <a href="https://www.settleed.com/landlord/maintenance"
             style="display:inline-block;background:#1B3A6B;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
            View Request →
          </a>
          <p style="color:#9ca3af;font-size:12px;margin:24px 0 0">Settleed · Georgia Housing Choice Voucher Program (Section 8)</p>
        </div>
      </div>`,
  }
}

function buildStatusChangeEmail({ propertyAddress, newStatus, landlordNote }) {
  const cfg = {
    info_requested:    { color: '#7c3aed', label: '📋 More Info Needed',    body: `The landlord reviewing your application at <strong>${escHtml(propertyAddress)}</strong> has requested additional information. Please check your messages in the app and reply as soon as possible to keep your application active.`, cta: 'Check My Messages', link: 'https://www.settleed.com/tenant/messages' },
    showing_scheduled: { color: '#0891b2', label: '📅 Showing Time Proposed', body: `Great progress! The landlord at <strong>${escHtml(propertyAddress)}</strong> wants to schedule a showing. Open the app to pick a time that works for you.`, cta: 'Pick a Showing Time', link: 'https://www.settleed.com/tenant/applications' },
    selected:          { color: '#1D9E75', label: "🎉 You've Been Selected!", body: `Congratulations! The landlord at <strong>${escHtml(propertyAddress)}</strong> has selected you as their tenant. Your next step is to contact your housing authority to begin the RFTA (Request for Tenancy Approval) process, then sign your lease in the app.`, cta: 'View My Applications', link: 'https://www.settleed.com/tenant/applications' },
    unit_filled:       { color: '#6b7280', label: '🏠 Unit Has Been Filled',  body: `Thank you for your interest in <strong>${escHtml(propertyAddress)}</strong>. The landlord has selected another applicant for this unit. Keep searching — new Housing Choice Voucher (Section 8) listings are added regularly.`, cta: 'Browse Listings', link: 'https://www.settleed.com/tenant/search' },
    approved:          { color: '#1D9E75', label: '✅ Approved',              body: `Great news! Your landlord has approved your application at <strong>${escHtml(propertyAddress)}</strong>. They may reach out shortly to discuss next steps for your lease.`, cta: 'View My Applications', link: 'https://www.settleed.com/tenant/applications' },
    rejected:          { color: '#dc2626', label: '❌ Not Selected',          body: `Your application to <strong>${escHtml(propertyAddress)}</strong> was not selected. Don't give up — keep browsing available listings on Settleed.`, cta: 'Browse Listings', link: 'https://www.settleed.com/tenant/search' },
  }
  const { color, label, body, cta, link } = cfg[newStatus] || cfg.rejected
  return {
    subject: `${label} — ${propertyAddress}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
        <div style="background:#1B3A6B;border-radius:12px 12px 0 0;padding:24px">
          <h1 style="color:white;font-size:20px;margin:0">Application Update</h1>
        </div>
        <div style="background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px">
          <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:20px;text-align:center">
            <p style="font-size:20px;font-weight:700;color:${color};margin:0">${label}</p>
          </div>
          <p style="color:#374151;font-size:15px;margin:0 0 20px;line-height:1.6">${body}</p>
          ${landlordNote ? `<div style="background:#EEF5FF;border-radius:8px;padding:12px;margin-bottom:20px">
            <p style="font-size:12px;color:#6b7280;margin:0 0 6px">Message from landlord</p>
            <p style="font-size:14px;color:#1B3A6B;margin:0">${escHtml(landlordNote)}</p>
          </div>` : ''}
          <a href="${link}"
             style="display:inline-block;background:#1B3A6B;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
            ${cta} →
          </a>
          <p style="color:#9ca3af;font-size:12px;margin:24px 0 0">Settleed · Georgia Housing Choice Voucher Program (Section 8)</p>
        </div>
      </div>`,
  }
}

// ── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed')

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !supabaseUrl) {
    return jsonError(res, 500, 'Server misconfiguration.')
  }

  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Verify caller is authenticated
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return jsonError(res, 401, 'Please sign in.')
  const { data: authData, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authErr || !authData?.user) return jsonError(res, 401, 'Session expired.')

  const { type, payload } = req.body ?? {}
  if (!type || !payload) return jsonError(res, 400, 'type and payload are required.')

  try {
    // ── new_application: notify landlord ──────────────────────────────────
    if (type === 'new_application') {
      const { landlord_id, tenant_name, property_address } = payload
      if (!landlord_id) return res.status(200).json({ skipped: 'missing landlord_id' })

      const { data: landlord } = await supabase.auth.admin.getUserById(landlord_id)
      const landlordEmail = landlord?.user?.email
      if (!landlordEmail) return res.status(200).json({ skipped: 'no landlord email' })

      const { subject, html } = buildNewApplicationEmail({
        tenantName: tenant_name || 'A tenant',
        propertyAddress: property_address || 'your property',
        applicationDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      })
      const result = await sendEmail({ to: landlordEmail, subject, html })
      return res.status(200).json(result)
    }

    // ── maintenance_request: notify landlord ─────────────────────────────
    if (type === 'maintenance_request') {
      const { landlord_id, tenant_name, category, urgency, description, property_address } = payload
      if (!landlord_id) return res.status(200).json({ skipped: 'missing landlord_id' })

      const { data: landlord } = await supabase.auth.admin.getUserById(landlord_id)
      const landlordEmail = landlord?.user?.email
      if (!landlordEmail) return res.status(200).json({ skipped: 'no landlord email' })

      const { subject, html } = buildMaintenanceEmail({
        tenantName: tenant_name || 'Your tenant',
        category: category || 'maintenance',
        urgency: urgency || 'normal',
        description: description || '(no description)',
        propertyAddress: property_address || 'your property',
      })
      const result = await sendEmail({ to: landlordEmail, subject, html })
      return res.status(200).json(result)
    }

    // ── application_status: notify tenant ────────────────────────────────
    if (type === 'application_status') {
      const { tenant_id, property_address, new_status, landlord_note } = payload
      if (!tenant_id) return res.status(200).json({ skipped: 'missing tenant_id' })

      const { data: tenant } = await supabase.auth.admin.getUserById(tenant_id)
      const tenantEmail = tenant?.user?.email
      if (!tenantEmail) return res.status(200).json({ skipped: 'no tenant email' })

      const { subject, html } = buildStatusChangeEmail({
        propertyAddress: property_address || 'the property',
        newStatus: new_status,
        landlordNote: landlord_note || null,
      })
      const result = await sendEmail({ to: tenantEmail, subject, html })
      return res.status(200).json(result)
    }

    return jsonError(res, 400, `Unknown notification type: ${type}`)
  } catch (err) {
    console.error('[send-notification]', err.message)
    // Return 200 so callers don't retry — notifications are best-effort
    return res.status(200).json({ error: err.message })
  }
}
