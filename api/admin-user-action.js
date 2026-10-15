// api/admin-user-action.js
// Admin endpoint to suspend or permanently delete a user account.
// Called from the admin console (/admin/queue → Users tab).
//
// POST body: { userId, action: 'suspend' | 'unsuspend' | 'delete' }
// Auth: Bearer token must belong to an admin (is_admin = true in profiles).

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL         = process.env.SUPABASE_URL         || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY    = process.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' })

  // ── Auth: verify caller is an admin ──────────────────────────────────────
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  // Use anon client to verify the caller's session
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: { user: caller }, error: authErr } = await anonClient.auth.getUser(token)
  if (authErr || !caller) return res.status(401).json({ error: 'Invalid token' })

  // Check is_admin flag on caller's profile
  const { data: callerProfile } = await anonClient
    .from('profiles')
    .select('is_admin')
    .eq('id', caller.id)
    .single()

  if (!callerProfile?.is_admin) {
    return res.status(403).json({ error: 'Admin access required' })
  }

  // ── Validate request body ─────────────────────────────────────────────────
  const { userId, action } = req.body || {}
  if (!userId || !action) return res.status(400).json({ error: 'userId and action required' })
  if (!['suspend', 'unsuspend', 'delete'].includes(action)) {
    return res.status(400).json({ error: 'action must be suspend, unsuspend, or delete' })
  }
  // Prevent admin from acting on their own account
  if (userId === caller.id) {
    return res.status(400).json({ error: 'You cannot modify your own account' })
  }

  // ── Service-role client for privileged auth operations ────────────────────
  if (!SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Service role key not configured' })
  }
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Perform action ────────────────────────────────────────────────────────
  if (action === 'suspend') {
    // Ban the user — they can no longer sign in; existing sessions are revoked.
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: '876600h', // 100 years ≈ permanent
    })
    if (error) return res.status(500).json({ error: error.message })

    // Also mark profile so the UI reflects the status
    await adminClient.from('profiles').update({ suspended_at: new Date().toISOString() }).eq('id', userId)

    return res.status(200).json({ success: true, action: 'suspended', userId })
  }

  if (action === 'unsuspend') {
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: 'none',
    })
    if (error) return res.status(500).json({ error: error.message })

    await adminClient.from('profiles').update({ suspended_at: null }).eq('id', userId)

    return res.status(200).json({ success: true, action: 'unsuspended', userId })
  }

  if (action === 'delete') {
    // Hard-delete from auth.users — cascades to profile via FK if set up,
    // otherwise profile row stays (which is fine for audit purposes).
    const { error } = await adminClient.auth.admin.deleteUser(userId)
    if (error) return res.status(500).json({ error: error.message })

    // Remove profile row too
    await adminClient.from('profiles').delete().eq('id', userId)

    return res.status(200).json({ success: true, action: 'deleted', userId })
  }
}
