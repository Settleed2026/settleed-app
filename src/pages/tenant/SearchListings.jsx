import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getPaymentStandard } from '../../lib/paymentStandards'
import { Search, SlidersHorizontal, X, BedDouble, MapPin, ChevronDown, List, Map } from 'lucide-react'

const HA_OPTIONS = [
  { value: '', label: 'All HAs' },
  { value: 'AHA', label: 'AHA' },
  { value: 'DCA', label: 'DCA' },
  { value: 'COBB', label: 'Cobb HA' },
  { value: 'DEKALB', label: 'DeKalb HA' },
  { value: 'other', label: 'Other' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'Any Type' },
  { value: 'Single Family Home', label: 'House' },
  { value: 'Apartment', label: 'Apartment' },
  { value: 'Duplex', label: 'Duplex' },
  { value: 'Townhome', label: 'Townhome' },
  { value: 'Condo', label: 'Condo' },
]

const BED_OPTIONS = [
  { value: '', label: 'Any Beds' },
  { value: '0', label: 'Studio' },
  { value: '1', label: '1 BR' },
  { value: '2', label: '2 BR' },
  { value: '3', label: '3 BR' },
  { value: '4', label: '4+ BR' },
]

function PSBadge({ zip, bedrooms, rent }) {
  if (!zip || bedrooms === '' || !rent) return null
  const ps = getPaymentStandard(zip, parseInt(bedrooms))
  if (!ps) return null
  const ok = rent <= ps.maxRent
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ok ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
      {ok ? '✓ DCA OK' : '⚠ Above DCA'}
    </span>
  )
}

