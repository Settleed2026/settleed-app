/**
 * POST /api/admin-notify
 *
 * Internal endpoint — sends a quick email to the Settleed admin (odtrius@gmail.com)
 * when a notable event occurs: new landlord signup, listing submitted for review,
 * or agency inquiry submitted.
 *
 * Body: { event: 'landlord_signup' | 'listing_review' | 'agency_inquiry', payload: {} }
 * Required env vars: SENDGRID_API_KEY
 */

const ADMIN_EMAIL = 'odtrius@gmail.com'
const SG_URL = 'https://api.sendgrid.com/v3/mail/send'

async function sendEmail({ to, from, subject, text }) {
  const res = await fetch(SG_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from,
      subject,
      content: [{ type: 'text/plain', value: text }],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`SendGrid ${res.status}: ${body}`)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!process.env.SENDGRID_API_KEY) return res.status(500).json({ error: 'No email config' })

  const { event, payload = {} } = req.body || {}

  let subject, text

  if (event === 'landlord_signup') {
    subject = `🏠 New landlord signed up — ${payload.email || 'unknown'}`
    text = `A new landlord just created a Settleed account.

Name: ${payload.name || 'N/A'}
Email: ${payload.email || 'N/A'}
Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET

Review at: https://settleed.com/admin/queue`
  } else if (event === 'listing_review') {
    subject = `📋 New listing submitted for review — ${payload.address || 'unknown'}`
    text = `A landlord just submitted a listing for review.

Address: ${payload.address || 'N/A'}
Neighborhood: ${payload.neighborhood || 'N/A'}
Landlord ID: ${payload.landlord_id || 'N/A'}
Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET

Review at: https://settleed.com/admin/queue`
  } else if (event === 'agency_inquiry') {
    subject = `🏛 New agency inquiry — ${payload.agency || 'unknown'}`
    text = `A housing authority just submitted a partnership inquiry.

Contact: ${payload.contact_name || 'N/A'}
Title: ${payload.contact_title || 'N/A'}
Agency: ${payload.agency || 'N/A'}
Email: ${payload.email || 'N/A'}
Phone: ${payload.phone || 'N/A'}
Message: ${payload.message || '(none)'}
Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`
  } else {
    return res.status(400).json({ error: 'Unknown event type' })
  }

  try {
    await sendEmail({
      to: ADMIN_EMAIL,
      from: { name: 'Settleed Alerts', email: 'noreply@settleed.com' },
      subject,
      text,
    })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[admin-notify] SendGrid error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
