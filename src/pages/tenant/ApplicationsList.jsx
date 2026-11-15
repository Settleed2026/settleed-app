import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import BottomNav from '../../components/BottomNav'
import toast from 'react-hot-toast'
import { Clock, CheckCircle2, XCircle, Home, ChevronRight, FileText, AlertCircle, CalendarClock, Star } from 'lucide-react'

const STATUS_CONFIG = {
  pending:            { label: 'Submitted',          color: 'text-amber-600 bg-amber-50',   icon: Clock },
  reviewing:          { label: 'Under Review',        color: 'text-blue-700 bg-blue-50',     icon: FileText },
  info_requested:     { label: 'Info Requested',      color: 'text-purple-700 bg-purple-50', icon: AlertCircle },
  showing_scheduled:  { label: 'Showing Scheduled',   color: 'text-cyan-700 bg-cyan-50',     icon: CalendarClock },
  selected:           { label: "You're Selected! 🎉", color: 'text-green-800 bg-green-50',   icon: Star },
  approved:           { label: 'Approved',            color: 'text-green-700 bg-green-50',   icon: CheckCircle2 },
  rejected:           { label: 'Not Selected',        color: 'text-red-600 bg-red-50',       icon: XCircle },
  withdrawn:          { label: 'Withdrawn',           color: 'text-gray-600 bg-gray-100',    icon: XCircle },
}

