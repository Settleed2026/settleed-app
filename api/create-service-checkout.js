// api/create-service-checkout.js
// Creates a Stripe Checkout session for a consultation service booking

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const SERVICE_NAMES = {
  recert_prep: 'Recertification Prep Session',
  hqs_prep: 'HQS Inspection Prep',
  rent_increase: 'Rent Increase Service',
  fair_housing: 'Fair Housing Training',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { serviceId, serviceTitle, price, userId, userEmail } = req.body

  if (!serviceId || !price || !userId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: price * 100, // cents
            product_data: {
              name: SERVICE_NAMES[serviceId] || serviceTitle,
              description: 'Settleed consultation service',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        service_id: serviceId,
        user_id: userId,
      },
      success_url: `${process.env.VITE_SITE_URL}/services/success?service=${serviceId}`,
      cancel_url: `${process.env.VITE_SITE_URL}/services`,
    })

    return res.status(200).json({ sessionId: session.id })
  } catch (err) {
    console.error('[create-service-checkout]', err.message)
    return res.status(500).json({ error: err.message })
  }
}
