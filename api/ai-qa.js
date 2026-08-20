// api/ai-qa.js
// Section 8 Q&A assistant — answers HUD, AHA, DCA policy questions

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

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
    console.error('[ai-qa]', err.message)
    return res.status(500).json({ error: err.message })
  }
}
