// api/lease.js
// Combined lease handler — routes by ?action=sign or ?action=activate
// Replaces: api/sign-lease.js, api/activate-lease.js

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

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return jsonError(res, 401, 'Please sign in.')
  const { data: authData, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !authData?.user) return jsonError(res, 401, 'Session expired.')
  const userId = authData.user.id

  const action = req.query.action

  // ── Sign Lease (tenant) ───────────────────────────────────────────────────
  if (action === 'sign') {
    const { lease_id, signature_name } = req.body ?? {}
    if (!lease_id) return jsonError(res, 400, 'lease_id is required.')
    if (!signature_name?.trim()) return jsonError(res, 400, 'signature_name is required.')

    try {
      const { data: lease, error: leaseErr } = await supabase
        .from('leases')
        .select('id, property_id, landlord_id, tenant_id, status')
        .eq('id', lease_id)
        .eq('tenant_id', userId)
        .single()

      if (leaseErr || !lease) return jsonError(res, 404, 'Lease not found.')
      if (lease.status !== 'pending_tenant_signature') {
        return jsonError(res, 409, 'This lease is not pending your signature.')
      }

      const { error: signErr } = await supabase
        .from('leases')
        .update({
          tenant_signed_at: new Date().toISOString(),
          tenant_signature_name: signature_name.trim(),
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', lease_id)
      if (signErr) throw signErr

      await supabase
        .from('properties')
        .update({ status: 'rented', updated_at: new Date().toISOString() })
        .eq('id', lease.property_id)

      await supabase
        .from('profiles')
        .update({
          property_id: lease.property_id,
          landlord_id: lease.landlord_id,
          active_lease_id: lease.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      return res.status(200).json({ success: true, message: 'Lease signed. Welcome to your new home!' })
    } catch (err) {
      console.error('[lease/sign]', err.message)
      return jsonError(res, 500, err.message || 'Failed to sign lease.')
    }
  }

  // ── Activate Lease (landlord creates lease for tenant to sign) ────────────
  if (action === 'activate') {
    const {
      application_id, lease_type = 'digital', document_path, document_url,
      lease_start_date, lease_end_date, rent_amount, ha_portion, tenant_portion,
      security_deposit, late_fee_amount, late_fee_grace_days = 5,
      utilities_included = [], pets_allowed = false, pet_deposit,
      parking_included = false, parking_spaces = 0, additional_terms,
      special_provisions, hap_contract_number, recertification_date,
      landlord_signature_name,
    } = req.body ?? {}

    if (!application_id || !lease_start_date || !rent_amount) {
      return jsonError(res, 400, 'application_id, lease_start_date, and rent_amount are required.')
    }
    if (!landlord_signature_name?.trim()) return jsonError(res, 400, 'landlord_signature_name is required.')
    if (lease_type === 'uploaded' && !document_path) {
      return jsonError(res, 400, 'document_path is required for uploaded leases.')
    }

    try {
      const { data: application, error: appErr } = await supabase
        .from('applications')
        .select('id, tenant_id, property_id, landlord_id, status')
        .eq('id', application_id)
        .single()

      if (appErr || !application) return jsonError(res, 404, 'Application not found.')
      if (application.landlord_id !== userId) return jsonError(res, 403, 'Not authorized.')

      const { data: existingLease } = await supabase
        .from('leases')
        .select('id, status')
        .eq('property_id', application.property_id)
        .eq('tenant_id', application.tenant_id)
        .in('status', ['pending_tenant_signature', 'active'])
        .maybeSingle()

      if (existingLease) {
        return jsonError(res, 409, 'A lease already exists for this tenant on this property.')
      }

      const { data: lease, error: leaseErr } = await supabase
        .from('leases')
        .insert({
          property_id: application.property_id,
          landlord_id: userId,
          tenant_id: application.tenant_id,
          market: 'atlanta',
          lease_type,
          document_path: document_path || null,
          document_url: document_url || null,
          lease_start_date,
          lease_end_date: lease_end_date || null,
          rent_amount: parseFloat(rent_amount),
          ha_portion: ha_portion ? parseFloat(ha_portion) : null,
          tenant_portion: tenant_portion ? parseFloat(tenant_portion) : null,
          security_deposit: security_deposit ? parseFloat(security_deposit) : null,
          late_fee_amount: late_fee_amount ? parseFloat(late_fee_amount) : null,
          late_fee_grace_days: parseInt(late_fee_grace_days, 10),
          utilities_included: Array.isArray(utilities_included) ? utilities_included : [],
          pets_allowed: Boolean(pets_allowed),
          pet_deposit: pet_deposit ? parseFloat(pet_deposit) : null,
          parking_included: Boolean(parking_included),
          parking_spaces: parseInt(parking_spaces, 10) || 0,
          additional_terms: additional_terms || null,
          special_provisions: special_provisions || null,
          hap_contract_number: hap_contract_number || null,
          recertification_date: recertification_date || null,
          landlord_signed_at: new Date().toISOString(),
          landlord_signature_name: landlord_signature_name.trim(),
          status: 'pending_tenant_signature',
        })
        .select()
        .single()

      if (leaseErr) throw leaseErr

      await supabase
        .from('applications')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', application_id)

      await supabase
        .from('applications')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('property_id', application.property_id)
        .neq('id', application_id)
        .in('status', ['pending', 'reviewing'])

      return res.status(200).json({ success: true, lease_id: lease.id, message: 'Lease sent to tenant for signature.' })
    } catch (err) {
      console.error('[lease/activate]', err.message)
      return jsonError(res, 500, err.message || 'Failed to create lease.')
    }
  }

  return jsonError(res, 400, 'Unknown action')
}
