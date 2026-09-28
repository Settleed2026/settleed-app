/**
 * PATCH /api/maintenance-estimate
 *
 * Two actions, determined by `action` field in body:
 *
 *   action: 'send'
 *     Landlord sends a cost estimate to the tenant.
 *     Body: { request_id, cost_estimate, estimate_note }
 *     - Validates caller is the landlord on this request.
 *     - Sets pre_approval_status = 'pending'.
 *     - Sends an email notification to the tenant.
 *
 *   action: 'respond'
 *     Tenant approves or rejects the estimate.
 *     Body: { request_id, approved: true|false }
 *     - Validates caller is the tenant on this request.
 *     - Sets pre_approval_status = 'approved' | 'rejected'.
 *     - Sends an email notification to the landlord.
 *
 * Required env vars:
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_URL  (or VITE_SUPABASE_URL)
 *   SENDGRID_API_KEY
 */

import { createClient } from '@supabase/supabase-js'
import sgMail from '@sendgrid/mail'

const FROM_EMAIL = 'no-reply@settleed.com'
const FROM_NAME  = 'Settleed'

function jsonError(res, status, message) {
  return res.status(status).json({ error: message })
}

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return jsonError(res, 405, 'Method not allowed')

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !supabaseUrl) {
    return jsonError(res, 500, 'Server misconfiguration.')
  }

  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Auth
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return jsonError(res, 401, 'Please sign in.')
  const token = authHeader.replace('Bearer ', '')
  const { data: authData, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !authData?.user) return jsonError(res, 401, 'Session expired.')
  const user = authData.user

  const { action, request_id } = req.body ?? {}
  if (!action || !request_id) return jsonError(res, 400, 'action and request_id are required.')

  // Fetch the maintenance request with profile info for notifications
  const { data: mreq, error: mErr } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      property:property_id(street_address, unit_number, city),
      landlord_profile:landlord_id(full_name, email),
      tenant_profile:tenant_id(full_name, email)
    `)
    .eq('id', request_id)
    .single()

  if (mErr || !mreq) return jsonError(res, 404, 'Maintenance request not found.')

  // ── SEND ESTIMATE (landlord action) ─────────────────────────────────────
  if (action === 'send') {
    if (mreq.landlord_id !== user.id) {
      return jsonError(res, 403, 'Not authorized for this request.')
    }

    const { cost_estimate, estimate_note } = req.body
    if (!cost_estimate || isNaN(Number(cost_estimate)) || Number(cost_estimate) <= 0) {
      return jsonError(res, 400, 'A valid cost_estimate (positive number) is required.')
    }

    const { error: updateErr } = await supabase
      .from('maintenance_requests')
      .update({
        cost_estimate:        Number(cost_estimate),
        estimate_note:        estimate_note?.trim() || null,
        pre_approval_status:  'pending',
      })
      .eq('id', request_id)

    if (updateErr) return jsonError(res, 500, 'Could not save estimate.')

    // Email the tenant
    if (process.env.SENDGRID_API_KEY && mreq.tenant_profile?.email) {
      try {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY)
        const cat = mreq.category ? mreq.category.charAt(0).toUpperCase() + mreq.category.slice(1) : 'Maintenance'
        const address = mreq.property
          ? `${mreq.property.street_address}${mreq.property.unit_number ? ` #${mreq.property.unit_number}` : ''}`
          : 'Your property'

        await sgMail.send({
          to:   mreq.tenant_profile.email,
          from: { email: FROM_EMAIL, name: FROM_NAME },
          subject: `Action Required: Approve Repair Estimate — ${formatCurrency(cost_estimate)}`,
          text: [
            `Hi ${mreq.tenant_profile.full_name || 'there'},`,
            '',
            `Your landlord has sent a cost estimate for your ${cat} maintenance request at ${address}.`,
            '',
            `Estimated cost: ${formatCurrency(cost_estimate)}`,
            estimate_note ? `Note from landlord: ${estimate_note}` : '',
            '',
            'Please log in to Settleed to approve or reject this estimate before work can begin.',
            '',
            'View request: https://settleed.com/tenant/maintenance',
            '',
            '— The Settleed Team',
          ].filter(Boolean).join('\n'),
        })
      } catch (_) {
        // Email failure is non-fatal
      }
    }

    return res.status(200).json({ success: true, action: 'sent' })
  }

  // ── RESPOND TO ESTIMATE (tenant action) ─────────────────────────────────
  if (action === 'respond') {
    if (mreq.tenant_id !== user.id) {
      return jsonError(res, 403, 'Not authorized for this request.')
    }
    if (mreq.pre_approval_status !== 'pending') {
      return jsonError(res, 400, 'No pending estimate to respond to.')
    }

    const { approved } = req.body
    if (typeof approved !== 'boolean') {
      return jsonError(res, 400, 'approved must be true or false.')
    }

    const newStatus = approved ? 'approved' : 'rejected'

    const { error: updateErr } = await supabase
      .from('maintenance_requests')
      .update({
        pre_approval_status:       newStatus,
        pre_approval_responded_at: new Date().toISOString(),
      })
      .eq('id', request_id)

    if (updateErr) return jsonError(res, 500, 'Could not save response.')

    // Email the landlord
    if (process.env.SENDGRID_API_KEY && mreq.landlord_profile?.email) {
      try {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY)
        const cat = mreq.category ? mreq.category.charAt(0).toUpperCase() + mreq.category.slice(1) : 'Maintenance'
        const address = mreq.property
          ? `${mreq.property.street_address}${mreq.property.unit_number ? ` #${mreq.property.unit_number}` : ''}`
          : 'Your property'

        await sgMail.send({
          to:   mreq.landlord_profile.email,
          from: { email: FROM_EMAIL, name: FROM_NAME },
          subject: `Repair Estimate ${approved ? 'Approved ✅' : 'Rejected ❌'} — ${cat} at ${address}`,
          text: [
            `Hi ${mreq.landlord_profile.full_name || 'there'},`,
            '',
            `Your tenant has ${approved ? 'approved' : 'rejected'} the ${formatCurrency(mreq.cost_estimate)} estimate for the ${cat} repair at ${address}.`,
            '',
            approved
              ? 'You can now proceed with scheduling the repair.'
              : 'The tenant has declined the estimate. You may want to reach out to discuss alternative options.',
            '',
            'View request: https://settleed.com/landlord/maintenance',
            '',
            '— The Settleed Team',
          ].join('\n'),
        })
      } catch (_) {
        // Email failure is non-fatal
      }
    }

    return res.status(200).json({ success: true, action: newStatus })
  }

  return jsonError(res, 400, 'Invalid action. Must be "send" or "respond".')
}
