// api/send-message.js
// Send a message in a conversation; creates the conversation if it doesn't exist
// Also runs content through fraud filter and sends email notification

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function sendEmail(to, subject, html) {
  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'notifications@settleed.com', name: 'Settleed' },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    })
    if (!res.ok) console.error('[send-message] email error:', res.status)
  } catch (e) {
    console.error('[send-message] email error:', e.message)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { conversation_id, property_id, landlord_id, tenant_id, sender_id, content } = req.body

  if (!sender_id || !content?.trim()) {
    return res.status(400).json({ error: 'sender_id and content required' })
  }
  if (content.length > 2000) {
    return res.status(400).json({ error: 'Message too long (max 2000 chars)' })
  }

  // ── Fraud filter ──
  let flagged = false
  let flag_reason = null
  const lower = content.toLowerCase()
  const BANNED = [
    /\b(?:cash only|no check|zelle|cashapp|cash app|venmo|western union|money order)\b/i,
    /\b(?:wire transfer|send money|pay me directly)\b/i,
    /\b(?:whatsapp|telegram|signal me|text me at)\b/i,
    /\$\d{3,}.*(?:deposit|upfront|advance)/i,
  ]
  for (const pattern of BANNED) {
    if (pattern.test(content)) {
      flagged = true
      flag_reason = 'Potential policy violation detected'
      break
    }
  }

  // ── Get or create conversation ──
  let convId = conversation_id
  if (!convId) {
    if (!property_id || !landlord_id || !tenant_id) {
      return res.status(400).json({ error: 'property_id, landlord_id, tenant_id required to create conversation' })
    }
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('property_id', property_id)
      .eq('tenant_id', tenant_id)
      .maybeSingle()

    if (existing) {
      convId = existing.id
    } else {
      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .insert({ property_id, landlord_id, tenant_id })
        .select('id')
        .single()
      if (convErr) return res.status(500).json({ error: convErr.message })
      convId = conv.id
    }
  }

  // ── Fetch conversation for notification ──
  const { data: conv } = await supabase
    .from('conversations')
    .select('landlord_id, tenant_id, property_id, properties:property_id(street_address, neighborhood)')
    .eq('id', convId)
    .single()

  // ── Insert message ──
  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .insert({ conversation_id: convId, sender_id, content: content.trim(), flagged, flag_reason })
    .select()
    .single()

  if (msgErr) return res.status(500).json({ error: msgErr.message })

  // ── Update conversation unread count + last_message_at ──
  const isTenant = sender_id === conv?.tenant_id
  await supabase
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      landlord_unread: isTenant ? supabase.rpc('increment', { row_id: convId, col: 'landlord_unread' }) : 0,
      tenant_unread:  !isTenant ? supabase.rpc('increment', { row_id: convId, col: 'tenant_unread' })  : 0,
    })
    .eq('id', convId)

  // ── Email notification to recipient ──
  if (!flagged && conv) {
    const recipientId = isTenant ? conv.landlord_id : conv.tenant_id
    const { data: recipient } = await supabase
      .from('profiles')
      .select('full_name, email:id')
      .eq('id', recipientId)
      .single()
    const { data: sender } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', sender_id)
      .single()

    // Get email from auth
    const { data: authUser } = await supabase.auth.admin.getUserById(recipientId)
    const recipientEmail = authUser?.user?.email

    if (recipientEmail) {
      const property = conv.properties
      const address = property?.neighborhood || property?.street_address || 'your listing'
      await sendEmail(
        recipientEmail,
        `New message from ${sender?.full_name || 'Settleed user'}`,
        `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
          <div style="background:#1B3A6B;padding:20px 24px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0;font-size:18px">New message on Settleed</h2>
          </div>
          <div style="background:#f9f9f9;padding:20px 24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none">
            <p style="color:#374151;margin:0 0 12px"><strong>${sender?.full_name || 'Someone'}</strong> sent you a message about <strong>${address}</strong>:</p>
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:16px;color:#374151;font-size:15px;line-height:1.6">${content.trim()}</div>
            <a href="${process.env.VITE_SITE_URL || 'https://settleed.com'}/messages" style="display:inline-block;margin-top:20px;background:#1B3A6B;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">Reply on Settleed</a>
            <p style="color:#9ca3af;font-size:12px;margin-top:20px">Settleed · Section 8 Housing Marketplace</p>
          </div>
        </div>`
      )
    }
  }

  return res.status(200).json({ message: msg, flagged, conversation_id: convId })
}
