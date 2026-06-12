import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { checkRentEligibility } from '../../lib/paymentStandards'
import toast from 'react-hot-toast'
import { ChevronLeft, Upload, X } from 'lucide-react'

const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME

export default function ListingForm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [form, setForm] = useState({
    neighborhood: '',
    street_address: '',
    zip_code: '',
    bedrooms: '',
    bathrooms: '',
    square_feet: '',
    rent_amount: '',
    deposit_amount: '',
    available_date: '',
    description: '',
    ha_accepted: ['AHA', 'DCA', 'other'],
    credit_friendly: false,
    move_in_special: '',
    status: 'active',
  })
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isEditing) fetchListing()
  }, [id])

  async function fetchListing() {
    const { data } = await supabase.from('properties').select('*').eq('id', id).single()
    if (data) {
      setForm({
        neighborhood: data.neighborhood || '',
        street_address: data.street_address || '',
        zip_code: data.zip_code || '',
        bedrooms: data.bedrooms || '',
        bathrooms: data.bathrooms || '',
        square_feet: data.square_feet || '',
        rent_amount: data.rent_amount || '',
        deposit_amount: data.deposit_amount || '',
        available_date: data.available_date || '',
        description: data.description || '',
        ha_accepted: data.ha_accepted || ['AHA', 'DCA', 'other'],
        credit_friendly: data.credit_friendly || false,
        move_in_special: data.move_in_special || '',
        status: data.status || 'active',
      })
      setPhotos(data.photos || [])
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  function toggleHA(ha) {
    setForm(prev => ({
      ...prev,
      ha_accepted: prev.ha_accepted.includes(ha)
        ? prev.ha_accepted.filter(h => h !== ha)
        : [...prev.ha_accepted, ha]
    }))
  }

  async function uploadPhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'settleed_listings')

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.secure_url) {
        setPhotos(prev => [...prev, data.secure_url])
      }
    } catch {
      toast.error('Photo upload failed')
    }
    setUploading(false)
  }

  function removePhoto(url) {
    setPhotos(prev => prev.filter(p => p !== url))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    const payload = {
      ...form,
      landlord_id: user.id,
      market: 'atlanta',
      photos,
      bedrooms: parseInt(form.bedrooms),
      bathrooms: parseFloat(form.bathrooms),
      square_feet: form.square_feet ? parseInt(form.square_feet) : null,
      rent_amount: parseFloat(form.rent_amount),
      deposit_amount: form.deposit_amount ? parseFloat(form.deposit_amount) : null,
    }

    if (isEditing) {
      const { error } = await supabase.from('properties').update(payload).eq('id', id)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Listing updated')
    } else {
      const { error } = await supabase.from('properties').insert(payload)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Listing created')
    }

    navigate('/landlord')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-5 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white text-lg font-bold">{isEditing ? 'Edit listing' : 'New listing'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pt-5 space-y-5">

        {/* Photos */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-sm text-gray-900 mb-3">Photos</h2>
          <div className="flex gap-2 flex-wrap">
            {photos.map(url => (
              <div key={url} className="relative w-20 h-20">
                <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                <button type="button" onClick={() => removePhoto(url)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:border-[#1B3A6B]">
              {uploading ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-5 h-5" />}
              <input type="file" accept="image/*" onChange={uploadPhoto} className="hidden" />
            </label>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-sm text-gray-900">Location</h2>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Neighborhood (shown to tenants)</label>
            <input name="neighborhood" required value={form.neighborhood} onChange={handleChange}
              placeholder="e.g. East Atlanta" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Full street address (hidden until matched)</label>
            <input name="street_address" value={form.street_address} onChange={handleChange}
              placeholder="123 Main St" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">ZIP code</label>
            <input name="zip_code" required value={form.zip_code} onChange={handleChange}
              placeholder="30316" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
          </div>
        </div>

        {/* Unit details */}
        <div className="bg-white rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-sm text-gray-900">Unit details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Bedrooms</label>
              <select name="bedrooms" required value={form.bedrooms} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                <option value="">Select</option>
                {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n === 0 ? 'Studio' : `${n} BR`}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Bathrooms</label>
              <select name="bathrooms" required value={form.bathrooms} onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                <option value="">Select</option>
                {[1, 1.5, 2, 2.5, 3, 3.5, 4].map(n => <option key={n} value={n}>{n} BA</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Monthly rent ($)</label>
              <input name="rent_amount" type="number" required value={form.rent_amount} onChange={handleChange}
                placeholder="1200" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Deposit ($)</label>
              <input name="deposit_amount" type="number" value={form.deposit_amount} onChange={handleChange}
                placeholder="1200" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
            </div>
          </div>
          {/* Payment standard badge */}
          {(() => {
            const ps = form.zip_code?.length === 5 && form.bedrooms !== '' && form.rent_amount
              ? checkRentEligibility(form.zip_code, parseInt(form.bedrooms), parseFloat(form.rent_amount))
              : null
            if (!ps) return null
            return (
              <div className={`rounded-lg px-3 py-2.5 text-xs ${ps.withinStandard ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {ps.withinStandard
                  ? `✓ Within ${ps.regionLabel} payment standard — max rent for this zip is $${ps.maxRent.toLocaleString()}`
                  : `⚠ Above ${ps.regionLabel} payment standard by $${ps.overBy} — DCA vouchers max out at $${ps.maxRent.toLocaleString()} here`
                }
                <span className="ml-1 text-gray-400">({ps.county} County)</span>
              </div>
            )
          })()}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Available date</label>
            <input name="available_date" type="date" value={form.available_date} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
          </div>
        </div>

        {/* Section 8 details */}
        <div className="bg-white rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-sm text-gray-900">Section 8 details</h2>
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Housing authorities accepted</label>
            <div className="flex gap-2">
              {['AHA', 'DCA', 'other'].map(ha => (
                <button key={ha} type="button" onClick={() => toggleHA(ha)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.ha_accepted.includes(ha) ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200'
                  }`}>
                  {ha}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="credit_friendly" checked={form.credit_friendly} onChange={handleChange} className="w-4 h-4 accent-[#1B3A6B]" />
            <span className="text-sm text-gray-700">Credit friendly</span>
          </label>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Move-in special (optional)</label>
            <input name="move_in_special" value={form.move_in_special} onChange={handleChange}
              placeholder="e.g. First month free" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl p-4">
          <label className="text-xs text-gray-500 mb-1 block">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={4}
            placeholder="Describe the unit, amenities, neighborhood..." className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] resize-none" />
        </div>

        {/* Status (editing only) */}
        {isEditing && (
          <div className="bg-white rounded-xl p-4">
            <label className="text-xs text-gray-500 mb-1 block">Listing status</label>
            <select name="status" value={form.status} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="rented">Rented</option>
            </select>
          </div>
        )}

        <button type="submit" disabled={saving}
          className="w-full bg-[#1B3A6B] text-white rounded-xl py-4 font-semibold text-sm disabled:opacity-50">
          {saving ? 'Saving...' : isEditing ? 'Update listing' : 'Publish listing'}
        </button>
      </form>
    </div>
  )
}
