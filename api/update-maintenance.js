/**
 * PATCH /api/update-maintenance
 *
 * Landlord updates status / adds notes to a maintenance request.
 *
 * Required env vars:
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VITE_SUPABASE_URL
 */

import { createClient } from '@supabase/supabase-js'

function jsonError(res, status, message) {
  return res.status(status).json({ error: message })
}

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return jsonError(res, 405, 'Method not allowed')

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !supabaseUrl) {
    return jsonError(res, 500, 'Server misconfiguration.')
  }

  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return jsonError(res, 401, 'Please sign in.')
  const token = authHeader.replace('Bearer ', '')

  const { data: authData, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !authData?.user) return jsonError(res, 401, 'Session expired.')
  const user = authData.user

  const { request_id, status, landlord_notes } = req.body ?? {}
  if (!request_id) return jsonError(res, 400, 'request_id is required.')

  const validStatuses = ['acknowledged', 'in_progress', 'completed', 'closed']
  if (status && !validStatuses.includes(status)) {
    return jsonError(res, 400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`)
  }

  // Verify this landlord owns this maintenance request
  const { data: existing } = await supabase
    .from('maintenance_requests')
    .select('landlord_id, status')
    .eq('id', request_id)
    .single()

  if (!existing) return jsonError(res, 404, 'Request not found.')
  if (existing.landlord_id !== user.id) return jsonError(res, 403, 'Not authorized.')

  const updates = {}
  if (status) {
    updates.status = status
    if (status === 'acknowledged') updates.acknowledged_at = new Date().toISOString()
    if (status === 'completed') updates.completed_at = new Date().toISOString()
  }
  if (landlord_notes !== undefined) updates.landlord_notes = landlord_notes

  const { error } = await supabase
    .from('maintenance_requests')
    .update(updates)
    .eq('id', request_id)

  if (error) {
    console.error('[update-maintenance]', error.message)
    return jsonError(res, 500, 'Failed to update request.')
  }

  return res.status(200).json({ success: true })
}
