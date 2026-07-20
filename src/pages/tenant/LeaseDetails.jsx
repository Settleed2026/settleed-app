import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import {
  ChevronLeft, Home, Calendar, DollarSign,
  FileText, AlertTriangle, CheckCircle,
} from 'lucide-react'

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
}

function urgencyBadge(days) {
  if (days === null) return null
  if (days < 0)   return { label: 'Overdue', color: 'bg-red-100 text-red-700' }
  if (days <= 30) return { label: `${days}d left`, color: 'bg-red-100 text-red-700' }
  if (days <= 90) return { label: `${days}d left`, color: 'bg-amber-100 text-amber-700' }
  return { label: `${days}d left`, color: 'bg-green-100 text-green-700' }
}

export default function TenantLeaseDetails() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [lease, setLease] = useState(null)
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchLease()
  }, [user])

  async function fetchLease() {
    // Get tenant's active lease ID from their profile
    const { data: prof } = await supabase
      .from('profiles')
      .select('active_lease_id, property_id, landlord_id')
      .eq('id', user.id)
      .single()

    if (!prof?.active_lease_id) { setLoading(false); return }

    // Fetch lease record
    const { data: leaseData } = await supabase
      .from('leases')
      .select('*')
      .eq('id', prof.active_lease_id)
      .single()

    // Fetch property info
    if (prof.property_id) {
      const { data: propData } = await supabase
        .from('properties')
        .select('street_address, unit_number, neighborhood, city, state, zip_code, bedrooms, bathrooms')
        .eq('id', prof.property_id)
        .single()
      setProperty(propData)
    }

    setLease(leaseData)
    setLoading(false)
  }

  const fmt = (dateStr) => dateStr
    ? new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—'

  const fmtMoney = (cents) => cents != null
    ? `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : null

  const fmtDollar = (amount) => amount != null
    ? `$${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : '—'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!lease) {
    return (
      <div className="min-h-screen bg-gray-50 pb-28">
        <div className="bg-[#1B3A6B] px-4 pt-10 pb-5 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white"><ChevronLeft className="w-6 h-6" /></button>
          <h1 className="text-white text-lg font-bold">My Lease</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-600 font-semibold">No active lease</p>
          <p className="text-gray-400 text-sm mt-2">Once your landlord activates your lease, details will appear here.</p>
          <button onClick={() => navigate('/tenant')} className="mt-6 text-[#1B3A6B] text-sm font-semibold">
            ← Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  const recertDays = daysUntil(lease.recertification_date)
  const recertBadge = urgencyBadge(recertDays)
  const leaseEndDays = daysUntil(lease.lease_end_date)
  const leaseEndBadge = urgencyBadge(leaseEndDays)

  const address = property
    ? `${property.street_address}${property.unit_number ? ` #${property.unit_number}` : ''}, ${property.city}, ${property.state} ${property.zip_code}`
    : '—'

  const beds = property?.bedrooms === 0 ? 'Studio' : `${property?.bedrooms} BR`

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-5">
        <button onClick={() => navigate(-1)} className="text-blue-200 text-sm mb-3 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-white text-2xl font-bold">My Lease</h1>
        {property && (
          <p className="text-blue-200 text-sm mt-0.5">{property.neighborhood} · {beds}</p>
        )}
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Active badge */}
        <div className="bg-white rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-[#1D9E75]" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Lease Active</p>
            <p className="text-xs text-gray-500 mt-0.5">Your landlord has confirmed this lease</p>
          </div>
        </div>

        {/* Property */}
        {property && (
          <div className="bg-white rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5" /> Property
            </p>
            <p className="text-sm font-semibold text-gray-900">{address}</p>
            <p className="text-xs text-gray-500 mt-1">{beds} · {property.bathrooms} BA</p>
          </div>
        )}

        {/* Lease Dates */}
        <div className="bg-white rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Lease dates
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400">Start date</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{fmt(lease.lease_start_date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">End date</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm font-semibold text-gray-900">{fmt(lease.lease_end_date)}</p>
                {leaseEndBadge && leaseEndDays <= 90 && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${leaseEndBadge.color}`}>
                    {leaseEndBadge.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rent Breakdown */}
        <div className="bg-white rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> Rent breakdown
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">Total monthly rent</span>
              <span className="text-sm font-bold text-gray-900">{fmtDollar(lease.rent_amount)}</span>
            </div>
            {lease.ha_portion && (
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Housing Authority pays (HAP)</span>
                <span className="text-sm font-semibold text-[#1D9E75]">− {fmtDollar(lease.ha_portion)}</span>
              </div>
            )}
            {lease.tenant_portion && (
              <div className="flex justify-between items-center py-2 bg-blue-50 rounded-lg px-3">
                <span className="text-sm font-bold text-[#1B3A6B]">Your portion</span>
                <span className="text-sm font-bold text-[#1B3A6B]">{fmtDollar(lease.tenant_portion)}/mo</span>
              </div>
            )}
          </div>
        </div>

        {/* HAP Contract */}
        {lease.hap_contract_number && (
          <div className="bg-white rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> HAP Contract
            </p>
            <p className="text-sm font-mono text-gray-700">{lease.hap_contract_number}</p>
          </div>
        )}

        {/* Recertification */}
        {lease.recertification_date && (
          <div className={`rounded-xl p-4 ${recertDays !== null && recertDays <= 90 ? 'bg-amber-50 border border-amber-200' : 'bg-white'}`}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <AlertTriangle className={`w-3.5 h-3.5 ${recertDays !== null && recertDays <= 90 ? 'text-amber-500' : ''}`} />
              Recertification
            </p>
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-gray-900">{fmt(lease.recertification_date)}</p>
              {recertBadge && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${recertBadge.color}`}>
                  {recertBadge.label}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Contact your housing authority before this date to keep your voucher.
            </p>
          </div>
        )}

        {/* Quick actions */}
        <div className="bg-white rounded-xl divide-y divide-gray-100">
          <button
            onClick={() => navigate('/tenant/rent')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-gray-700"
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#1D9E75]" />
              <span>Pay rent</span>
            </div>
            <ChevronLeft className="w-4 h-4 text-gray-400 rotate-180" />
          </button>
          <button
            onClick={() => navigate('/tenant/maintenance')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-gray-700"
          >
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-[#1B3A6B]" />
              <span>Submit maintenance request</span>
            </div>
            <ChevronLeft className="w-4 h-4 text-gray-400 rotate-180" />
          </button>
        </div>
      </div>
    </div>
  )
}
