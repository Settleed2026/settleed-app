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

  const [form, setForm] = useState({
    housing_authority: '',
    voucher_size: '',
    voucher_expiration: '',
    household_size: '',
    desired_move_in: '',
    message: '',
  })

  useEffect(() => {
    async function fetchListing() {
      const { data } = await supabase
        .from('properties')
        .select('id, neighborhood, zip_code, bedrooms, rent_amount, photos')
        .eq('id', id)
        .single()
      setListing(data)
      setLoading(false)
    }
    fetchListing()
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
      if (error.code === '23505') toast.error('You already applied to this listing')
      else toast.error(error.message)
      setSubmitting(false)
      return
    }

    toast.success('Application sent!')
    navigate('/tenant')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-[#1B3A6B] px-4 pt-10 pb-5 h-20 animate-pulse" />
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

      <form onSubmit={handleSubmit} className="px-4 mt-4 space-y-5">
        <div className="bg-white rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-sm text-gray-900">Your Voucher</h2>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Housing authority that issued your voucher *</label>
            <select name="housing_authority" required value={form.housing_authority} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
              <option value="">Select housing authority...</option>
              {HOUSING_AUTHORITIES.map(ha => (
                <option key={ha.value} value={ha.value}>{ha.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Voucher size (bedrooms) *</label>
              <select name="voucher_size" required value={form.voucher_size} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                <option value="">Select</option>
                {[0,1,2,3,4,5].map(n => (
                  <option key={n} value={n}>{n === 0 ? 'Studio (0BR)' : `${n} BR`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Voucher expires</label>
              <input name="voucher_expiration" type="date" value={form.voucher_expiration} onChange={handleChange}
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
              <label className="text-xs text-gray-500 mb-1 block">Household size</label>
              <select name="household_size" value={form.household_size} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                <option value="">Select</option>
                {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} person{n !== 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Desired move-in</label>
              <input name="desired_move_in" type="date" value={form.desired_move_in} onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-sm text-gray-900 mb-2">
            Message to landlord <span className="text-gray-400 font-normal">(optional)</span>
          </h2>
          <textarea name="message" value={form.message} onChange={handleChange} rows={4}
            placeholder="Introduce yourself and explain why you're interested in this unit..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] resize-none" />
          <p className="text-xs text-gray-400 mt-1">Tip: landlords respond faster when you include a brief intro.</p>
        </div>

        <button type="submit" disabled={submitting}
          className="w-full bg-[#1D9E75] text-white rounded-xl py-4 font-semibold text-sm disabled:opacity-50 shadow-lg shadow-[#1D9E75]/20">
          {submitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </div>
  )
}
