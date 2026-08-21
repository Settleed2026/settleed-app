// src/pages/PublicListingDetail.jsx
// Public listing detail page — no auth required, SEO-friendly

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BedDouble, Bath, Ruler, MapPin, ChevronLeft, ChevronRight, Home, Zap, Accessibility } from 'lucide-react'

const HA_LABELS = {
  AHA: 'Atlanta Housing (AHA)',
  DCA: 'Georgia DCA',
  COBB: 'Cobb County HA',
  DEKALB: 'DeKalb County HA',
  other: 'Other HAs',
}

function MetaTags({ listing }) {
  useEffect(() => {
    if (!listing) return
    const beds = listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} BR`
    const title = `${beds} in ${listing.neighborhood} — $${listing.rent_amount?.toLocaleString()}/mo | Settleed`
    const desc = `Section 8 / HCV housing in ${listing.neighborhood}, Atlanta (${listing.zip_code}). ${listing.bedrooms} bed, ${listing.bathrooms} bath. Vouchers accepted. Apply on Settleed.`

    document.title = title
    const setMeta = (name, content, prop = 'name') => {
      let el = document.querySelector(`meta[${prop}="${name}"]`)
      if (!el) { el = document.createElement('meta'); el.setAttribute(prop, name); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }
    setMeta('description', desc)
    setMeta('og:title', title, 'property')
    setMeta('og:description', desc, 'property')
    setMeta('og:type', 'website', 'property')
    if (listing.photos?.[0]) setMeta('og:image', listing.photos[0], 'property')
    setMeta('og:url', `https://settleed.com/listing/${listing.id}`, 'property')

    return () => { document.title = 'Settleed — Find Section 8 Housing in Atlanta' }
  }, [listing])
  return null
}

