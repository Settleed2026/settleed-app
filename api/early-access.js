// api/early-access.js
// Public early-access waitlist signup — server-side insert bypasses RLS

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { role, name, email, zip, voucher_size } = req.body || {}

  if (!role || !['landlord', 'tenant'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' })
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' })
  }

  const { error } = await supabase
    .from('early_access_signups')
    .insert({
      role,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      zip: zip?.trim() || null,
      voucher_size: role === 'tenant' ? (voucher_size || null) : null,
      unit_count: null,
    })

  if (error) {
    // Duplicate signup — treat as success (idempotent)
    if (error.code === '23505') {
      return res.status(200).json({ ok: true })
    }
    console.error('early-access insert error:', error.message)
    return res.status(500).json({ error: 'Insert failed' })
  }

  return res.status(200).json({ ok: true })
}
