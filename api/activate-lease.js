/**
 * POST /api/activate-lease
 *
 * Landlord activates a lease for an approved applicant.
 * - Creates a lease record
 * - Updates application status → 'approved'
 * - Updates property status → 'rented'
 * - Links tenant's profile to the property (property_id, landlord_id, active_lease_id)
 *
 * Body: {
 *   application_id,
 *   lease_start_date,       // YYYY-MM-DD
 *   lease_end_date,         // YYYY-MM-DD (optional)
 *   rent_amount,            // total rent
 *   ha_portion,             // HA pays this (HAP amount)
 *   tenant_portion,         // tenant pays this
 *   hap_contract_number,    // optional
 *   recertification_date,   // optional YYYY-MM-DD
 * }
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

  // Use service role to bypass RLS for cross-profile updates
  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Verify landlord session
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return jsonError(res, 401, 'Please sign in.')
  const { data: authData, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !authData?.user) return jsonError(res, 401, 'Session expired.')
  const landlordId = authData.user.id

  const {
    application_id,
    lease_start_date,
    lease_end_date,
    rent_amount,
    ha_portion,
    tenant_portion,
    hap_contract_number,
    recertification_date,
  } = req.body ?? {}

  if (!application_id || !lease_start_date || !rent_amount) {
    return jsonError(res, 400, 'application_id, lease_start_date, and rent_amount are required.')
  }

  try {
    // 1. Fetch application — verify landlord owns it
    const { data: application, error: appErr } = await supabase
      .from('applications')
      .select('id, tenant_id, property_id, landlord_id, status')
      .eq('id', application_id)
      .single()

    if (appErr || !application) return jsonError(res, 404, 'Application not found.')
    if (application.landlord_id !== landlordId) return jsonError(res, 403, 'Not authorized.')
    if (application.status === 'approved') {
      // Already approved — check if lease already exists
      const { data: existingLease } = await supabase
        .from('leases')
        .select('id')
        .eq('property_id', application.property_id)
        .eq('tenant_id', application.tenant_id)
        .eq('status', 'active')
        .single()
      if (existingLease) return jsonError(res, 409, 'An active lease already exists for this tenant.')
    }

    // 2. Create lease record
    const { data: lease, error: leaseErr } = await supabase
      .from('leases')
      .insert({
        property_id: application.property_id,
        landlord_id: landlordId,
        tenant_id: application.tenant_id,
        lease_start_date,
        lease_end_date: lease_end_date || null,
        rent_amount: parseFloat(rent_amount),
        ha_portion: ha_portion ? parseFloat(ha_portion) : null,
        tenant_portion: tenant_portion ? parseFloat(tenant_portion) : null,
        hap_contract_number: hap_contract_number || null,
        recertification_date: recertification_date || null,
        status: 'active',
        market: 'atlanta',
      })
      .select()
      .single()

    if (leaseErr) throw leaseErr

    // 3. Update application → approved
    await supabase
      .from('applications')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', application_id)

    // 4. Update property → rented
    await supabase
      .from('properties')
      .update({ status: 'rented', updated_at: new Date().toISOString() })
      .eq('id', application.property_id)

    // 5. Link tenant's profile to property + landlord
    await supabase
      .from('profiles')
      .update({
        property_id: application.property_id,
        landlord_id: landlordId,
        active_lease_id: lease.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', application.tenant_id)

    // 6. Reject all other pending applications for this property
    await supabase
      .from('applications')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('property_id', application.property_id)
      .neq('id', application_id)
      .in('status', ['pending', 'reviewing'])

    return res.status(200).json({
      success: true,
      lease_id: lease.id,
      message: 'Lease activated. Tenant can now submit maintenance requests and pay rent.',
    })
  } catch (err) {
    console.error('[activate-lease]', err.message)
    return jsonError(res, 500, err.message || 'Failed to activate lease.')
  }
}