export default function PublicListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [photoIdx, setPhotoIdx] = useState(0)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .eq('status', 'active')
        .single()
      setListing(data || null)
      setLoading(false)
    }
    fetch()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="h-64 bg-gray-200 animate-pulse" />
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <Home className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-700 font-semibold">Listing not found</p>
        <p className="text-gray-400 text-sm mt-1">It may have been rented or removed.</p>
        <Link to="/listings" className="mt-4 text-[#1B3A6B] font-medium text-sm underline">Browse other listings</Link>
      </div>
    )
  }

  const photos = listing.photos?.length ? listing.photos : []
  const beds = listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} bed`
  const baths = listing.bathrooms != null ? `${listing.bathrooms} bath` : null
  const sqft = listing.square_feet ? `${listing.square_feet.toLocaleString()} sqft` : null
  const accepted = (listing.ha_accepted || []).map(ha => HA_LABELS[ha] || ha)
  const utilities = listing.utilities && typeof listing.utilities === 'object' ? listing.utilities : {}
  const amenities = Array.isArray(listing.amenities) ? listing.amenities : []
  const accessibility = Array.isArray(listing.accessibility) ? listing.accessibility : []

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <MetaTags listing={listing} />

      {/* Top nav bar */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <Link to="/" className="flex items-center gap-1.5">
            <div className="w-6 h-6 bg-[#1B3A6B] rounded-md flex items-center justify-center">
              <Home size={12} color="white" />
            </div>
            <span className="text-sm font-bold text-[#0D1B4B]">Settleed</span>
          </Link>
          <Link to="/signup?role=tenant" className="text-xs font-semibold text-white bg-[#1D9E75] px-3 py-1.5 rounded-lg">
            Sign up free
          </Link>
        </div>
      </header>

      {/* Photo gallery */}
      {photos.length > 0 ? (
        <div className="relative h-64 bg-gray-200">
          <img
            src={photos[photoIdx]}
            alt={`${listing.neighborhood} listing photo ${photoIdx + 1}`}
            className="w-full h-full object-cover"
          />
          {photos.length > 1 && (
            <>
              <button
                onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5"
                aria-label="Next photo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                {photoIdx + 1}/{photos.length}
              </div>
            </>
          )}
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span className="bg-[#1D9E75] text-white text-[10px] font-semibold px-2 py-1 rounded-full">
              Vouchers OK
            </span>
            {listing.credit_friendly && (
              <span className="bg-white text-[#1B3A6B] text-[10px] font-semibold px-2 py-1 rounded-full border border-[#1B3A6B]">
                Credit OK
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="h-48 bg-gray-100 flex items-center justify-center">
          <BedDouble className="w-12 h-12 text-gray-300" />
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {/* Price + basics */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              {listing.rent_amount != null ? (
                <div>
                  <span className="text-2xl font-bold text-gray-900">${listing.rent_amount.toLocaleString()}</span>
                  <span className="text-sm text-gray-500">/mo</span>
                </div>
              ) : (
                <span className="text-gray-400">Price TBD</span>
              )}
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm text-gray-700 font-medium">{listing.neighborhood}</span>
                <span className="text-sm text-gray-400">· {listing.zip_code}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3 text-sm text-gray-600">
            <span className="flex items-center gap-1"><BedDouble className="w-4 h-4 text-gray-400" />{beds}</span>
            {baths && <span className="flex items-center gap-1"><Bath className="w-4 h-4 text-gray-400" />{baths}</span>}
            {sqft && <span className="flex items-center gap-1"><Ruler className="w-4 h-4 text-gray-400" />{sqft}</span>}
            {listing.property_type && <span className="text-gray-400">· {listing.property_type}</span>}
          </div>
          {listing.available_date && (
            <p className="text-xs text-[#1D9E75] font-medium mt-2">
              {new Date(listing.available_date) <= new Date() ? 'Available Now' : `Available ${new Date(listing.available_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
            </p>
          )}
        </div>

        {/* Description */}
        {listing.description && (
          <div className="bg-white rounded-xl p-4">
            <h2 className="font-semibold text-sm text-gray-900 mb-2">About this unit</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{listing.description}</p>
          </div>
        )}

        {/* Vouchers accepted */}
        {accepted.length > 0 && (
          <div className="bg-white rounded-xl p-4">
            <h2 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#1D9E75]" /> Housing vouchers accepted
            </h2>
            <div className="flex flex-wrap gap-2">
              {accepted.map(ha => (
                <span key={ha} className="text-xs bg-green-50 text-green-700 font-medium px-2.5 py-1 rounded-full border border-green-100">
                  ✓ {ha}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Utilities */}
        {Object.keys(utilities).length > 0 && (
          <div className="bg-white rounded-xl p-4">
            <h2 className="font-semibold text-sm text-gray-900 mb-2">Utilities</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(utilities).map(([util, included]) => (
                <span key={util} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                  included ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-500 border-gray-100'
                }`}>
                  {util}: {included ? 'Included' : 'Tenant pays'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="bg-white rounded-xl p-4">
            <h2 className="font-semibold text-sm text-gray-900 mb-2">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {amenities.map(a => (
                <span key={a} className="text-xs bg-blue-50 text-blue-700 font-medium px-2.5 py-1 rounded-full border border-blue-100">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Accessibility */}
        {accessibility.length > 0 && (
          <div className="bg-white rounded-xl p-4">
            <h2 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-1.5">
              <Accessibility className="w-4 h-4 text-purple-500" /> Accessibility features
            </h2>
            <div className="flex flex-wrap gap-2">
              {accessibility.map(a => (
                <span key={a} className="text-xs bg-purple-50 text-purple-700 font-medium px-2.5 py-1 rounded-full border border-purple-100">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Move-in special */}
        {listing.move_in_special && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800">🎁 Move-in special</p>
            <p className="text-sm text-amber-700 mt-1">{listing.move_in_special}</p>
          </div>
        )}

        {/* Auth gate CTA */}
        <div className="bg-[#1B3A6B] rounded-2xl p-6 text-center">
          <h3 className="text-white font-bold text-lg mb-2">Ready to apply?</h3>
          <p className="text-blue-200 text-sm mb-5">
            Create a free account to submit your application, message the landlord, and track your housing search.
          </p>
          <Link
            to={`/signup?role=tenant&listing=${id}`}
            className="block w-full bg-[#1D9E75] text-white font-semibold py-3.5 rounded-xl text-sm hover:opacity-90 transition-opacity mb-3"
          >
            Create free account & apply
          </Link>
          <Link
            to={`/login?redirect=/tenant/listing/${id}`}
            className="block w-full border border-white/30 text-white font-medium py-3 rounded-xl text-sm hover:bg-white/10 transition-colors"
          >
            Already have an account? Sign in
          </Link>
        </div>

        {/* EHO */}
        <p className="text-center text-[10px] text-gray-400 pb-4">
          Equal Housing Opportunity · All vouchers welcome · Settleed does not discriminate on the basis of race, color, religion, sex, national origin, disability, familial status, or source of income.
        </p>
      </div>
    </div>
  )
}
