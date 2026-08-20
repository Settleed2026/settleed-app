// src/pages/Services.jsx
// Layer 3 — Consultation Services
// Available to all logged-in users (landlords + tenants)

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import {
  FileCheck, Home, TrendingUp, BookOpen,
  ArrowLeft, CheckCircle2, Clock, Star,
} from 'lucide-react'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

const SERVICES = [
  {
    id: 'recert_prep',
    icon: FileCheck,
    color: '#1D9E75',
    bg: '#f0fdf4',
    title: 'Recertification Prep',
    subtitle: 'For tenants',
    price: 85,
    duration: '60 min virtual session',
    description: 'A Settleed housing specialist walks you through your annual recertification step by step — what documents to gather, how to report income correctly, and what to do if your situation has changed.',
    includes: [
      '1-on-1 virtual session (60 min)',
      'Personalized document checklist',
      'Income reporting walkthrough',
      'Household change guidance',
      'Email follow-up summary',
    ],
    badge: 'Most popular',
  },
  {
    id: 'hqs_prep',
    icon: Home,
    color: '#1B3A6B',
    bg: '#eff6ff',
    title: 'HQS Inspection Prep',
    subtitle: 'For landlords',
    price: 125,
    duration: '45 min + written report',
    description: 'Stop failing HQS inspections. A Settleed specialist reviews your property details, walks through the full HQS checklist, and delivers a written report of exactly what to fix before the inspector arrives.',
    includes: [
      '45-min virtual walkthrough',
      'Full HQS checklist review',
      'Written remediation report',
      'Priority fix list (pass/fail items)',
      '30-day email support',
    ],
    badge: null,
  },
  {
    id: 'rent_increase',
    icon: TrendingUp,
    color: '#7c3aed',
    bg: '#f5f3ff',
    title: 'Rent Increase Service',
    subtitle: 'For landlords',
    price: 65,
    duration: 'Handled for you',
    description: 'Requesting a rent increase through AHA or DCA is confusing and easy to mess up. Settleed handles the entire process — market analysis, comparable rents, and submission to your housing authority.',
    includes: [
      'Market rent analysis for your area',
      'Comparable Section 8 rents pulled',
      'Request letter drafted for you',
      'Submission to your housing authority',
      'Status follow-up until resolved',
    ],
    badge: null,
  },
  {
    id: 'fair_housing',
    icon: BookOpen,
    color: '#d97706',
    bg: '#fffbeb',
    title: 'Fair Housing Training',
    subtitle: 'For landlords',
    price: 49,
    duration: 'Self-paced course',
    description: 'Avoid costly Fair Housing violations. This self-paced course covers what landlords can and cannot ask, how to screen tenants legally, and how to handle accommodation requests.',
    includes: [
      'Self-paced online course (~2 hrs)',
      'Fair Housing Act overview',
      'Legal screening guidelines',
      'Accommodation request handling',
      'Certificate of completion',
    ],
    badge: 'Best value',
  },
]

export default function Services() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(null)

  async function handleBook(service) {
    if (!user) {
      toast.error('Please sign in to book a service')
      navigate('/login')
      return
    }

    setLoading(service.id)
    try {
      const res = await fetch('/api/create-service-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id,
          serviceTitle: service.title,
          price: service.price,
          userId: user.id,
          userEmail: user.email,
        }),
      })

      const { sessionId, error } = await res.json()
      if (error) throw new Error(error)

      const stripe = await stripePromise
      await stripe.redirectToCheckout({ sessionId })
    } catch (err) {
      toast.error(err.message || 'Failed to start checkout')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-8">
        <button onClick={() => navigate(-1)} className="text-blue-200 flex items-center gap-1.5 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-white text-2xl font-bold">Settleed Services</h1>
        <p className="text-blue-200 text-sm mt-1">Expert help for every step of your Section 8 journey</p>
        <div className="flex items-center gap-2 mt-3">
          <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
          <span className="text-blue-100 text-xs">Backed by Section 8 housing specialists</span>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {SERVICES.map(service => {
          const Icon = service.icon
          const isLoading = loading === service.id
          return (
            <div key={service.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
              {service.badge && (
                <div className="px-4 py-1.5 text-xs font-semibold text-white text-center"
                  style={{ background: service.color }}>
                  {service.badge}
                </div>
              )}
              <div className="p-4 space-y-3">
                {/* Title row */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: service.bg }}>
                    <Icon className="w-5 h-5" style={{ color: service.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="text-base font-semibold text-gray-900">{service.title}</h2>
                      <span className="text-lg font-bold shrink-0" style={{ color: service.color }}>
                        ${service.price}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {service.subtitle}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" /> {service.duration}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed">{service.description}</p>

                {/* Includes */}
                <div className="space-y-1.5">
                  {service.includes.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: service.color }} />
                      {item}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleBook(service)}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-1 disabled:opacity-60"
                  style={{ background: service.color }}
                >
                  {isLoading ? 'Loading…' : `Book for $${service.price}`}
                </button>
              </div>
            </div>
          )
        })}

        <p className="text-xs text-gray-400 text-center pb-4">
          All sessions are virtual. Refunds available up to 24 hours before your scheduled session.
        </p>
      </div>
    </div>
  )
}
