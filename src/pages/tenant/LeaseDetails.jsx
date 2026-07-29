import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'
import {
  ChevronLeft, Home, Calendar, DollarSign,
  FileText, AlertTriangle, CheckCircle, PenLine,
  ExternalLink, Clock, ShieldCheck,
} from 'lucide-react'

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
}

function urgencyBadge(days) {
  if (days === null) return null
  if (days < 0)   return { label: 'Overdue',     color: 'bg-red-100 text-red-700' }
  if (days <= 30) return { label: `${days}d left`, color: 'bg-red-100 text-red-700' }
  if (days <= 90) return { label: `${days}d left`, color: 'bg-amber-100 text-amber-700' }
  return           { label: `${days}d left`,       color: 'bg-green-100 text-green-700' }
}

const fmt = (dateStr) => dateStr
  ? new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  : '—'

const fmtDollar = (amount) => amount != null
  ? `$${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  : null

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]'

// ─── Pending signature view ────────────────────────────────────────────────────
function PendingSignatureView({ lease, property, onSigned }) {
  const { user } = useAuth()
  const [signatureName, setSignatureName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [signing, setSigning] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSign() {
    if (!signatureName.trim()) { toast.error('Please type your full name.'); return }
    if (!agreed)               { toast.error('Please check the agreement box.'); return }
    setSigning(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/sign-lease', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ lease_id: lease.id, signature_name: signatureName.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to sign lease.')
      setDone(true)
      toast.success('Lease signed! Welcome home.')
      onSigned()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSigning(false)
    }
  }

  const address = property
    ? `${property.street_address}${property.unit_number ? ` #${property.unit_number}` : ''}, ${property.neighborhood}`
    : '—'

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
          <CheckCircle className="w-10 h-10 text-[#1D9E75]" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Lease Signed!</h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
          You're all set. Your lease is now active and your unit is confirmed.
          Welcome home!
        </p>
        <div className="mt-3 text-xs text-gray-400">Signed as: <span className="italic font-medium">{signatureName}</span></div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 space-y-4">
      {/* Pending banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Action Required: Sign Your Lease</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            Your landlord has prepared a lease agreement for {address}. Review the terms below and sign to confirm your tenancy.
          </p>
        </div>
      </div>

      {/* Lease type indicator */}
      {lease.lease_type === 'uploaded' ? (
        <div className="bg-white rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Lease Document
          </p>
          {lease.document_url ? (
            <a href={lease.document_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#EEF5FF] text-[#1B3A6B] rounded-lg px-4 py-3 text-sm font-semibold w-full justify-center hover:opacity-90">
              <ExternalLink className="w-4 h-4" /> View Lease PDF
            </a>
          ) : (
            <p className="text-sm text-gray-500 italic">PDF link loading — try refreshing.</p>
          )}
        </div>
      ) : null}

      {/* Lease term */}
      <div className="bg-white rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> Lease Term
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400">Start</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{fmt(lease.lease_start_date)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">End</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{fmt(lease.lease_end_date) || 'Month-to-month'}</p>
          </div>
        </div>
      </div>

      {/* Rent */}
      <div className="bg-white rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5" /> Rent
        </p>
        <div className="space-y-2">
          <div className="flex justify-between py-1.5 border-b border-gray-50">
            <span className="text-sm text-gray-600">Total monthly rent</span>
            <span className="text-sm font-bold text-gray-900">{fmtDollar(lease.rent_amount)}/mo</span>
          </div>
          {lease.ha_portion != null && (
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-sm text-gray-600">Housing Authority pays</span>
              <span className="text-sm font-semibold text-[#1D9E75]">− {fmtDollar(lease.ha_portion)}</span>
            </div>
          )}
          {lease.tenant_portion != null && (
            <div className="flex justify-between py-2 bg-blue-50 rounded-lg px-3">
              <span className="text-sm font-bold text-[#1B3A6B]">You pay</span>
              <span className="text-sm font-bold text-[#1B3A6B]">{fmtDollar(lease.tenant_portion)}/mo</span>
            </div>
          )}
          {lease.security_deposit != null && (
            <div className="flex justify-between py-1.5 border-t border-gray-100">
              <span className="text-sm text-gray-500">Security deposit</span>
              <span className="text-sm font-semibold text-gray-700">{fmtDollar(lease.security_deposit)}</span>
            </div>
          )}
          {lease.late_fee_amount != null && (
            <div className="flex justify-between py-1.5 border-t border-gray-100">
              <span className="text-sm text-gray-500">Late fee (after {lease.late_fee_grace_days || 5} days)</span>
              <span className="text-sm font-semibold text-gray-700">{fmtDollar(lease.late_fee_amount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Digital-only fields */}
      {lease.lease_type === 'digital' && (
        <>
          {(lease.utilities_included?.length > 0 || lease.pets_allowed != null || lease.parking_included != null) && (
            <div className="bg-white rounded-xl p-4 space-y-2.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Terms</p>
              {lease.utilities_included?.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Utilities included</span>
                  <span className="text-sm font-medium text-gray-900 text-right max-w-[180px]">{lease.utilities_included.join(', ')}</span>
                </div>
              )}
              {lease.utilities_included?.length === 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Utilities included</span>
                  <span className="text-sm text-gray-500">None — tenant pays all</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Pets</span>
                <span className="text-sm font-medium text-gray-900">
                  {lease.pets_allowed
                    ? `Allowed${lease.pet_deposit != null ? ` (${fmtDollar(lease.pet_deposit)} deposit)` : ''}`
                    : 'Not allowed'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Parking</span>
                <span className="text-sm font-medium text-gray-900">
                  {lease.parking_included
                    ? `Included (${lease.parking_spaces || 1} space${lease.parking_spaces > 1 ? 's' : ''})`
                    : 'Not included'}
                </span>
              </div>
            </div>
          )}

          {(lease.additional_terms || lease.special_provisions) && (
            <div className="bg-white rounded-xl p-4 space-y-3">
              {lease.additional_terms && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Additional Terms</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{lease.additional_terms}</p>
                </div>
              )}
              {lease.special_provisions && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Special Provisions</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{lease.special_provisions}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Legal notice */}
      <p className="text-[10px] text-gray-400 leading-relaxed px-1">
        This lease was generated using Settleed's template. Both parties are advised to consult a
        licensed Georgia real estate attorney before signing.
      </p>

      {/* Sign block */}
      <div className="border-2 border-[#1B3A6B] rounded-xl p-4 space-y-3 bg-[#EEF5FF]">
        <p className="text-sm font-bold text-[#1B3A6B] flex items-center gap-1.5">
          <PenLine className="w-4 h-4" /> Sign this lease
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Your full legal name *</label>
          <input
            type="text"
            value={signatureName}
            onChange={e => setSignatureName(e.target.value)}
            placeholder="Type your full name"
            className={`${inputClass} font-medium italic`}
          />
        </div>
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded accent-[#1B3A6B] mt-0.5 shrink-0"
            checked={agreed} onChange={e => setAgreed(e.target.checked)} />
          <span className="text-xs text-gray-600 leading-relaxed">
            By checking this box, I agree that typing my name above constitutes my legal electronic
            signature and I accept all terms in this lease agreement.
          </span>
        </label>
        <button
          onClick={handleSign}
          disabled={signing}
          className="w-full bg-[#1B3A6B] text-white rounded-xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {signing
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><ShieldCheck className="w-4 h-4" /> Sign &amp; Confirm Tenancy</>
          }
        </button>
      </div>

      <div className="h-8" />
    </div>
  )
}

// ─── Active lease view ────────────────────────────────────────────────────────
function ActiveLeaseView({ lease, property }) {
  const navigate = useNavigate()

  const recertDays   = daysUntil(lease.recertification_date)
  const recertBadge  = urgencyBadge(recertDays)
  const leaseEndDays = daysUntil(lease.lease_end_date)
  const leaseEndBadge = urgencyBadge(leaseEndDays)

  const address = property
    ? `${property.street_address}${property.unit_number ? ` #${property.unit_number}` : ''}, ${property.city}, ${property.state} ${property.zip_code}`
    : '—'
  const beds = property?.bedrooms === 0 ? 'Studio' : `${property?.bedrooms} BR`

  return (
    <div className="px-4 pt-4 space-y-4">
      {/* Active badge */}
      <div className="bg-white rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-[#1D9E75]" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">Lease Active</p>
          <p className="text-xs text-gray-500 mt-0.5">Both parties have signed</p>
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
          {lease.ha_portion != null && (
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">Housing Authority pays (HAP)</span>
              <span className="text-sm font-semibold text-[#1D9E75]">− {fmtDollar(lease.ha_portion)}</span>
            </div>
          )}
          {lease.tenant_portion != null && (
            <div className="flex justify-between items-center py-2 bg-blue-50 rounded-lg px-3">
              <span className="text-sm font-bold text-[#1B3A6B]">Your portion</span>
              <span className="text-sm font-bold text-[#1B3A6B]">{fmtDollar(lease.tenant_portion)}/mo</span>
            </div>
          )}
          {lease.security_deposit != null && (
            <div className="flex justify-between py-1.5 border-t border-gray-100">
              <span className="text-sm text-gray-500">Security deposit paid</span>
              <span className="text-sm font-semibold text-gray-700">{fmtDollar(lease.security_deposit)}</span>
            </div>
          )}
          {lease.late_fee_amount != null && (
            <div className="flex justify-between py-1.5 border-t border-gray-100">
              <span className="text-sm text-gray-500">Late fee (after {lease.late_fee_grace_days || 5} days)</span>
              <span className="text-sm font-semibold text-gray-700">{fmtDollar(lease.late_fee_amount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Lease terms */}
      {(lease.utilities_included?.length > 0 ||
        lease.pets_allowed !== false ||
        lease.parking_included !== false ||
        lease.additional_terms ||
        lease.special_provisions) && (
        <div className="bg-white rounded-xl p-4 space-y-2.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Lease Terms</p>
          {lease.utilities_included?.length > 0 && (
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-600 shrink-0">Utilities included</span>
              <span className="text-sm font-medium text-gray-900 text-right">{lease.utilities_included.join(', ')}</span>
            </div>
          )}
          {lease.pets_allowed && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Pets</span>
              <span className="text-sm font-medium text-gray-900">
                Allowed{lease.pet_deposit != null ? ` (${fmtDollar(lease.pet_deposit)} deposit)` : ''}
              </span>
            </div>
          )}
          {lease.parking_included && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Parking</span>
              <span className="text-sm font-medium text-gray-900">
                {lease.parking_spaces || 1} space{lease.parking_spaces > 1 ? 's' : ''} included
              </span>
            </div>
          )}
          {lease.additional_terms && (
            <div className="pt-1 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Additional terms</p>
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{lease.additional_terms}</p>
            </div>
          )}
          {lease.special_provisions && (
            <div className="pt-1 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Special provisions</p>
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{lease.special_provisions}</p>
            </div>
          )}
        </div>
      )}

      {/* Uploaded PDF link */}
      {lease.lease_type === 'uploaded' && lease.document_url && (
        <div className="bg-white rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Lease Document
          </p>
          <a href={lease.document_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 border border-[#1B3A6B] text-[#1B3A6B] rounded-lg py-2.5 text-sm font-semibold hover:bg-[#EEF5FF] transition-colors">
            <ExternalLink className="w-4 h-4" /> View Lease PDF
          </a>
        </div>
      )}

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
        <button onClick={() => navigate('/tenant/rent')}
          className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-gray-700 hover:bg-gray-50">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#1D9E75]" />
            <span>Pay rent</span>
          </div>
          <ChevronLeft className="w-4 h-4 text-gray-400 rotate-180" />
        </button>
        <button onClick={() => navigate('/tenant/maintenance')}
          className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-gray-700 hover:bg-gray-50">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-[#1B3A6B]" />
            <span>Submit maintenance request</span>
          </div>
          <ChevronLeft className="w-4 h-4 text-gray-400 rotate-180" />
        </button>
      </div>

      <div className="h-8" />
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function TenantLeaseDetails() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [lease, setLease] = useState(null)
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) fetchLease() }, [user])

  async function fetchLease() {
    setLoading(true)

    // 1. Check profile for active lease
    const { data: prof } = await supabase
      .from('profiles')
      .select('active_lease_id, property_id, landlord_id')
      .eq('id', user.id)
      .single()

    let leaseData = null
    let propId = prof?.property_id || null

    if (prof?.active_lease_id) {
      const { data } = await supabase
        .from('leases')
        .select('*')
        .eq('id', prof.active_lease_id)
        .single()
      leaseData = data
    }

    // 2. If no active lease, look for pending_tenant_signature
    if (!leaseData) {
      const { data } = await supabase
        .from('leases')
        .select('*')
        .eq('tenant_id', user.id)
        .eq('status', 'pending_tenant_signature')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      leaseData = data
      if (leaseData) propId = leaseData.property_id
    }

    // 3. Fetch property
    if (propId) {
      const { data: propData } = await supabase
        .from('properties')
        .select('street_address, unit_number, neighborhood, city, state, zip_code, bedrooms, bathrooms')
        .eq('id', propId)
        .single()
      setProperty(propData)
    }

    setLease(leaseData)
    setLoading(false)
  }

  const headerSub = property
    ? `${property.neighborhood} · ${property.bedrooms === 0 ? 'Studio' : `${property.bedrooms} BR`}`
    : null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!lease) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-[#1B3A6B] px-4 pt-10 pb-5 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white"><ChevronLeft className="w-6 h-6" /></button>
          <h1 className="text-white text-lg font-bold">My Lease</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-600 font-semibold">No lease yet</p>
          <p className="text-gray-400 text-sm mt-2 max-w-xs">
            Once your landlord creates a lease agreement, it will appear here for your signature.
          </p>
          <button onClick={() => navigate('/tenant')} className="mt-6 text-[#1B3A6B] text-sm font-semibold">
            ← Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-5">
        <button onClick={() => navigate(-1)} className="text-blue-200 text-sm mb-3 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-white text-2xl font-bold">My Lease</h1>
        {headerSub && <p className="text-blue-200 text-sm mt-0.5">{headerSub}</p>}
      </div>

      {lease.status === 'pending_tenant_signature' ? (
        <PendingSignatureView
          lease={lease}
          property={property}
          onSigned={() => { setLease(null); fetchLease() }}
        />
      ) : (
        <ActiveLeaseView lease={lease} property={property} />
      )}
    </div>
  )
}
