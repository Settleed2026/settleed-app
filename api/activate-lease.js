/**
 * POST /api/activate-lease
 *
 * Landlord creates and signs a lease for an approved applicant.
 * Lease starts as 'pending_tenant_signature' — becomes 'active' when
 * tenant signs via /api/sign-lease.
 *
 * Body: {
 *   application_id,
 *   lease_type,             // 'digital' | 'uploaded'
 *   document_path?,         // Supabase Storage path (uploaded only)
 *   document_url?,          // signed URL (uploaded only)
 *   lease_start_date,       // YYYY-MM-DD
 *   lease_end_date?,        // YYYY-MM-DD
 *   rent_amount,            // total rent
 *   ha_portion?,            // HA pays this (HAP amount)
 *   tenant_portion?,        // tenant pays this
 *   security_deposit?,
 *   late_fee_amount?,
 *   late_fee_grace_days?,
 *   utilities_included?,    // string[]
 *   pets_allowed?,
 *   pet_deposit?,
 *   parking_included?,
 *   parking_spaces?,
 *   additional_terms?,
 *   special_provisions?,
 *   hap_contract_number?,
 *   recertification_date?,  // YYYY-MM-DD
 *   landlord_signature_name // required — landlord signed
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

  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Verify landlord session
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return jsonError(res, 401, 'Please sign in.')
  const { data: authData, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !authData?.user) return jsonError(res, 401, 'Session expired.')
  const landlordId = authData.user.id

  const {
    application_id,
    lease_type           = 'digital',
    document_path,
    document_url,
    lease_start_date,
    lease_end_date,
    rent_amount,
    ha_portion,
    tenant_portion,
    security_deposit,
    late_fee_amount,
    late_fee_grace_days  = 5,
    utilities_included   = [],
    pets_allowed         = false,
    pet_deposit,
    parking_included     = false,
    parking_spaces       = 0,
    additional_terms,
    special_provisions,
    hap_contract_number,
    recertification_date,
    landlord_signature_name,
  } = req.body ?? {}

  if (!application_id || !lease_start_date || !rent_amount) {
    return jsonError(res, 400, 'application_id, lease_start_date, and rent_amount are required.')
  }
  if (!landlord_signature_name?.trim()) {
    return jsonError(res, 400, 'landlord_signature_name is required.')
  }
  if (lease_type === 'uploaded' && !document_path) {
    return jsonError(res, 400, 'document_path is required for uploaded leases.')
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

    // Guard: check for an existing non-terminated lease
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

    // 2. Create lease as pending_tenant_signature
    const { data: lease, error: leaseErr } = await supabase
      .from('leases')
      .insert({
        property_id:              application.property_id,
        landlord_id:              landlordId,
        tenant_id:                application.tenant_id,
        market:                   'atlanta',
        lease_type,
        document_path:            document_path  || null,
        document_url:             document_url   || null,
        lease_start_date,
        lease_end_date:           lease_end_date           || null,
        rent_amount:              parseFloat(rent_amount),
        ha_portion:               ha_portion               ? parseFloat(ha_portion)       : null,
        tenant_portion:           tenant_portion           ? parseFloat(tenant_portion)   : null,
        security_deposit:         security_deposit         ? parseFloat(security_deposit) : null,
        late_fee_amount:          late_fee_amount          ? parseFloat(late_fee_amount)  : null,
        late_fee_grace_days:      parseInt(late_fee_grace_days, 10),
        utilities_included:       Array.isArray(utilities_included) ? utilities_included : [],
        pets_allowed:             Boolean(pets_allowed),
        pet_deposit:              pet_deposit              ? parseFloat(pet_deposit)      : null,
        parking_included:         Boolean(parking_included),
        parking_spaces:           parseInt(parking_spaces, 10) || 0,
        additional_terms:         additional_terms         || null,
        special_provisions:       special_provisions       || null,
        hap_contract_number:      hap_contract_number      || null,
        recertification_date:     recertification_date     || null,
        landlord_signed_at:       new Date().toISOString(),
        landlord_signature_name:  landlord_signature_name.trim(),
        status:                   'pending_tenant_signature',
      })
      .select()
      .single()

    if (leaseErr) throw leaseErr

    // 3. Ensure application status is approved
    await supabase
      .from('applications')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', application_id)

    // 4. Reject other pending applications for this property
    await supabase
      .from('applications')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('property_id', application.property_id)
      .neq('id', application_id)
      .in('status', ['pending', 'reviewing'])

    return res.status(200).json({
      success:  true,
      lease_id: lease.id,
      message:  'Lease sent to tenant for signature.',
    })
  } catch (err) {
    console.error('[activate-lease]', err.message)
    return jsonError(res, 500, err.message || 'Failed to create lease.')
  }
}
