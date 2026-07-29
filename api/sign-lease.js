/**
 * POST /api/sign-lease
 *
 * Tenant signs a lease that is pending their signature.
 * On success: lease → active, property → rented, tenant profile linked.
 *
 * Body: { lease_id: string, signature_name: string }
 * Auth: Bearer tenant JWT
 */

import { createClient } from '@supabase/supabase-js'

function jsonError(res, status, msg) {
  return res.status(status).json({ error: msg })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed')

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonError(res, 500, 'Server misconfiguration.')
  }

  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Verify tenant session
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return jsonError(res, 401, 'Please sign in.')
  const { data: authData, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !authData?.user) return jsonError(res, 401, 'Session expired.')
  const tenantId = authData.user.id

  const { lease_id, signature_name } = req.body ?? {}

  if (!lease_id) return jsonError(res, 400, 'lease_id is required.')
  if (!signature_name?.trim()) return jsonError(res, 400, 'signature_name is required.')

  try {
    // Fetch lease — confirm tenant is a party and it's pending their signature
    const { data: lease, error: leaseErr } = await supabase
      .from('leases')
      .select('id, property_id, landlord_id, tenant_id, status')
      .eq('id', lease_id)
      .eq('tenant_id', tenantId)
      .single()

    if (leaseErr || !lease) return jsonError(res, 404, 'Lease not found.')
    if (lease.status !== 'pending_tenant_signature') {
      return jsonError(res, 409, 'This lease is not pending your signature.')
    }

    // 1. Sign the lease — move to active
    const { error: signErr } = await supabase
      .from('leases')
      .update({
        tenant_signed_at:       new Date().toISOString(),
        tenant_signature_name:  signature_name.trim(),
        status:                 'active',
        updated_at:             new Date().toISOString(),
      })
      .eq('id', lease_id)

    if (signErr) throw signErr

    // 2. Mark property as rented
    await supabase
      .from('properties')
      .update({ status: 'rented', updated_at: new Date().toISOString() })
      .eq('id', lease.property_id)

    // 3. Link tenant's profile → property + landlord + active lease
    await supabase
      .from('profiles')
      .update({
        property_id:     lease.property_id,
        landlord_id:     lease.landlord_id,
        active_lease_id: lease.id,
        updated_at:      new Date().toISOString(),
      })
      .eq('id', tenantId)

    return res.status(200).json({
      success: true,
      message: 'Lease signed. Welcome to your new home!',
    })
  } catch (err) {
    console.error('[sign-lease]', err.message)
    return jsonError(res, 500, err.message || 'Failed to sign lease.')
  }
}
