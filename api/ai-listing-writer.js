// api/ai-listing-writer.js
// Uses OpenAI to generate a compelling, HUD-compliant property listing description

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

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
    console.error('[ai-listing-writer]', err.message)
    return res.status(500).json({ error: err.message })
  }
}
