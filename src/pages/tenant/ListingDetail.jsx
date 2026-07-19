import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { checkRentEligibility } from '../../lib/paymentStandards'
import { ChevronLeft, BedDouble, Bath, Ruler, Heart, Share2, ChevronRight } from 'lucide-react'

const HA_LABELS = {
  AHA: 'Atlanta Housing (AHA)',
  DCA: 'Georgia DCA',
  COBB: 'Cobb County HA',
  DEKALB: 'DeKalb County HA',
  other: 'Other HAs',
}

export default function ListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function fetchListing() {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('id', id)
          .single()
        if (error) console.error('Listing fetch error:', error.message)
        setListing(data || null)
      } catch (err) {
        console.error('Listing fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchListing()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-[#1B3A6B] px-4 pt-10 pb-5 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white"><ChevronLeft className="w-6 h-6" /></button>
          <div className="h-5 bg-white/20 rounded w-32 animate-pulse" />
        </div>
        <div className="h-64 bg-gray-200 animate-pulse" />
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-gray-500">Listing not found.</p>
        <button onClick={() => navigate('/tenant/search')} className="mt-3 text-[#1B3A6B] font-medium">Back to search</button>
      </div>
    )
  }

  const photos = listing.photos || []
  const beds = listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} BR`
  const ps = checkRentEligibility(listing.zip_code, listing.bedrooms, listing.rent_amount)
  const availableDate = listing.available_date ? new Date(listing.available_date) : null
  const availableNow = !availableDate || availableDate <= new Date()

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-white flex items-center gap-1">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Search</span>
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => setSaved(p => !p)} className={saved ? 'text-red-400' : 'text-white'}>
            <Heart className="w-5 h-5" fill={saved ? 'currentColor' : 'none'} />
          </button>
          <button className="text-white"><Share2 className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="relative h-64 bg-gray-200">
        {photos.length > 0 ? (
          <>
            <img src={photos[photoIdx]} alt="" className="w-full h-full object-cover" />
            {photos.length > 1 && (
              <>
                <button onClick={() => setPhotoIdx(p => (p - 1 + photos.length) % photos.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPhotoIdx(p => (p + 1) % photos.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                  {photos.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === photoIdx ? 'bg-white' : 'bg-white/40'}`} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <BedDouble className="w-16 h-16" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-[#1D9E75] text-white text-xs font-semibold px-2.5 py-1 rounded-full">Vouchers OK</span>
          {listing.credit_friendly && (
            <span className="bg-white text-[#1B3A6B] text-xs font-semibold px-2.5 py-1 rounded-full">Credit Friendly</span>
          )}
        </div>
        <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
          {photoIdx + 1} / {Math.max(photos.length, 1)}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold text-gray-900">${listing.rent_amount?.toLocaleString()}</span>
              <span className="text-sm text-gray-500">/month</span>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${availableNow ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
              {availableNow ? 'Available Now' : `Avail. ${availableDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
            </span>
          </div>
          {ps && (
            <div className={`mt-3 rounded-lg px-3 py-2.5 text-xs ${ps.withinStandard ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              {ps.withinStandard
                ? `✓ Within ${ps.regionLabel} payment standard — max $${ps.maxRent.toLocaleString()} for this ZIP`
                : `⚠ $${ps.overBy.toLocaleString()} above ${ps.regionLabel} payment standard — max is $${ps.maxRent.toLocaleString()}`}
              <span className="ml-1 text-gray-400">({ps.county} County)</span>
            </div>
          )}
          <div className="mt-3 text-sm text-gray-700 font-medium">{listing.neighborhood} · {listing.zip_code}</div>
        </div>

        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-sm text-gray-900 mb-3">Unit Details</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-1 bg-gray-50 rounded-lg py-3">
              <BedDouble className="w-5 h-5 text-[#1B3A6B]" />
              <span className="text-sm font-semibold text-gray-900">{beds}</span>
              <span className="text-xs text-gray-500">Bedrooms</span>
            </div>
            <div className="flex flex-col items-center gap-1 bg-gray-50 rounded-lg py-3">
              <Bath className="w-5 h-5 text-[#1B3A6B]" />
              <span className="text-sm font-semibold text-gray-900">{listing.bathrooms} BA</span>
              <span className="text-xs text-gray-500">Bathrooms</span>
            </div>
            {listing.square_feet && (
              <div className="flex flex-col items-center gap-1 bg-gray-50 rounded-lg py-3">
                <Ruler className="w-5 h-5 text-[#1B3A6B]" />
                <span className="text-sm font-semibold text-gray-900">{listing.square_feet.toLocaleString()}</span>
                <span className="text-xs text-gray-500">Sq ft</span>
              </div>
            )}
          </div>
          {listing.deposit_amount && (
            <p className="mt-3 text-xs text-gray-500">
              Security deposit: <span className="font-semibold text-gray-700">${listing.deposit_amount.toLocaleString()}</span>
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-sm text-gray-900 mb-3">Section 8 Details</h2>
          <div>
            <p className="text-xs text-gray-500 mb-2">Accepted Housing Authorities</p>
            <div className="flex gap-2 flex-wrap">
              {(listing.ha_accepted || []).map(ha => (
                <span key={ha} className="bg-[#1B3A6B]/10 text-[#1B3A6B] text-xs font-medium px-2.5 py-1 rounded-full">
                  {HA_LABELS[ha] || ha}
                </span>
              ))}
            </div>
          </div>
          {listing.move_in_special && (
            <div className="mt-3 bg-amber-50 rounded-lg px-3 py-2.5 text-xs text-amber-800">
              🎁 <span className="font-semibold">Move-in special:</span> {listing.move_in_special}
            </div>
          )}
          {(listing.specials || []).length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">Landlord Specials</p>
              <div className="flex flex-wrap gap-1.5">
                {listing.specials.map(s => (
                  <span key={s} className="bg-[#EBF9F4] text-[#1D9E75] text-xs font-semibold px-3 py-1 rounded-full">
                    {s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {listing.description && (
          <div className="bg-white rounded-xl p-4">
            <h2 className="font-semibold text-sm text-gray-900 mb-2">About this unit</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{listing.description}</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <button
          onClick={() => navigate(`/tenant/apply/${id}`)}
          className="w-full bg-[#1D9E75] text-white rounded-xl py-4 font-semibold text-sm shadow-lg shadow-[#1D9E75]/20">
          Apply Now
        </button>
      </div>
    </div>
  )
}
