// api/ai.js
// Combined AI handler — routes by ?action=writer or ?action=qa
// Replaces: api/ai-listing-writer.js, api/ai-qa.js

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const action = req.query.action

  // ── AI Listing Writer ──────────────────────────────────────────────────────
  if (action === 'writer') {
    const {
      address, bedrooms, bathrooms, rent, squareFeet,
      amenities, utilities, petPolicy, parkingType, highlights,
    } = req.body

    if (!address || !bedrooms || !rent) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const prompt = `You are a Section 8 housing listing writer. Write a compelling, HUD Fair Housing compliant property description for the following rental property. Do NOT mention race, color, religion, national origin, sex, disability, or familial status. Focus on the property features only.

Property Details:
- Address: ${address}
- Bedrooms: ${bedrooms} | Bathrooms: ${bathrooms || 'N/A'}
- Rent: $${rent}/month
- Square footage: ${squareFeet || 'Not specified'}
- Amenities: ${amenities?.join(', ') || 'Standard'}
- Utilities included: ${utilities?.join(', ') || 'None'}
- Pet policy: ${petPolicy || 'No pets'}
- Parking: ${parkingType || 'Street parking'}
- Landlord highlights: ${highlights || 'Section 8 welcome'}

Write a 3-paragraph property description (150-200 words total) that:
1. Opens with the property's best features
2. Covers the key amenities and practical details
3. Ends with a warm, welcoming call to action for Section 8 voucher holders

Output only the description text, no headers or labels.`

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 400,
          temperature: 0.7,
        }),
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error.message)
      const description = data.choices?.[0]?.message?.content?.trim()
      return res.status(200).json({ description })
    } catch (err) {
      console.error('[ai/writer]', err.message)
      return res.status(500).json({ error: err.message })
    }
  }

  // ── Section 8 Q&A Assistant ───────────────────────────────────────────────
  if (action === 'qa') {
    const { question, role, housingAuthority } = req.body
    if (!question) return res.status(400).json({ error: 'Question is required' })

    const systemPrompt = `You are a Section 8 Housing Choice Voucher expert assistant for Settleed, a housing marketplace in Atlanta, Georgia. You have deep knowledge of:
- HUD Housing Choice Voucher program rules and regulations
- Atlanta Housing Authority (AHA) policies and procedures
- Georgia DCA Housing Choice Voucher program
- Fair Housing Act requirements
- HQS (Housing Quality Standards) inspection criteria
- Annual recertification processes
- Payment standards and rent reasonableness

The user is a ${role === 'landlord' ? 'landlord' : 'Section 8 tenant'} ${housingAuthority ? `using ${housingAuthority}` : 'in Atlanta, Georgia'}.

Provide accurate, helpful answers. If you're not certain about something, say so and recommend they contact their housing authority directly. Keep answers concise and practical. Never provide legal advice — recommend a housing counselor or attorney for legal questions.`

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question },
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error.message)
      const answer = data.choices?.[0]?.message?.content?.trim()
      return res.status(200).json({ answer })
    } catch (err) {
      console.error('[ai/qa]', err.message)
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(400).json({ error: 'Unknown action' })
}
