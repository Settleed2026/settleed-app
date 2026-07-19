import { useState } from 'react'
import { Link } from 'react-router-dom'
import { checkRentEligibility } from '../../lib/paymentStandards'

const BEDROOMS = [
  { value: 0, label: 'Studio / 0 BR' },
  { value: 1, label: '1 Bedroom' },
  { value: 2, label: '2 Bedrooms' },
  { value: 3, label: '3 Bedrooms' },
  { value: 4, label: '4 Bedrooms' },
]

const PHA_CONTACTS = {
  MHA:   { name: 'Marietta Housing Authority', url: 'https://www.mariettahousingauthority.org', phone: '(770) 419-3200' },
  HADC:  { name: 'Housing Authority of DeKalb County', url: 'https://www.dekalbhousing.org', phone: '(404) 270-2500' },
  DCA_N: { name: 'Georgia DCA — Northern Region', url: 'https://www.dca.ga.gov/safe-affordable-housing/rental-housing-assistance/housing-choice-voucher-hcv-program', phone: '(404) 679-4840' },
  DCA_S: { name: 'Georgia DCA — Southern Region', url: 'https://www.dca.ga.gov/safe-affordable-housing/rental-housing-assistance/housing-choice-voucher-hcv-program', phone: '(404) 679-4840' },
}

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function RentAnalyzer() {
  const [zip, setZip]         = useState('')
  const [bedrooms, setBedrooms] = useState(2)
  const [rent, setRent]       = useState('')
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')
  const [checked, setChecked] = useState(false)

  function handleCheck(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    setChecked(false)

    const z = zip.trim()
    if (!/^\d{5}$/.test(z)) {
      setError('Enter a valid 5-digit Georgia ZIP code.')
      return
    }
    const rentNum = parseInt(rent.replace(/[^0-9]/g, ''), 10)
    if (!rent || isNaN(rentNum) || rentNum < 100) {
      setError('Enter a valid monthly rent amount.')
      return
    }

    const r = checkRentEligibility(z, Number(bedrooms), rentNum)
    if (!r) {
      setError('This ZIP code wasn\'t found in our Georgia database. It may be served by a local housing authority not yet in our system — check with your local PHA directly.')
      setChecked(true)
      return
    }

    setResult({ ...r, rent: rentNum })
    setChecked(true)
  }

  function handleZipChange(e) {
    const v = e.target.value.replace(/\D/g, '').slice(0, 5)
    setZip(v)
    if (checked) { setChecked(false); setResult(null); setError('') }
  }

  const phaContact = result ? PHA_CONTACTS[result.pha] : null

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f7f3ee' }}>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 3L3 12h3v12h6v-7h4v7h6V12h3L14 3z" fill="#c96a2b"/>
          </svg>
          <span className="text-xl font-bold text-gray-900 tracking-tight">Settleed</span>
        </Link>
        <Link to="/signup?role=tenant" className="text-sm font-semibold text-white px-4 py-2 rounded-full" style={{ backgroundColor: '#c96a2b' }}>
          Get Started Free
        </Link>
      </nav>

      {/* Hero */}
      <div className="bg-[#1B3A6B] px-6 py-10 text-center">
        <p className="text-blue-200 text-xs font-semibold tracking-widest uppercase mb-2">Free Tool · All of Georgia</p>
        <h1 className="text-white text-3xl font-bold leading-tight mb-3">
          Georgia Section 8<br />Rent Analyzer
        </h1>
        <p className="text-blue-100 text-sm leading-relaxed max-w-sm mx-auto">
          Find out if a rental unit's price falls within the Section 8 payment standard for your ZIP code — before you apply.
        </p>
      </div>

      {/* Form card */}
      <div className="px-4 -mt-4 relative z-10">
        <form onSubmit={handleCheck} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 max-w-lg mx-auto">

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Georgia ZIP Code</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 30310"
              value={zip}
              onChange={handleZipChange}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#1B3A6B] transition-colors"
              maxLength={5}
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Bedroom Size</label>
            <select
              value={bedrooms}
              onChange={e => { setBedrooms(e.target.value); if (checked) { setChecked(false); setResult(null); setError('') } }}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#1B3A6B] transition-colors bg-white"
            >
              {BEDROOMS.map(b => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Monthly Rent ($)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="1,200"
                value={rent}
                onChange={e => {
                  const v = e.target.value.replace(/[^0-9]/g, '')
                  setRent(v ? Number(v).toLocaleString() : '')
                  if (checked) { setChecked(false); setResult(null); setError('') }
                }}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pl-8 text-sm text-gray-900 outline-none focus:border-[#1B3A6B] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full text-white font-semibold py-3 rounded-xl text-sm transition-opacity"
            style={{ backgroundColor: '#1B3A6B' }}
          >
            Check Eligibility
          </button>
        </form>
      </div>

      {/* Result */}
      {checked && (
        <div className="px-4 mt-4 max-w-lg mx-auto w-full">
          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-amber-900 mb-1">ZIP code not found</p>
                  <p className="text-sm text-amber-800 leading-relaxed">{error}</p>
                  <a
                    href="https://www.hud.gov/program_offices/public_indian_housing/pha/contacts/ga"
                    target="_blank" rel="noopener noreferrer"
                    className="inline-block mt-3 text-xs font-semibold text-amber-900 underline"
                  >
                    Find your local Georgia PHA →
                  </a>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className={`rounded-2xl border-2 p-5 ${result.withinStandard ? 'bg-[#EBF9F4] border-[#1D9E75]' : 'bg-red-50 border-red-300'}`}>
              {/* Header */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{result.withinStandard ? '✅' : '❌'}</span>
                <div>
                  <p className={`font-bold text-base ${result.withinStandard ? 'text-[#116044]' : 'text-red-800'}`}>
                    {result.withinStandard ? 'Within the payment standard' : 'Exceeds the payment standard'}
                  </p>
                  <p className={`text-xs ${result.withinStandard ? 'text-[#1D9E75]' : 'text-red-600'}`}>
                    {result.county} County · {BEDROOMS.find(b => b.value === Number(bedrooms))?.label}
                  </p>
                </div>
              </div>

              {/* Rent comparison */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Your Rent</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(result.rent)}</p>
                  <p className="text-xs text-gray-400">/month</p>
                </div>
                <div className={`rounded-xl p-4 text-center ${result.withinStandard ? 'bg-[#1D9E75]' : 'bg-red-500'}`}>
                  <p className="text-xs text-white/80 mb-1">Max Payment Standard</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(result.maxRent)}</p>
                  <p className="text-xs text-white/70">/month</p>
                </div>
              </div>

              {/* Verdict */}
              {result.withinStandard ? (
                <div className="bg-white rounded-xl px-4 py-3 mb-4">
                  <p className="text-sm text-[#116044] leading-relaxed">
                    <strong>Good news!</strong> This rent of {formatCurrency(result.rent)} is{' '}
                    <strong>{formatCurrency(result.maxRent - result.rent)} below</strong> the maximum payment standard for this ZIP code.
                    A voucher holder could potentially rent this unit.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl px-4 py-3 mb-4">
                  <p className="text-sm text-red-700 leading-relaxed">
                    This rent exceeds the payment standard by <strong>{formatCurrency(result.overBy)}/month</strong>.
                    The tenant would need to cover the difference, or the landlord would need to lower the rent to qualify.
                  </p>
                </div>
              )}

              {/* PHA info */}
              {phaContact && (
                <div className="bg-white rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Administered by</p>
                  <p className="text-sm font-semibold text-gray-900">{phaContact.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">{phaContact.phone}</span>
                    <a href={phaContact.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[#1B3A6B] font-semibold">Visit website →</a>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    {result.source === 'safmr'
                      ? 'Based on HUD 2026 Small Area Fair Market Rents (SAFMRs). Actual payment standard may be 90–110% of this value.'
                      : 'Based on Georgia DCA 2026 payment standards. Actual standards may vary by unit type.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="px-4 mt-6 mb-6 max-w-lg mx-auto w-full">
        <div className="bg-[#1B3A6B] rounded-2xl p-5">
          <p className="text-white font-bold text-base mb-1">Find Section 8 homes on Settleed</p>
          <p className="text-blue-200 text-sm mb-4 leading-relaxed">
            Every listing on Settleed already accepts Housing Choice Vouchers — no guessing, no wasted calls.
          </p>
          <Link
            to="/signup?role=tenant"
            className="inline-block text-sm font-semibold bg-[#c96a2b] text-white px-5 py-2.5 rounded-full"
          >
            Browse Listings Free →
          </Link>
        </div>
      </div>

      {/* How it works */}
      <div className="px-4 mb-8 max-w-lg mx-auto w-full">
        <h2 className="text-base font-bold text-gray-900 mb-4">How Section 8 rent limits work</h2>
        <div className="space-y-3">
          {[
            {
              q: 'What is a payment standard?',
              a: 'The payment standard is the maximum amount your housing authority will pay for rent + utilities. It\'s set at the ZIP code level and varies by bedroom size.',
            },
            {
              q: 'Can a landlord charge more than the standard?',
              a: 'Yes, but the tenant pays the difference out of pocket — and tenants can\'t pay more than 40% of their income at move-in. Most landlords keep rents at or below the standard so they don\'t lose applicants.',
            },
            {
              q: 'Does this include utilities?',
              a: 'Payment standards cover rent + utilities. If utilities are included in rent, the full standard applies. If utilities are separate, the housing authority subtracts a utility allowance.',
            },
            {
              q: 'What if my ZIP isn\'t in the tool?',
              a: 'Some ZIP codes are served by smaller local housing authorities not yet in our database. Contact HUD\'s office or your local PHA directly for their current standards.',
            },
          ].map(item => (
            <div key={item.q} className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-sm font-semibold text-gray-900 mb-1">{item.q}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Coverage note */}
      {/* Other tools */}
      <div className="px-4 mb-4 max-w-lg mx-auto w-full">
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">More free tools</p>
          <Link to="/tools/voucher-estimator" className="flex items-center justify-between py-2 group">
            <div>
              <p className="text-sm font-semibold text-gray-900">Voucher Estimator</p>
              <p className="text-xs text-gray-500">See how much your voucher covers based on your income</p>
            </div>
            <span className="text-[#1B3A6B] text-sm group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      </div>

      <div className="px-4 mb-8 max-w-lg mx-auto w-full">
        <div className="bg-white rounded-2xl px-5 py-4 border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Data Coverage</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            This tool covers <strong>all 159 Georgia counties</strong> using Georgia DCA 2026 payment standards for state-administered areas,
            plus HUD 2026 Small Area Fair Market Rents (SAFMRs) for <strong>Cobb County (Marietta Housing Authority)</strong> and{' '}
            <strong>DeKalb County (HADC)</strong>. Atlanta city zips use Georgia DCA Fulton County standards.
            Payment standards for AHA (Atlanta Housing Authority) participants may differ — contact AHA directly at (404) 892-4700.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-between text-xs text-gray-400">
        <span>© 2026 Settleed · Atlanta, GA</span>
        <div className="flex gap-4">
          <Link to="/privacy" className="hover:text-gray-600">Privacy</Link>
          <Link to="/terms" className="hover:text-gray-600">Terms</Link>
        </div>
      </div>
    </div>
  )
}
