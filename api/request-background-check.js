/**
 * POST /api/request-background-check
 *
 * Landlord requests a background check for a tenant application.
 * Creates a background_checks record and (when Checkr is configured)
 * initiates a Checkr candidate + invitation.
 *
 * Body: { application_id }
 *
 * Required env vars:
 *   CHECKR_API_KEY          (optional — checks are queued if not set)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VITE_SUPABASE_URL
 */

import { createClient } from '@supabase/supabase-js'

function jsonError(res, status, message) {
  return res.status(status).json({ error: message })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed')

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !supabaseUrl) {
    return jsonError(res, 500, 'Server misconfiguration.')
  }

  const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return jsonError(res, 401, 'Please sign in.')
  const { data: authData, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authErr || !authData?.user) return jsonError(res, 401, 'Session expired.')
  const landlord = authData.user

  const { application_id } = req.body ?? {}
  if (!application_id) return jsonError(res, 400, 'application_id is required.')

  // Fetch application + tenant + property
  const { data: application } = await supabase
    .from('applications')
    .select('*, tenant:tenant_id(full_name, household_members), property:property_id(id)')
    .eq('id', application_id)
    .single()

  if (!application) return jsonError(res, 404, 'Application not found.')
  if (application.landlord_id !== landlord.id) return jsonError(res, 403, 'Not authorized.')

  // Check if a background check already exists for this application
  const { data: existing } = await supabase
    .from('background_checks')
    .select('id, status')
    .eq('application_id', application_id)
    .single()

  if (existing) {
    return res.status(200).json({ id: existing.id, status: existing.status, alreadyExists: true })
  }

  // Create the background check record
  const { data: check, error: insertErr } = await supabase
    .from('background_checks')
    .insert({
      application_id,
      landlord_id: landlord.id,
      tenant_id: application.tenant_id,
      property_id: application.property?.id,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertErr) {
    console.error('[request-background-check] Insert error:', insertErr.message)
    return jsonError(res, 500, 'Failed to create background check record.')
  }

  // If Checkr is configured, initiate the check
  if (process.env.CHECKR_API_KEY) {
    try {
      // Get tenant's email from auth
      const { data: tenantAuth } = await supabase.auth.admin.getUserById(application.tenant_id)
      const tenantEmail = tenantAuth?.user?.email

      if (tenantEmail) {
        // Create Checkr candidate
        const candidateRes = await fetch('https://api.checkr.com/v1/candidates', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(process.env.CHECKR_API_KEY + ':').toString('base64')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: tenantEmail }),
        })
        const candidate = await candidateRes.json()

        if (candidate.id) {
          // Create invitation (sends consent email to tenant)
          const inviteRes = await fetch('https://api.checkr.com/v1/invitations', {
            method: 'POST',
            headers: {
              Authorization: `Basic ${Buffer.from(process.env.CHECKR_API_KEY + ':').toString('base64')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              candidate_id: candidate.id,
              package: 'tasker_standard',
            }),
          })
          const invitation = await inviteRes.json()

          await supabase
            .from('background_checks')
            .update({
              checkr_candidate_id: candidate.id,
              status: 'in_progress',
            })
            .eq('id', check.id)

          console.log('[request-background-check] Checkr invitation sent:', invitation.id)
        }
      }
    } catch (err) {
      console.error('[request-background-check] Checkr error:', err.message)
      // Don't fail — record is created, Checkr can be retried
    }
  } else {
    console.warn('[request-background-check] CHECKR_API_KEY not set — check queued without Checkr.')
  }

  return res.status(200).json({ id: check.id, status: 'pending' })
}
