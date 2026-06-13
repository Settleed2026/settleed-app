import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { CheckCircle, Zap, Shield, Star } from 'lucide-react'
import toast from 'react-hot-toast'

const PLANS = {
  landlord: {
    name: 'Landlord',
    price: '$49',
    period: '/month',
    tagline: 'Find verified Section 8 tenants fast',
    color: '#1B3A6B',
    features: [
      'Unlimited property listings',
      'Verified voucher holder applications',
      'HQS inspection tracker',
      'HAP payment standard calculator',
      'Application inbox & management',
      'Priority support',
    ],
  },
  tenant: {
    name: 'Voucher Holder',
    price: '$4.99',
    period: '/month',
    tagline: 'Find your next Section 8 home',
    color: '#1D9E75',
    features: [
      'Search all verified listings',
      'Apply with your voucher instantly',
      'Real-time application status',
      'Payment standard matching',
      'Instant match alerts',
      'Priority support',
    ],
  },
}

export default function Subscribe() {
  const { user, role } = useAuth()
  const [searchParams] = useSearchParams()
  const cancelled = searchParams.get('cancelled')
  const [loading, setLoading] = useState(null)

  async function handleSubscribe(planRole) {
    if (!user) {
      toast.error('Please sign in first.')
      return
    }
    setLoading(planRole)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ role: planRole }),
        }
      )
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 py-5 flex items-center justify-between">
        <Link to="/" className="text-white text-2xl font-bold tracking-tight">
          Settleed
        </Link>
        {user && (
          <Link
            to={role === 'landlord' ? '/landlord' : '/tenant'}
            className="text-white/80 text-sm"
          >
            Back to app
          </Link>
        )}
      </div>

      <div className="flex-1 px-4 py-10 max-w-lg mx-auto w-full">
        {cancelled && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-sm text-yellow-800">
            No worries — your subscription wasn't started. Choose a plan below whenever you're ready.
          </div>
        )}

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Zap size={12} />
            7-day free trial — no charge until day 8
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Simple, transparent pricing</h1>
          <p className="text-gray-500 text-sm mt-1">Cancel anytime. No hidden fees.</p>
        </div>

        <div className="space-y-4">
          {Object.entries(PLANS).map(([planRole, plan]) => {
            const isCurrentRole = role === planRole
            const isLoading = loading === planRole

            return (
              <div
                key={planRole}
                className={`bg-white rounded-2xl border-2 p-6 ${
                  isCurrentRole ? 'border-[#1B3A6B]' : 'border-gray-200'
                }`}
              >
                {isCurrentRole && (
                  <div className="text-xs font-semibold text-[#1B3A6B] mb-3 flex items-center gap-1">
                    <Star size={12} />
                    Recommended for your account
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
                    <p className="text-gray-500 text-sm">{plan.tagline}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500 text-sm">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle size={15} className="text-[#1D9E75] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(planRole)}
                  disabled={!!loading}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                  style={{ backgroundColor: plan.color }}
                >
                  {isLoading ? 'Redirecting to checkout...' : 'Start free trial'}
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-center gap-6 mt-8 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Shield size={12} />
            Secured by Stripe
          </div>
          <div>Cancel anytime</div>
          <div>No contracts</div>
        </div>

        {!user && (
          <p className="text-center text-sm text-gray-500 mt-6">
            <Link to="/signup" className="text-[#1B3A6B] font-medium">Create an account</Link>
            {' '}to get started
          </p>
        )}
      </div>
    </div>
  )
}
