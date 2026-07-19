import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getPaymentStandard } from '../../lib/paymentStandards'

const BEDROOMS = [
  { value: 0, label: 'Studio / 0 BR', people: '1 person' },
  { value: 1, label: '1 Bedroom', people: '1–2 people' },
  { value: 2, label: '2 Bedrooms', people: '2–4 people' },
  { value: 3, label: '3 Bedrooms', people: '4–6 people' },
  { value: 4, label: '4 Bedrooms', people: '6–8 people' },
]

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function parseDollar(str) {
  return parseInt(String(str).replace(/[^0-9]/g, ''), 10) || 0
}

export default function VoucherEstimator() {
  const [zip, setZip]         = useState('')
  const [bedrooms, setBedrooms] = useState(2)
  const [income, setIncome]   = useState('')
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')
  const [checked, setChecked] = useState(false)

  function reset() { setChecked(false); setResult(null); setError('') }

  function handleCalculate(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    setChecked(false)

    const z = zip.trim()
    if (!/^\d{5}$/.test(z)) { setError('Enter a valid 5-digit Georgia ZIP code.'); return }

    const annualIncome = parseDollar(income)
    if (!income || annualIncome < 1000) { setError('Enter your annual gross income.'); return }

    const ps = getPaymentStandard(z, Number(bedrooms))
    if (!ps) {
      setError('This ZIP code wasn\'t found in our database. It may be served by a smaller local housing authority — contact your PHA directly.')
      setChecked(true)
      return
    }

    const monthlyIncome   = annualIncome / 12
    const tenantPortion   = Math.round(monthlyIncome * 0.30)       // HUD standard: 30% of monthly income
    const paymentStd      = ps.maxRent
    const voucherCovers   = Math.max(0, paymentStd - tenantPortion) // can't go negative
    const yourMaxRent     = paymentStd                              // voucher covers gap up to standard

    // Eligibility check — Section 8 requires income at or below 50% AMI
    // Atlanta metro 50% AMI (2026 est.): 1p=$35,750 2p=$40,850 3p=$45,950 4p=$51,050 5p=$55,150
    // We use a rough 50% AMI of ~$51,000 for a 4-person household as the general ceiling
    // This is an estimate — actual limits vary by household size and county
    const approxLimit50pct = 55000 // conservative ceiling for tool purposes

    setResult({
      annualIncome,
      monthlyIncome: Math.round(monthlyIncome),
      tenantPortion,
      paymentStd,
      voucherCovers,
      yourMaxRent,
      county:  ps.county,
      phaName: ps.phaName,
      source:  ps.source,
      likelyEligible: annualIncome <= approxLimit50pct,
    })
    setChecked(true)
  }

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
          Browse Listings Free
        </Link>
      </nav>

      {/* Hero */}
      <div className="bg-[#1B3A6B] px-6 py-10 text-center">
        <p className="text-blue-200 text-xs font-semibold tracking-widest uppercase mb-2">Free Tool · Georgia Tenants</p>
        <h1 className="text-white text-3xl font-bold leading-tight mb-3">
          Voucher Estimator
        </h1>
        <p className="text-blue-100 text-sm leading-relaxed max-w-sm mx-auto">
          Enter your voucher size and income to see how much your Section 8 voucher could cover — and what rent you can realistically search for.
        </p>
      </div>

      {/* Form */}
      <div className="px-4 -mt-4 relative z-10">
        <form onSubmit={handleCalculate} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 max-w-lg mx-auto">

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Georgia ZIP Code you're searching in</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 30310"
              value={zip}
              onChange={e => { setZip(e.target.value.replace(/\D/g,'').slice(0,5)); reset() }}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#1B3A6B] transition-colors"
              maxLength={5}
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Your voucher bedroom size</label>
            <div className="grid grid-cols-1 gap-2">
              {BEDROOMS.map(b => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => { setBedrooms(b.value); reset() }}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    bedrooms === b.value
                      ? 'border-[#1B3A6B] bg-[#1B3A6B] text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{b.label}</span>
                  <span className={`text-xs ${bedrooms === b.value ? 'text-blue-200' : 'text-gray-400'}`}>{b.people}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Annual gross income reported to your housing authority
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="24,000"
                value={income}
                onChange={e => {
                  const v = e.target.value.replace(/[^0-9]/g, '')
                  setIncome(v ? Number(v).toLocaleString() : '')
                  reset()
                }}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pl-8 text-sm text-gray-900 outline-none focus:border-[#1B3A6B] transition-colors"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Enter the income you reported to your housing authority (before taxes)</p>
          </div>

          <button
            type="submit"
            className="w-full text-white font-semibold py-3 rounded-xl text-sm"
            style={{ backgroundColor: '#c96a2b' }}
          >
            Estimate My Voucher
          </button>
        </form>
      </div>

      {/* Result */}
      {checked && (
        <div className="px-4 mt-4 max-w-lg mx-auto w-full">
          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <p className="text-sm font-semibold text-amber-900 mb-1">⚠️ ZIP not found</p>
              <p className="text-sm text-amber-800">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              {/* Main result card */}
              <div className="bg-[#1B3A6B] rounded-2xl p-5 text-white">
                <p className="text-blue-200 text-xs font-semibold uppercase tracking-wide mb-4">Your estimated voucher breakdown</p>

                {/* Big number */}
                <div className="text-center mb-5">
                  <p className="text-blue-200 text-sm mb-1">Your rent search budget</p>
                  <p className="text-5xl font-bold text-white">{formatCurrency(result.yourMaxRent)}</p>
                  <p className="text-blue-300 text-sm mt-1">/month maximum</p>
                </div>

                {/* Breakdown */}
                <div className="bg-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-100">Payment standard ({result.county} County, {BEDROOMS.find(b=>b.value===Number(bedrooms))?.label})</span>
                    <span className="text-sm font-bold text-white">{formatCurrency(result.paymentStd)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-100">Your portion (30% of {formatCurrency(result.monthlyIncome)}/mo)</span>
                    <span className="text-sm font-semibold text-amber-300">– {formatCurrency(result.tenantPortion)}</span>
                  </div>
                  <div className="border-t border-white/20 pt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Voucher covers</span>
                    <span className="text-sm font-bold text-[#4ADE80]">{formatCurrency(result.voucherCovers)}/mo</span>
                  </div>
                </div>
              </div>

              {/* What this means */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <p className="text-sm font-semibold text-gray-900 mb-3">What this means for you</p>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>✓ Look for units priced at or below <strong>{formatCurrency(result.paymentStd)}/month</strong></p>
                  <p>✓ You'll pay approximately <strong>{formatCurrency(result.tenantPortion)}/month</strong> out of pocket</p>
                  <p>✓ Your housing authority pays the remaining <strong>{formatCurrency(result.voucherCovers)}</strong> directly to the landlord</p>
                  {result.voucherCovers === 0 && (
                    <p className="text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                      Your income means you'd pay the full rent yourself at this payment standard. You may still qualify — contact your housing authority.
                    </p>
                  )}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <p className="text-xs text-gray-500 leading-relaxed">
                  <strong>Estimate only.</strong> Actual voucher amount depends on your household size, deductions, and utility allowance. Your housing authority makes the final determination. This uses the{' '}
                  {result.source === 'safmr' ? 'HUD 2026 SAFMR' : 'Georgia DCA 2026'} payment standard for {result.county} County.
                </p>
              </div>

              {/* CTA */}
              <div className="bg-[#EBF9F4] border border-[#1D9E75] rounded-2xl p-5">
                <p className="text-[#116044] font-bold text-sm mb-1">
                  Now find homes in your budget on Settleed
                </p>
                <p className="text-[#1D9E75] text-sm mb-4">
                  Every listing accepts Section 8 vouchers. Search by ZIP and bedroom size right now — free.
                </p>
                <Link
                  to={`/signup?role=tenant&zip=${zip}&br=${bedrooms}`}
                  className="inline-block text-sm font-semibold text-white px-5 py-2.5 rounded-full"
                  style={{ backgroundColor: '#1D9E75' }}
                >
                  Find Homes in {formatCurrency(result.yourMaxRent)} Range →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* How it works */}
      <div className="px-4 mt-6 mb-6 max-w-lg mx-auto w-full">
        <h2 className="text-base font-bold text-gray-900 mb-4">How voucher payments work</h2>
        <div className="space-y-3">
          {[
            {
              step: '1',
              title: 'HUD sets the payment standard',
              body: 'Each housing authority sets a maximum rent by ZIP code and bedroom size. This is called the payment standard.',
            },
            {
              step: '2',
              title: 'You pay 30% of your income',
              body: 'By federal law, Section 8 tenants pay approximately 30% of their monthly adjusted income toward rent. The voucher covers the rest.',
            },
            {
              step: '3',
              title: 'Your voucher covers the gap',
              body: 'The housing authority pays the difference between your portion and the rent directly to the landlord — up to the payment standard.',
            },
            {
              step: '4',
              title: 'Units must meet the standard',
              body: 'The landlord\'s asking rent must be at or below the payment standard for a voucher to work. Settleed only shows voucher-accepted listings.',
            },
          ].map(item => (
            <div key={item.step} className="bg-white rounded-xl p-4 border border-gray-100 flex gap-3">
              <div className="w-7 h-7 rounded-full bg-[#1B3A6B] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{item.step}</div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-0.5">{item.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Other tools */}
      <div className="px-4 mb-8 max-w-lg mx-auto w-full">
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">More free tools</p>
          <Link to="/tools/rent-analyzer" className="flex items-center justify-between py-2 group">
            <div>
              <p className="text-sm font-semibold text-gray-900">Georgia Rent Analyzer</p>
              <p className="text-xs text-gray-500">Check if a specific rental is within the payment standard</p>
            </div>
            <span className="text-[#1B3A6B] text-sm group-hover:translate-x-1 transition-transform">→</span>
          </Link>
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
