import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import BottomNav from '../../components/BottomNav'
import toast from 'react-hot-toast'
import { CreditCard, CheckCircle, DollarSign, Calendar } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

const STATUS_CONFIG = {
  pending: { label: 'Due',    color: 'bg-amber-100 text-amber-700' },
  paid:    { label: 'Paid',   color: 'bg-green-100 text-green-700' },
  late:    { label: 'Late',   color: 'bg-red-100 text-red-700' },
  failed:  { label: 'Failed', color: 'bg-red-100 text-red-700' },
}

function PayForm({ clientSecret, amountCents, onSuccess }) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)

  async function handlePay(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true)
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/tenant/rent?paid=1` },
      redirect: 'if_required',
    })
    if (error) {
      toast.error(error.message || 'Payment failed. Please try again.')
      setPaying(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="bg-white rounded-xl p-4">
        <PaymentElement />
      </div>
      <button
        type="submit"
        disabled={!stripe || paying}
        className="w-full bg-[#1D9E75] text-white rounded-xl py-4 text-sm font-semibold disabled:opacity-50"
      >
        {paying ? 'Processing…' : `Pay $${(amountCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
      </button>
      <p className="text-center text-xs text-gray-400">Payments are processed securely by Stripe.</p>
    </form>
  )
}

export default function TenantRentPayment() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [property, setProperty] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [clientSecret, setClientSecret] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [creating, setCreating] = useState(false)
  const [paid, setPaid] = useState(false)

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  // Check for ?paid=1 redirect from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('paid') === '1') {
      setPaid(true)
      toast.success('Payment confirmed!')
      fetchData()
    }
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data: prof } = await supabase
      .from('profiles')
      .select('property_id')
      .eq('id', user.id)
      .single()

    if (prof?.property_id) {
      const { data: prop } = await supabase
        .from('properties')
        .select('id, street_address, unit_number, city, rent_amount')
        .eq('id', prof.property_id)
        .single()
      setProperty(prop)
    }

    const { data: pmts } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('tenant_id', user.id)
      .order('due_date', { ascending: false })
      .limit(12)

    setProfile(prof)
    setPayments(pmts || [])
    setLoading(false)
  }

  async function handleCreatePayment() {
    if (!payAmount || parseFloat(payAmount) < 1) { toast.error('Enter a valid amount.'); return }
    if (!dueDate) { toast.error('Select a due date.'); return }
    if (!property?.id) { toast.error('No active lease on file.'); return }

    setCreating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/create-rent-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          property_id: property.id,
          amount_cents: Math.round(parseFloat(payAmount) * 100),
          due_date: dueDate,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setClientSecret(data.clientSecret)
    } catch (err) {
      toast.error(err.message || 'Could not start payment.')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const address = property
    ? `${property.street_address}${property.unit_number ? ` #${property.unit_number}` : ''}`
    : null

  // Success state
  if (paid) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-[#1B3A6B] px-4 pt-10 pb-6">
          <h1 className="text-white text-2xl font-bold">Rent Payment</h1>
        </div>
        <div className="px-4 pt-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-[#1D9E75]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Confirmed!</h2>
          <p className="text-sm text-gray-500 mb-6">Your payment has been received and will be sent to your landlord.</p>
          <button onClick={() => { setPaid(false); setClientSecret(null) }}
            className="bg-[#1B3A6B] text-white rounded-xl px-6 py-3 text-sm font-semibold">
            Back to Rent
          </button>
        </div>
        <BottomNav role="tenant" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-6">
        <button onClick={() => navigate('/tenant')} className="text-blue-200 text-sm mb-3">← Dashboard</button>
        <h1 className="text-white text-2xl font-bold">Rent Payment</h1>
        {address && <p className="text-blue-200 text-sm mt-0.5">{address}</p>}
      </div>

      <div className="px-4 pt-4 space-y-4">
        {!property ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No active lease on file. Your landlord needs to set this up.</p>
          </div>
        ) : clientSecret ? (
          // Stripe payment form
          <>
            <div className="bg-white rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">Payment details</p>
              <p className="text-xs text-gray-400">{address} · Due {dueDate}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">${parseFloat(payAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PayForm
                clientSecret={clientSecret}
                amountCents={Math.round(parseFloat(payAmount) * 100)}
                onSuccess={() => { setPaid(true); fetchData() }}
              />
            </Elements>
            <button onClick={() => setClientSecret(null)} className="w-full text-sm text-gray-400 py-2">
              ← Change amount
            </button>
          </>
        ) : (
          // Setup payment form
          <>
            <div className="bg-white rounded-xl p-4 space-y-4">
              <p className="text-sm font-semibold text-gray-900">New Payment</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Amount ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder={property.rent_amount ? property.rent_amount.toFixed(2) : '0.00'}
                    className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                </div>
                {property.rent_amount && (
                  <button
                    type="button"
                    onClick={() => setPayAmount(property.rent_amount.toFixed(2))}
                    className="text-xs text-[#1B3A6B] mt-1"
                  >
                    Use full rent: ${property.rent_amount.toLocaleString()}
                  </button>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Due date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                />
              </div>
              <button
                onClick={handleCreatePayment}
                disabled={creating}
                className="w-full bg-[#1B3A6B] text-white rounded-xl py-3.5 text-sm font-semibold disabled:opacity-50"
              >
                {creating ? 'Loading…' : 'Continue to Payment'}
              </button>
            </div>

            {/* Payment history */}
            {payments.length > 0 && (
              <div className="bg-white rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-900 mb-3">Payment History</p>
                <div className="space-y-2">
                  {payments.map(pmt => {
                    const cfg = STATUS_CONFIG[pmt.status] || STATUS_CONFIG.pending
                    return (
                      <div key={pmt.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            ${(pmt.amount_cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(pmt.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav role="tenant" />
    </div>
  )
}
