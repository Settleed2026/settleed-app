import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getPaymentStandard } from '../../lib/paymentStandards'
import { Search, SlidersHorizontal, X, BedDouble, MapPin, ChevronDown } from 'lucide-react'

const HA_OPTIONS = [
  { value: '', label: 'All HAs' },
  { value: 'AHA', label: 'AHA' },
  { value: 'DCA', label: 'DCA' },
  { value: 'COBB', label: 'Cobb HA' },
  { value: 'DEKALB', label: 'DeKalb HA' },
  { value: 'other', label: 'Other' },
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
  const beds = listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} bd`
  const baths = `${listing.bathrooms} ba`
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
            <span className="text-lg font-bold text-gray-900">${listing.rent_amount?.toLocaleString()}</span>
            <span className="text-xs text-gray-500">/mo</span>
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

export default function SearchListings() {
  const navigate = useNavigate()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [queryError, setQueryError] = useState(null)

  const [search, setSearch] = useState('')
  const [ha, setHa] = useState('')
  const [beds, setBeds] = useState('')
  const [minRent, setMinRent] = useState('')
  const [maxRent, setMaxRent] = useState('')
  const [creditFriendly, setCreditFriendly] = useState(false)

  const fetchListings = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('properties')
      .select('id, neighborhood, zip_code, bedrooms, bathrooms, square_feet, rent_amount, available_date, photos, credit_friendly, move_in_special, ha_accepted, specials', { count: 'exact' })
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
    if (minRent) query = query.gte('rent_amount', parseFloat(minRent))
    if (maxRent) query = query.lte('rent_amount', parseFloat(maxRent))
    if (creditFriendly) query = query.eq('credit_friendly', true)

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
  }, [search, ha, beds, minRent, maxRent, creditFriendly])

  useEffect(() => {
    const t = setTimeout(fetchListings, search ? 400 : 0)
    return () => clearTimeout(t)
  }, [fetchListings, search])

  const hasActiveFilters = ha || beds || minRent || maxRent || creditFriendly
  function clearFilters() { setHa(''); setBeds(''); setMinRent(''); setMaxRent(''); setCreditFriendly(false) }

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
        <button onClick={() => setCreditFriendly(p => !p)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${creditFriendly ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200'}`}>
          Credit Friendly
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

      <div className="px-4 py-3">
        <p className="text-xs text-gray-500">
          {loading ? 'Searching...' : `${total.toLocaleString()} listing${total !== 1 ? 's' : ''} found`}
        </p>
        {queryError && (
          <p className="text-xs text-red-600 mt-1 font-mono bg-red-50 px-2 py-1 rounded break-all">
            DB error: {queryError}
          </p>
        )}
      </div>

      <div className="px-4">
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
