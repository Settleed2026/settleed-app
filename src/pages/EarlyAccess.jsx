// src/pages/EarlyAccess.jsx
// Early Access waiting list — captures landlords and tenants before full public launch

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, CheckCircle, ArrowRight, Users, Building2 } from 'lucide-react'

const LANDLORD_BENEFITS = [
  'Free to list — no subscription, no credit card',
  'Pre-screened voucher holders sent directly to you',
  'We track the RFTA and inspection process for you',
  'Fill vacancies faster than Zillow or Craigslist',
]

const TENANT_BENEFITS = [
  'Every listing accepts Housing Choice Vouchers',
  'No more calling 30 numbers to find one yes',
  'Apply directly — no middlemen',
  'Get notified the moment a new listing matches your voucher',
]

function SignupForm({ role, onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', zip: '', voucher_size: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isLandlord = role === 'landlord'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          zip: form.zip.trim() || null,
          voucher_size: isLandlord ? null : (form.voucher_size || null),
        }),
      })
      setLoading(false)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }
      onSuccess()
    } catch {
      setLoading(false)
      setError('Something went wrong. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {isLandlord ? 'Your name' : 'Your name'}
        </label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder={isLandlord ? 'James Williams' : 'Maria Johnson'}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Email address</label>
        <input
          type="email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          placeholder="you@example.com"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          ZIP code <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          value={form.zip}
          onChange={e => setForm(f => ({ ...f, zip: e.target.value }))}
          placeholder="30301"
          maxLength={10}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
        />
      </div>
      {!isLandlord && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Voucher bedroom size <span className="text-gray-400">(optional)</span>
          </label>
          <select
            value={form.voucher_size}
            onChange={e => setForm(f => ({ ...f, voucher_size: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] bg-white"
          >
            <option value="">Select bedroom size</option>
            <option value="0">Studio (0 BR)</option>
            <option value="1">1 Bedroom</option>
            <option value="2">2 Bedrooms</option>
            <option value="3">3 Bedrooms</option>
            <option value="4">4 Bedrooms</option>
            <option value="5">5+ Bedrooms</option>
          </select>
        </div>
      )}
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#1B3A6B] text-white font-semibold py-3.5 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading
          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <>Join the {isLandlord ? 'Founding Landlord' : 'Early Access'} List <ArrowRight className="w-4 h-4" /></>
        }
      </button>
    </form>
  )
}

function SuccessState({ role }) {
  const isLandlord = role === 'landlord'
  return (
    <div className="text-center py-6 space-y-3">
      <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-7 h-7 text-[#1D9E75]" />
      </div>
      <h3 className="font-bold text-gray-900 text-lg">You're on the list!</h3>
      <p className="text-sm text-gray-600 leading-relaxed">
        {isLandlord
          ? "We'll reach out within 48 hours to walk you through listing your first property. It takes about 10 minutes."
          : "We'll email you the moment new listings matching your voucher are available in Atlanta."}
      </p>
      {isLandlord && (
        <p className="text-xs text-gray-400">
          Want to list right now?{' '}
          <Link to="/signup?role=landlord" className="text-[#1B3A6B] font-semibold underline">
            Create your account →
          </Link>
        </p>
      )}
    </div>
  )
}

export default function EarlyAccess() {
  const [landlordDone, setLandlordDone] = useState(false)
  const [tenantDone, setTenantDone] = useState(false)
  const [activeTab, setActiveTab] = useState('landlord')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#1B3A6B] rounded-md flex items-center justify-center">
              <Home size={14} color="white" />
            </div>
            <span className="font-bold text-[#0D1B4B] text-sm">Settleed</span>
          </Link>
          <Link
            to="/listings"
            className="text-xs font-medium text-[#1B3A6B] border border-[#1B3A6B] px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Browse listings
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* Hero */}
        <div className="text-center space-y-3">
          <span className="inline-block bg-[#1D9E75]/10 text-[#1D9E75] text-xs font-semibold px-3 py-1 rounded-full">
            Early Access · Georgia
          </span>
          <h1 className="text-3xl font-bold text-[#0D1B4B] leading-tight">
            Georgia's Housing Choice Voucher<br />Program (Section 8) Marketplace
          </h1>
          <p className="text-gray-600 text-base leading-relaxed max-w-md mx-auto">
            Settleed connects landlords who accept Housing Choice Vouchers (Section 8) with pre-screened tenants — free for everyone during Early Access.
          </p>
        </div>

        {/* Tab toggle */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('landlord')}
              className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'landlord'
                  ? 'bg-[#1B3A6B] text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Building2 className="w-4 h-4" /> I'm a Landlord
            </button>
            <button
              onClick={() => setActiveTab('tenant')}
              className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'tenant'
                  ? 'bg-[#1D9E75] text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users className="w-4 h-4" /> I'm a Tenant
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Benefits */}
            <ul className="space-y-2.5">
              {(activeTab === 'landlord' ? LANDLORD_BENEFITS : TENANT_BENEFITS).map(b => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-[#1D9E75] mt-0.5 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>

            <hr className="border-gray-100" />

            {/* Form or success */}
            {activeTab === 'landlord' ? (
              landlordDone
                ? <SuccessState role="landlord" />
                : <SignupForm role="landlord" onSuccess={() => setLandlordDone(true)} />
            ) : (
              tenantDone
                ? <SuccessState role="tenant" />
                : <SignupForm role="tenant" onSuccess={() => setTenantDone(true)} />
            )}
          </div>
        </div>

        {/* Social proof line */}
        <p className="text-center text-xs text-gray-400">
          Built by a former Atlanta Housing employee · Every listing is HCV-verified · Free to use
        </p>

        {/* Already have an account */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-[#1B3A6B] font-semibold">Sign in →</Link>
          </p>
          <p className="text-sm text-gray-500">
            Ready to list now?{' '}
            <Link to="/signup?role=landlord" className="text-[#1B3A6B] font-semibold">Create landlord account →</Link>
          </p>
        </div>

        {/* EHO */}
        <p className="text-center text-[10px] text-gray-400 pb-4">
          Equal Housing Opportunity · Settleed does not discriminate on the basis of race, color, religion, sex, national origin, disability, familial status, or source of income.
        </p>
      </div>
    </div>
  )
}
