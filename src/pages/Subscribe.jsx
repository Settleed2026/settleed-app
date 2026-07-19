import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { CheckCircle, Zap, Shield, Star, ArrowLeft, Lock, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

const PLANS = {
  landlord: {
    name: 'Landlord',
    price: '$49.99',
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

/**
 * Safely parse an API response as JSON.
 * If the server returned HTML/plain-text (e.g. Vercel crash page), this throws
 * a clean error instead of leaking `SyntaxError: Unexpected token 'A'...`.
 */
async function safeJson(res) {
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    const text = await res.text()
    throw new Error(
      res.ok
        ? 'Unexpected server response. Please try again.'
        : `Server error (${res.status}). Please try again.`
    )
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Step 1: Plan selection
// ---------------------------------------------------------------------------
function PlanSelect({ role, loading, onSelect }) {
  return (
    <div className="flex-1 px-4 py-8 max-w-lg mx-auto w-full">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
          <Zap size={12} />
          7-day free trial — no charge until day 8
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Simple, transparent pricing</h1>
        <p className="text-gray-500 text-sm mt-1">Cancel anytime. No hidden fees.</p>
      </div>

      <div className="space-y-4">
        {Object.entries(PLANS)
          .filter(([planRole]) => !role || role === planRole)
          .map(([planRole, plan]) => {
            const isCurrentRole = role === planRole
            const isLoading = loading === planRole
            return (
              <div
                key={planRole}
                className={`bg-white rounded-2xl border-2 p-6 ${isCurrentRole ? 'border-[#1B3A6B]' : 'border-gray-200'}`}
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
                  onClick={() => onSelect(planRole)}
                  disabled={!!loading}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                  style={{ backgroundColor: plan.color }}
                >
                  {isLoading ? 'Setting up your trial...' : 'Start free trial'}
                </button>
              </div>
            )
          })}
      </div>

      <div className="flex items-center justify-center gap-6 mt-8 text-xs text-gray-400">
        <div className="flex items-center gap-1"><Shield size={12} />Secured by Stripe</div>
        <div>Cancel anytime</div>
        <div>No contracts</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2: Card collection via Stripe Elements
// ---------------------------------------------------------------------------
function CardForm({ planRole, clientSecret, onBack }) {
  const plan = PLANS[planRole]
  const mountRef = useRef(null)
  const elementsRef = useRef(null)
  const [submitting, setSubmitting] = useState(false)
  const [elementsReady, setElementsReady] = useState(false)
  const [elementsError, setElementsError] = useState(null)

  useEffect(() => {
    if (!clientSecret || !mountRef.current) return

    let mounted = true

    stripePromise
      .then((stripe) => {
        if (!stripe || !mounted) return

        const elements = stripe.elements({
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#1B3A6B',
              borderRadius: '12px',
              fontFamily: 'Inter, system-ui, sans-serif',
            },
          },
        })
        elementsRef.current = { stripe, elements }

        const paymentEl = elements.create('payment', { layout: 'tabs' })
        paymentEl.on('ready', () => setElementsReady(true))
        paymentEl.on('loaderError', () => {
          setElementsError('Could not load payment form. Please refresh and try again.')
        })
        paymentEl.mount(mountRef.current)
      })
      .catch(() => {
        if (mounted) setElementsError('Could not load Stripe. Please refresh and try again.')
      })

    return () => {
      mounted = false
      try {
        elementsRef.current?.elements?.getElement('payment')?.unmount()
      } catch (_) {}
    }
  }, [clientSecret])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!elementsRef.current || submitting) return
    setSubmitting(true)

    try {
      const { stripe, elements } = elementsRef.current
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/subscribe/success`,
        },
      })

      // If we reach here, confirmSetup failed (success navigates away)
      if (error) {
        toast.error(error.message || 'Payment failed. Please check your card details.')
      }
    } catch (err) {
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 px-4 py-8 max-w-lg mx-auto w-full">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
        <ArrowLeft size={16} /> Back to plans
      </button>

      {/* Order summary */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-gray-900">{plan.name} Plan</span>
          <span className="font-bold text-gray-900">
            {plan.price}<span className="text-gray-500 text-sm font-normal">/mo</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <div className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Zap size={11} />
            7-day free trial
          </div>
          <span className="text-xs text-gray-400">— no charge until day 8</span>
        </div>
      </div>

      {/* Stripe Elements */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={14} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Payment details</span>
          <span className="text-xs text-gray-400 ml-auto">Encrypted &amp; secure</span>
        </div>

        {elementsError ? (
          <div className="flex items-start gap-2 text-red-600 text-sm py-4">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            {elementsError}
          </div>
        ) : (
          <>
            {!elementsReady && (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div ref={mountRef} className={elementsReady ? '' : 'hidden'} />
          </>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || !elementsReady || !!elementsError}
        className="w-full py-4 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
        style={{ backgroundColor: plan.color }}
      >
        {submitting ? 'Processing...' : 'Start 7-day free trial'}
      </button>

      <p className="text-center text-xs text-gray-400 mt-4">
        Your card won't be charged until your trial ends on day 8. Cancel anytime.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page root
// ---------------------------------------------------------------------------
export default function Subscribe() {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const cancelled = searchParams.get('cancelled')

  const [step, setStep] = useState('plans')       // 'plans' | 'card'
  const [selectedRole, setSelectedRole] = useState(null)
  const [clientSecret, setClientSecret] = useState(null)
  const [planLoading, setPlanLoading] = useState(null)  // which plan is loading
  const [pageError, setPageError] = useState(null)      // shown inline below header

  async function handleSelectPlan(planRole) {
    // Guard: must be signed in
    if (!user) {
      toast.error('Please sign in to start your free trial.')
      navigate('/login')
      return
    }

    setPageError(null)
    setPlanLoading(planRole)

    try {
      // 1. Get the current session token
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
      if (sessionErr || !sessionData?.session) {
        throw new Error('Your session has expired. Please sign in again.')
      }
      const { access_token } = sessionData.session

      // 2. Call the Vercel API route
      const res = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({ role: planRole }),
      })

      // 3. Safely parse JSON — don't blindly call .json() on HTML error pages
      const data = await safeJson(res)

      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status}). Please try again.`)
      }

      if (!data.clientSecret) {
        throw new Error('Payment setup incomplete — please try again or contact support.')
      }

      // 4. Success → advance to card form
      setClientSecret(data.clientSecret)
      setSelectedRole(planRole)
      setStep('card')
    } catch (err) {
      const message = err.message || 'Something went wrong. Please try again.'
      setPageError(message)
      toast.error(message)
    } finally {
      // Always clear loading — button never stays stuck
      setPlanLoading(null)
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

      {/* Cancelled banner */}
      {cancelled && step === 'plans' && (
        <div className="px-4 pt-4 max-w-lg mx-auto w-full">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
            No worries — your subscription wasn't started. Choose a plan below whenever you're ready.
          </div>
        </div>
      )}

      {/* Inline error (clears on next attempt) */}
      {pageError && step === 'plans' && (
        <div className="px-4 pt-4 max-w-lg mx-auto w-full">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            {pageError}
          </div>
        </div>
      )}

      {step === 'plans' ? (
        <PlanSelect
          role={role}
          loading={planLoading}
          onSelect={handleSelectPlan}
        />
      ) : (
        <CardForm
          planRole={selectedRole}
          clientSecret={clientSecret}
          onBack={() => { setStep('plans'); setPageError(null) }}
        />
      )}

      {!user && step === 'plans' && (
        <p className="text-center text-sm text-gray-500 pb-8">
          <Link to="/signup" className="text-[#1B3A6B] font-medium">Create an account</Link>
          {' '}to get started
        </p>
      )}
    </div>
  )
}