function ListingCard({ listing, onClick }) {
  const photo = listing.photos?.[0]
  const beds = listing.bedrooms === 0 ? 'Studio' : listing.bedrooms != null ? `${listing.bedrooms} bd` : '? bd'
  const baths = listing.bathrooms != null ? `${listing.bathrooms} ba` : '? ba'
  const available = listing.available_date
    ? new Date(listing.available_date) <= new Date()
      ? 'Available Now'
      : `Avail. ${new Date(listing.available_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : 'Available Now'

  return (
    <div onClick={onClick} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform">
      <div className="relative h-44 bg-gray-100">
        {photo
          ? <img src={photo} alt={listing.neighborhood} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
              <BedDouble className="w-10 h-10" />
            </div>
        }
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
          <span className="bg-[#1D9E75] text-white text-[10px] font-semibold px-2 py-1 rounded-full">
            Vouchers OK
          </span>
          {listing.credit_friendly && (
            <span className="bg-white text-[#1B3A6B] text-[10px] font-semibold px-2 py-1 rounded-full border border-[#1B3A6B]">
              Credit OK
            </span>
          )}
        </div>
        {listing.move_in_special && (
          <div className="absolute bottom-2 right-2 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-1 rounded-full">
            Special
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            {listing.rent_amount != null ? (
              <>
                <span className="text-lg font-bold text-gray-900">${listing.rent_amount.toLocaleString()}</span>
                <span className="text-xs text-gray-500">/mo</span>
              </>
            ) : (
              <span className="text-sm text-gray-400">Price TBD</span>
            )}
          </div>
          <PSBadge zip={listing.zip_code} bedrooms={listing.bedrooms} rent={listing.rent_amount} />
        </div>
        <p className="text-xs text-[#1D9E75] font-medium mt-0.5">{available}</p>
        <p className="text-xs text-gray-600 mt-1">{beds} · {baths}{listing.square_feet ? ` · ${listing.square_feet.toLocaleString()} sqft` : ''}</p>
        <div className="flex items-center gap-1 mt-1.5">
          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
          <p className="text-xs text-gray-700 font-medium truncate">{listing.neighborhood}</p>
          <span className="text-xs text-gray-400">· {listing.zip_code}</span>
        </div>
        {listing.move_in_special && (
          <p className="text-xs text-amber-700 mt-1.5 bg-amber-50 rounded px-2 py-1 truncate">
            {'🎁'} {listing.move_in_special}
          </p>
        )}
        {(listing.specials || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {listing.specials.slice(0, 3).map(s => (
              <span key={s} className="text-[10px] bg-[#EBF9F4] text-[#1D9E75] font-semibold px-2 py-0.5 rounded-full">
                {s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
            ))}
            {listing.specials.length > 3 && (
              <span className="text-[10px] text-gray-400 px-1 py-0.5">+{listing.specials.length - 3} more</span>
            )}
          </div>
        )}
        <button className="mt-3 w-full border border-[#1B3A6B] text-[#1B3A6B] text-xs font-semibold py-2 rounded-lg hover:bg-[#1B3A6B] hover:text-white transition-colors">
          View Details
        </button>
      </div>
    </div>
  )
}

// ── Leaflet map component (lazy-loaded) ──
function MapView({ listings, onSelect }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const L = window.L
    if (!L) return

    const map = L.map(mapRef.current, { center: [33.749, -84.388], zoom: 11, zoomControl: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map)
    mapInstanceRef.current = map

    return () => { map.remove(); mapInstanceRef.current = null }
  }, [])

  useEffect(() => {
    const L = window.L
    const map = mapInstanceRef.current
    if (!L || !map) return

    // Remove old markers
    map.eachLayer(l => { if (l instanceof L.Marker) map.removeLayer(l) })

    listings.forEach(listing => {
      const lat = listing.latitude
      const lng = listing.longitude
      if (!lat || !lng) return

      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#1B3A6B;color:#fff;font-size:11px;font-weight:600;padding:4px 8px;border-radius:20px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25)">$${Math.round(listing.rent_amount / 100) * 100 === listing.rent_amount ? listing.rent_amount.toLocaleString() : listing.rent_amount?.toLocaleString()}/mo</div>`,
        iconAnchor: [30, 14],
      })

      const beds = listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} BR`
      const photo = listing.photos?.[0]
      const popup = L.popup({ maxWidth: 220, className: 'settleed-popup' }).setContent(`
        <div style="font-family:sans-serif;cursor:pointer" onclick="window._settleedSelect('${listing.id}')">
          ${photo ? `<img src="${photo}" style="width:100%;height:100px;object-fit:cover;border-radius:6px;margin-bottom:8px" />` : ''}
          <div style="font-weight:600;font-size:13px;color:#111">${listing.neighborhood || listing.zip_code}</div>
          <div style="font-size:12px;color:#555;margin:2px 0">${beds} · ${listing.zip_code}</div>
          <div style="font-size:14px;font-weight:700;color:#1B3A6B">$${listing.rent_amount?.toLocaleString()}/mo</div>
          <button style="margin-top:8px;width:100%;background:#1D9E75;color:#fff;border:none;padding:6px;border-radius:6px;font-size:12px;cursor:pointer" onclick="window._settleedSelect('${listing.id}')">View listing</button>
        </div>
      `)

      L.marker([lat, lng], { icon }).addTo(map).bindPopup(popup)
    })

    // Fit bounds if we have markers
    const withCoords = listings.filter(l => l.latitude && l.longitude)
    if (withCoords.length > 0) {
      const bounds = L.latLngBounds(withCoords.map(l => [l.latitude, l.longitude]))
      map.fitBounds(bounds.pad(0.15))
    }
  }, [listings])

  useEffect(() => {
    window._settleedSelect = onSelect
    return () => { delete window._settleedSelect }
  }, [onSelect])

  return <div ref={mapRef} style={{ height: 'calc(100vh - 220px)', width: '100%' }} />
}

export default function SearchListings() {
  const navigate = useNavigate()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [queryError, setQueryError] = useState(null)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'map'
  const [leafletLoaded, setLeafletLoaded] = useState(!!window.L)

  const [search, setSearch] = useState('')
  const [ha, setHa] = useState('')
  const [beds, setBeds] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [minRent, setMinRent] = useState('')
  const [maxRent, setMaxRent] = useState('')
  const [creditFriendly, setCreditFriendly] = useState(false)
  const [petsAllowed, setPetsAllowed] = useState(false)
  const [accessibleOnly, setAccessibleOnly] = useState(false)

  // Load Leaflet on first map toggle
  useEffect(() => {
    if (viewMode !== 'map' || leafletLoaded) return
    const cssId = 'leaflet-css'
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link')
      link.id = cssId
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setLeafletLoaded(true)
    document.head.appendChild(script)
  }, [viewMode, leafletLoaded])

  const fetchListings = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('properties')
      .select('id, neighborhood, zip_code, bedrooms, bathrooms, square_feet, rent_amount, available_date, photos, credit_friendly, move_in_special, ha_accepted, specials, latitude, longitude', { count: 'exact' })
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50)

    if (search.trim()) query = query.or(`neighborhood.ilike.%${search}%,zip_code.ilike.%${search}%`)
    if (ha) query = query.contains('ha_accepted', [ha])
    if (beds) {
      const n = parseInt(beds)
      if (n >= 4) query = query.gte('bedrooms', 4)
      else query = query.eq('bedrooms', n)
    }
    if (propertyType) query = query.eq('property_type', propertyType)
    if (minRent) query = query.gte('rent_amount', parseFloat(minRent))
    if (maxRent) query = query.lte('rent_amount', parseFloat(maxRent))
    if (creditFriendly) query = query.eq('credit_friendly', true)
    if (petsAllowed) query = query.eq('pets_allowed', true)
    if (accessibleOnly) query = query.neq('accessibility', '[]').not('accessibility', 'is', null)

    const { data, count, error } = await query
    if (error) {
      console.error('[SearchListings] Supabase error:', error)
      setQueryError(error.message || 'Unknown error')
    } else {
      setQueryError(null)
      setListings(data || [])
      setTotal(count || 0)
    }
    setLoading(false)
  }, [search, ha, beds, propertyType, minRent, maxRent, creditFriendly, petsAllowed, accessibleOnly])

  useEffect(() => {
    const t = setTimeout(fetchListings, search ? 400 : 0)
    return () => clearTimeout(t)
  }, [fetchListings, search])

  const hasActiveFilters = ha || beds || propertyType || minRent || maxRent || creditFriendly || petsAllowed || accessibleOnly
  function clearFilters() { setHa(''); setBeds(''); setPropertyType(''); setMinRent(''); setMaxRent(''); setCreditFriendly(false); setPetsAllowed(false); setAccessibleOnly(false) }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-4">
        <h1 className="text-white text-lg font-bold mb-3">Find Housing</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search neighborhood or ZIP code..."
            aria-label="Search neighborhood or ZIP code"
            className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-2 overflow-x-auto">
        <div className="relative shrink-0">
          <select value={ha} onChange={e => setHa(e.target.value)}
            className="appearance-none pl-3 pr-7 py-1.5 rounded-full text-xs font-medium border border-gray-200 bg-white focus:outline-none cursor-pointer"
            style={{ color: ha ? '#1B3A6B' : undefined }}>
            {HA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative shrink-0">
          <select value={beds} onChange={e => setBeds(e.target.value)}
            className="appearance-none pl-3 pr-7 py-1.5 rounded-full text-xs font-medium border border-gray-200 bg-white focus:outline-none cursor-pointer"
            style={{ color: beds ? '#1B3A6B' : undefined }}>
            {BED_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative shrink-0">
          <select value={propertyType} onChange={e => setPropertyType(e.target.value)}
            className="appearance-none pl-3 pr-7 py-1.5 rounded-full text-xs font-medium border border-gray-200 bg-white focus:outline-none cursor-pointer"
            style={{ color: propertyType ? '#1B3A6B' : undefined }}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>
        <button onClick={() => setCreditFriendly(p => !p)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${creditFriendly ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200'}`}>
          Credit OK
        </button>
        <button onClick={() => setPetsAllowed(p => !p)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${petsAllowed ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200'}`}>
          Pets OK
        </button>
        <button onClick={() => setAccessibleOnly(p => !p)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${accessibleOnly ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200'}`}>
          Accessible
        </button>
        <button onClick={() => setShowFilters(p => !p)}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${(minRent || maxRent) ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200'}`}>
          <SlidersHorizontal className="w-3 h-3" />
          Rent
        </button>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium text-red-600 border border-red-200 bg-white">
            Clear
          </button>
        )}
      </div>

      {showFilters && (
        <div className="bg-white border-b border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-500 mb-2 font-medium">Monthly rent range</p>
          <div className="flex items-center gap-2">
            <input type="number" value={minRent} onChange={e => setMinRent(e.target.value)}
              placeholder="No min" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
            <span className="text-gray-400 text-sm">-</span>
            <input type="number" value={maxRent} onChange={e => setMaxRent(e.target.value)}
              placeholder="No max" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
          </div>
        </div>
      )}

      <div className="px-4 py-3 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {loading ? 'Searching...' : `${total.toLocaleString()} listing${total !== 1 ? 's' : ''} found`}
        </p>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setViewMode('list')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            <List className="w-3.5 h-3.5" /> List
          </button>
          <button onClick={() => setViewMode('map')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            <Map className="w-3.5 h-3.5" /> Map
          </button>
        </div>
      </div>
      {queryError && (
        <p className="text-xs text-red-600 mx-4 mb-2 font-mono bg-red-50 px-2 py-1 rounded break-all">
          DB error: {queryError}
        </p>
      )}

      {/* Map view */}
      {viewMode === 'map' && (
        <div className="px-0">
          {leafletLoaded
            ? <MapView listings={listings} onSelect={id => navigate(`/tenant/listing/${id}`)} />
            : <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading map…</div>
          }
        </div>
      )}

      <div className={viewMode === 'map' ? 'hidden' : 'px-4'}>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
                <div className="h-44 bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-24" />
                  <div className="h-3 bg-gray-200 rounded w-16" />
                  <div className="h-3 bg-gray-200 rounded w-32" />
                  <div className="h-8 bg-gray-200 rounded mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No listings found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-3 text-[#1B3A6B] text-sm font-medium underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} onClick={() => navigate(`/tenant/listing/${listing.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

