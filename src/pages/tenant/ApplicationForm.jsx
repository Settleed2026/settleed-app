import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { HOUSING_AUTHORITIES } from '../../lib/paymentStandards'
import toast from 'react-hot-toast'
import { ChevronLeft } from 'lucide-react'

export default function ApplicationForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [alreadyApplied, setAlreadyApplied] = useState(false)

  const [form, setForm] = useState({
    housing_authority: '',
    voucher_size: '',
    voucher_expiration: '',
    household_size: '',
    desired_move_in: '',
    message: '',
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const [listingRes, dupeRes] = await Promise.all([
          supabase
            .from('properties')
            .select('id, neighborhood, zip_code, bedrooms, rent_amount, photos')
            .eq('id', id)
            .single(),
          supabase
            .from('applications')
            .select('id')
            .eq('property_id', id)
            .eq('tenant_id', user.id)
            .maybeSingle(),
        ])
        if (listingRes.error) console.error('ApplicationForm listing fetch error:', listingRes.error.message)
        setListing(listingRes.data || null)
        if (dupeRes.data) setAlreadyApplied(true)
      } catch (err) {
        console.error('ApplicationForm fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.housing_authority) { toast.error('Please select your housing authority'); return }
    if (!form.voucher_size) { toast.error('Please enter your voucher bedroom size'); return }

    setSubmitting(true)
    const { error } = await supabase.from('applications').insert({
      property_id: id,
      tenant_id: user.id,
      housing_authority: form.housing_authority,
      voucher_size: parseInt(form.voucher_size),
      voucher_expiration: form.voucher_expiration || null,
      household_size: form.household_size ? parseInt(form.household_size) : null,
      desired_move_in: form.desired_move_in || null,
      message: form.message || null,
      status: 'pending',
    })

    if (error) {
      if (error.code === '23505') {
        setAlreadyApplied(true)
      } else {
        toast.error(error.message)
      }
      setSubmitting(false)
      return
    }

    // Notify landlord — fire-and-forget
    if (listing) {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: tenantProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          type: 'new_application',
          payload: {
            landlord_id: listing.landlord_id || null,
            tenant_name: tenantProfile?.full_name || user.email,
            property_address: `${listing.neighborhood}${listing.zip_code ? `, ${listing.zip_code}` : ''}`,
          },
        }),
      }).catch(() => {})
    }

    setSubmitted(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-[#1B3A6B] px-4 pt-10 pb-5 h-20 animate-pulse" />
      </div>
    )
  }

  // ── Confirmation screen ──────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 pb-10">
        <div className="bg-[#1B3A6B] px-4 pt-10 pb-5 flex items-center gap-3">
          <h1 className="text-white text-lg font-bold">Application Sent</h1>
        </div>
        <div className="mx-4 mt-8 bg-white rounded-2xl p-6 flex flex-col items-center text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#EBF9F4] flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">You're in the running!</h2>
          <p className="text-sm text-gray-500 mb-1">
            Your application for{' '}
            <span className="font-semibold text-gray-700">{listing?.neighborhood}</span>{' '}
            has been sent to the landlord.
          </p>
          <p className="text-xs text-gray-400 mb-6">Most landlords respond within 1–3 business days.</p>
          <button
            onClick={() => navigate('/tenant/applications')}
            className="w-full bg-[#1D9E75] text-white rounded-xl py-3 font-semibold text-sm mb-3"
          >
            View My Applications
          </button>
          <button
            onClick={() => navigate('/tenant/search')}
            className="w-full border border-gray-200 text-gray-600 rounded-xl py-3 font-semibold text-sm"
          >
            Keep Searching
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-6 px-4">
          We'll notify you by email when the landlord responds.
        </p>
      </div>
    )
  }

  const beds = listing?.bedrooms === 0 ? 'Studio' : `${listing?.bedrooms} BR`
  const photo = listing?.photos?.[0]

  const daysLeft = form.voucher_expiration
    ? Math.ceil((new Date(form.voucher_expiration) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-5 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white text-lg font-bold">Apply</h1>
      </div>

      {listing && (
        <div className="mx-4 mt-4 bg-white rounded-xl p-3 flex items-center gap-3">
          {photo
            ? <img src={photo} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
            : <div className="w-14 h-14 rounded-lg bg-gray-100 shrink-0" />
          }
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{listing.neighborhood}</p>
            <p className="text-xs text-gray-500">{beds} · {listing.zip_code}</p>
            <p className="text-sm font-bold text-[#1B3A6B] mt-0.5">${listing.rent_amount?.toLocaleString()}/mo</p>
          </div>
        </div>
      )}

      {alreadyApplied && (
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-amber-500 text-lg leading-none mt-0.5">⚠</span>
          <div>
            <p className="text-sm font-semibold text-amber-900">You already applied to this listing</p>
            <p className="text-xs text-amber-700 mt-0.5">You can't submit another application for the same unit. Check your applications for the status.</p>
            <button
              onClick={() => navigate('/tenant/applications')}
              className="mt-2 text-xs font-semibold text-amber-800 underline"
            >
              View my applications →
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="px-4 mt-4 space-y-5">
        <div className="bg-white rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-sm text-gray-900">Your Voucher</h2>

          <div>
            <label htmlFor="housing_authority" className="text-xs text-gray-500 mb-1 block">Housing authority that issued your voucher *</label>
            <select id="housing_authority" name="housing_authority" required value={form.housing_authority} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
              <option value="">Select housing authority...</option>
              {HOUSING_AUTHORITIES.map(ha => (
                <option key={ha.value} value={ha.value}>{ha.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="voucher_size" className="text-xs text-gray-500 mb-1 block">Voucher size (bedrooms) *</label>
              <select id="voucher_size" name="voucher_size" required value={form.voucher_size} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                <option value="">Select</option>
                {[0,1,2,3,4,5].map(n => (
                  <option key={n} value={n}>{n === 0 ? 'Studio (0BR)' : `${n} BR`}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="voucher_expiration" className="text-xs text-gray-500 mb-1 block">Voucher expires</label>
              <input id="voucher_expiration" name="voucher_expiration" type="date" value={form.voucher_expiration} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
            </div>
          </div>

          {daysLeft !== null && daysLeft <= 60 && (
            <div className={`rounded-lg px-3 py-2.5 text-xs font-medium ${daysLeft <= 30 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
              {daysLeft <= 30
                ? `⚠ Voucher expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — apply quickly!`
                : `⏱ ${daysLeft} days remaining on your voucher`}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-sm text-gray-900">Household</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="household_size" className="text-xs text-gray-500 mb-1 block">Household size</label>
              <select id="household_size" name="household_size" value={form.household_size} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                <option value="">Select</option>
                {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} person{n !== 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="desired_move_in" className="text-xs text-gray-500 mb-1 block">Desired move-in</label>
              <input id="desired_move_in" name="desired_move_in" type="date" value={form.desired_move_in} onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4">
          <label htmlFor="message" className="font-semibold text-sm text-gray-900 mb-2 block">
            Message to landlord <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea id="message" name="message" value={form.message} onChange={handleChange} rows={4}
            maxLength={500}
            placeholder="Introduce yourself and explain why you're interested in this unit..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] resize-none" />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-400">Tip: landlords respond faster when you include a brief intro.</p>
            <p className={`text-xs ${form.message.length >= 480 ? 'text-amber-500 font-medium' : 'text-gray-400'}`}>
              {form.message.length}/500
            </p>
          </div>
        </div>

        <button type="submit" disabled={submitting || alreadyApplied}
          className="w-full bg-[#1D9E75] text-white rounded-xl py-4 font-semibold text-sm disabled:opacity-50 shadow-lg shadow-[#1D9E75]/20">
          {submitting ? 'Submitting...' : alreadyApplied ? 'Already Applied' : 'Submit Application'}
        </button>
      </form>
    </div>
  )
}