// ─── Slot Picker Modal ────────────────────────────────────────────────────────
function SlotPickerModal({ application, onClose, onConfirmed }) {
  const [chosen, setChosen] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const slots = application.showing_proposed_times || []

  async function confirm() {
    if (!chosen) return
    setSubmitting(true)
    const { error } = await supabase
      .from('applications')
      .update({ showing_confirmed_at: chosen, showing_tenant_choice: chosen })
      .eq('id', application.id)
    if (error) {
      toast.error('Failed to confirm. Try again.')
    } else {
      toast.success('Showing confirmed!')
      onConfirmed(chosen)
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl px-4 pt-5 pb-10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Pick a Showing Time</h3>
          <button onClick={onClose} className="text-gray-400 text-lg leading-none">✕</button>
        </div>
        <p className="text-xs text-gray-500">The landlord proposed the following times. Pick the one that works best for you.</p>
        <div className="space-y-2">
          {slots.map((slot, i) => (
            <button key={i} type="button" onClick={() => setChosen(slot)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm border-2 transition-all ${
                chosen === slot ? 'border-[#1B3A6B] bg-[#EEF5FF] text-[#1B3A6B] font-semibold' : 'border-gray-100 text-gray-700'
              }`}>
              {new Date(slot).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </button>
          ))}
        </div>
        <button onClick={confirm} disabled={!chosen || submitting}
          className="w-full bg-[#1B3A6B] text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-40">
          Confirm This Time
        </button>
      </div>
    </div>
  )
}

// ─── RFTA Prompt Modal ────────────────────────────────────────────────────────
function RFTAPromptModal({ application, onClose }) {
  const address = application.properties?.neighborhood || 'this property'
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl px-4 pt-5 pb-10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">🎉 You've Been Selected!</h3>
          <button onClick={onClose} className="text-gray-400 text-lg leading-none">✕</button>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          Congratulations! The landlord at <strong>{address}</strong> has selected you as their tenant.
        </p>
        <div className="bg-[#EEF5FF] rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-[#1B3A6B]">📋 Next Step: Request for Tenancy Approval (RFTA)</p>
          <p className="text-xs text-gray-600 leading-relaxed">
            Because you have a Housing Choice Voucher (Section 8), your housing authority must inspect the unit and approve it before you can move in.
          </p>
          <ol className="text-xs text-gray-600 space-y-1 ml-4 list-decimal">
            <li>Contact your housing authority and let them know you've been selected.</li>
            <li>Provide this address to your housing authority.</li>
            <li>Your housing authority will schedule an inspection and issue the RFTA form.</li>
            <li>Once approved, sign your lease through the app.</li>
          </ol>
        </div>
        <button onClick={onClose}
          className="w-full bg-[#1D9E75] text-white rounded-xl py-3 font-semibold text-sm">
          Got it — I'll contact my housing authority
        </button>
      </div>
    </div>
  )
}

function ApplicationCard({ application, onActionComplete }) {
  const navigate = useNavigate()
  const p = application.properties
  const status = STATUS_CONFIG[application.status] || STATUS_CONFIG.pending
  const Icon = status.icon
  const beds = p?.bedrooms === 0 ? 'Studio' : `${p?.bedrooms} BR`
  const photo = p?.photos?.[0]
  const appliedDate = new Date(application.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
  const needsAction = application.status === 'info_requested' || application.status === 'showing_scheduled'
  const [showSlotPicker, setShowSlotPicker] = useState(false)
  const [showRFTA, setShowRFTA] = useState(false)
  const alreadyConfirmed = !!application.showing_confirmed_at

  return (
    <>
      <div
        className={`bg-white rounded-xl overflow-hidden border ${needsAction ? 'border-purple-300' : application.status === 'selected' ? 'border-green-300' : 'border-gray-100'} shadow-sm`}>
        {/* Main row */}
        <div onClick={() => navigate(`/tenant/listing/${p?.id}`)}
          className="p-3 flex items-center gap-3 cursor-pointer active:bg-gray-50 transition-colors">
          <div className="relative shrink-0">
            {photo
              ? <img src={photo} alt="" className="w-16 h-16 rounded-xl object-cover" />
              : <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Home className="w-6 h-6 text-gray-300" />
                </div>
            }
            {needsAction && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{p?.neighborhood || 'Property'}</p>
            <p className="text-xs text-gray-500">{beds} · {p?.city || p?.zip_code}</p>
            <p className="text-sm font-bold text-[#1B3A6B]">${p?.rent_amount?.toLocaleString()}/mo</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Applied {appliedDate}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full ${status.color}`}>
              <Icon className="w-3 h-3" />
              {status.label}
            </span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        </div>

        {/* Showing CTA */}
        {application.status === 'showing_scheduled' && (application.showing_proposed_times?.length > 0) && (
          <div className="border-t border-cyan-100 bg-cyan-50 px-3 py-2.5">
            {alreadyConfirmed ? (
              <p className="text-xs text-cyan-800 font-semibold">
                ✓ Confirmed: {new Date(application.showing_confirmed_at).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })}
              </p>
            ) : (
              <button onClick={() => setShowSlotPicker(true)}
                className="w-full flex items-center justify-center gap-1.5 bg-[#1B3A6B] text-white rounded-xl py-2 text-xs font-semibold">
                <CalendarClock className="w-3.5 h-3.5" /> Pick a Showing Time
              </button>
            )}
          </div>
        )}

        {/* Info requested CTA */}
        {application.status === 'info_requested' && (
          <div className="border-t border-purple-100 bg-purple-50 px-3 py-2.5">
            <button onClick={() => navigate('/tenant/messages')}
              className="w-full flex items-center justify-center gap-1.5 bg-purple-600 text-white rounded-xl py-2 text-xs font-semibold">
              <AlertCircle className="w-3.5 h-3.5" /> Check Your Messages
            </button>
          </div>
        )}

        {/* Selected — RFTA CTA */}
        {application.status === 'selected' && (
          <div className="border-t border-green-100 bg-green-50 px-3 py-2.5">
            <button onClick={() => setShowRFTA(true)}
              className="w-full flex items-center justify-center gap-1.5 bg-[#1D9E75] text-white rounded-xl py-2 text-xs font-semibold">
              <Star className="w-3.5 h-3.5" /> What Happens Next? (RFTA)
            </button>
          </div>
        )}
      </div>

      {showSlotPicker && (
        <SlotPickerModal
          application={application}
          onClose={() => setShowSlotPicker(false)}
          onConfirmed={slot => { setShowSlotPicker(false); onActionComplete && onActionComplete(application.id, { showing_confirmed_at: slot }) }}
        />
      )}
      {showRFTA && <RFTAPromptModal application={application} onClose={() => setShowRFTA(false)} />}
    </>
  )
}

const FILTERS = ['All', 'Pending', 'Showing', 'Selected', 'Declined']

export default function ApplicationsList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    async function fetchApplications() {
      if (!user) return
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id, status, created_at,
          showing_proposed_times, showing_confirmed_at, showing_tenant_choice,
          properties:property_id(id, neighborhood, city, zip_code, bedrooms, rent_amount, photos)
        `)
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false })
      if (!error) setApplications(data || [])
      setLoading(false)
    }
    fetchApplications()
  }, [user])

  function handleActionComplete(appId, updates) {
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, ...updates } : a))
  }

  const filtered = applications.filter(a => {
    if (filter === 'All') return true
    if (filter === 'Pending') return ['pending', 'reviewing', 'info_requested'].includes(a.status)
    if (filter === 'Showing') return a.status === 'showing_scheduled'
    if (filter === 'Selected') return ['selected', 'approved'].includes(a.status)
    if (filter === 'Declined') return a.status === 'rejected'
    return true
  })

  const counts = {
    pending:  applications.filter(a => ['pending','reviewing','info_requested'].includes(a.status)).length,
    showing:  applications.filter(a => a.status === 'showing_scheduled').length,
    selected: applications.filter(a => ['selected','approved'].includes(a.status)).length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-6">
        <h1 className="text-white text-2xl font-bold">My Applications</h1>
        <p className="text-blue-200 text-sm mt-1">{applications.length} total</p>
        {applications.length > 0 && (
          <div className="flex gap-3 mt-4">
            <div className="bg-white/10 rounded-xl px-3 py-2 text-center flex-1">
              <p className="text-white font-bold text-lg">{applications.length}</p>
              <p className="text-blue-200 text-[10px] font-medium">Applied</p>
            </div>
            <div className="bg-white/10 rounded-xl px-3 py-2 text-center flex-1">
              <p className="text-amber-300 font-bold text-lg">{counts.pending}</p>
              <p className="text-blue-200 text-[10px] font-medium">Pending</p>
            </div>
            <div className="bg-white/10 rounded-xl px-3 py-2 text-center flex-1">
              <p className="text-green-300 font-bold text-lg">{counts.selected}</p>
              <p className="text-blue-200 text-[10px] font-medium">Selected</p>
            </div>
          </div>
        )}
      </div>

      {applications.length > 0 && (
        <div className="px-4 pt-4 flex gap-2 overflow-x-auto">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                filter === f ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200'
              }`}>
              {f}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          <>
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-xl p-3 flex gap-3 animate-pulse border border-gray-100">
                <div className="w-16 h-16 bg-gray-200 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-3 bg-gray-200 rounded w-20" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
              </div>
            ))}
          </>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 mt-6">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-300" />
            </div>
            {applications.length === 0 ? (
              <>
                <p className="text-gray-700 font-semibold text-base">No applications yet</p>
                <p className="text-gray-400 text-sm mt-2 mb-5">Apply to listings with your Section 8 voucher and they appear here.</p>
                <button onClick={() => navigate('/tenant/search')}
                  className="bg-[#1D9E75] text-white px-6 py-3 rounded-xl text-sm font-semibold">
                  Browse Listings
                </button>
              </>
            ) : (
              <p className="text-gray-400 text-sm">No {filter.toLowerCase()} applications</p>
            )}
          </div>
        ) : (
          filtered.map(app => (
            <ApplicationCard key={app.id} application={app}
              onActionComplete={handleActionComplete} />
          ))
        )}
      </div>

      <BottomNav role="tenant" />
    </div>
  )
}
