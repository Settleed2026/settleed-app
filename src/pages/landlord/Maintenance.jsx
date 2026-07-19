import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import BottomNav from '../../components/BottomNav'
import toast from 'react-hot-toast'
import { ChevronRight, Wrench, AlertTriangle, CheckCircle } from 'lucide-react'

const CATEGORIES = {
  plumbing:   { label: 'Plumbing',     icon: '🚿' },
  electrical: { label: 'Electrical',   icon: '⚡' },
  hvac:       { label: 'HVAC / Heat',  icon: '❄️' },
  appliance:  { label: 'Appliance',    icon: '🍳' },
  pest:       { label: 'Pest Control', icon: '🐛' },
  structural: { label: 'Structural',   icon: '🏠' },
  other:      { label: 'Other',        icon: '🔧' },
}

const STATUS_CONFIG = {
  submitted:    { label: 'Submitted',    color: 'bg-blue-100 text-blue-700' },
  acknowledged: { label: 'Acknowledged', color: 'bg-purple-100 text-purple-700' },
  in_progress:  { label: 'In Progress',  color: 'bg-amber-100 text-amber-700' },
  completed:    { label: 'Completed',    color: 'bg-green-100 text-green-700' },
  closed:       { label: 'Closed',       color: 'bg-gray-100 text-gray-600' },
}

const STATUS_TRANSITIONS = {
  submitted:    ['acknowledged', 'in_progress'],
  acknowledged: ['in_progress'],
  in_progress:  ['completed'],
  completed:    ['closed'],
  closed:       [],
}

export default function LandlordMaintenance() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [notes, setNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  const [filter, setFilter] = useState('open')

  useEffect(() => {
    if (user) fetchRequests()
  }, [user])

  async function fetchRequests() {
    setLoading(true)
    const { data } = await supabase
      .from('maintenance_requests')
      .select('*, property:property_id(street_address, unit_number, city), tenant:tenant_id(full_name)')
      .eq('landlord_id', user.id)
      .order('submitted_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  async function handleUpdateStatus(requestId, newStatus) {
    setUpdating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/update-maintenance', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ request_id: requestId, status: newStatus, landlord_notes: notes || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Request updated.')
      setSelected(null)
      setNotes('')
      fetchRequests()
    } catch (err) {
      toast.error(err.message || 'Could not update request.')
    } finally {
      setUpdating(false)
    }
  }

  async function handleSaveNotes(requestId) {
    setUpdating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/update-maintenance', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ request_id: requestId, landlord_notes: notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Notes saved.')
      fetchRequests()
    } catch (err) {
      toast.error(err.message || 'Could not save notes.')
    } finally {
      setUpdating(false)
    }
  }

  const openStatuses = ['submitted', 'acknowledged', 'in_progress']
  const filtered = requests.filter(r =>
    filter === 'open' ? openStatuses.includes(r.status) : ['completed', 'closed'].includes(r.status)
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Detail view
  if (selected) {
    const req = selected
    const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.submitted
    const cat = CATEGORIES[req.category] || { label: req.category, icon: '🔧' }
    const property = req.property
    const address = property
      ? `${property.street_address}${property.unit_number ? ` #${property.unit_number}` : ''}`
      : 'Property'
    const transitions = STATUS_TRANSITIONS[req.status] || []

    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-[#1B3A6B] px-4 pt-10 pb-5">
          <button onClick={() => { setSelected(null); setNotes('') }} className="text-blue-200 text-sm mb-3">← Back</button>
          <h1 className="text-white text-xl font-bold">Maintenance Request</h1>
        </div>

        <div className="px-4 pt-4 space-y-3">
          {/* Request info */}
          <div className="bg-white rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{cat.icon}</span>
                <span className="font-semibold text-gray-900">{cat.label}</span>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
            </div>
            <div className="text-xs text-gray-500">
              {req.tenant?.full_name || 'Tenant'} · {address} · {new Date(req.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            {req.urgency === 'emergency' && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-lg px-3 py-2 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4" /> Emergency — Respond immediately
              </div>
            )}
            {req.urgency === 'urgent' && (
              <div className="flex items-center gap-2 bg-amber-50 text-amber-700 rounded-lg px-3 py-2 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4" /> Urgent — Respond within 48 hours
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 mb-1">Tenant description</p>
              <p className="text-sm text-gray-700 leading-relaxed">{req.description}</p>
            </div>
          </div>

          {/* Photos */}
          {(req.photos || []).length > 0 && (
            <div className="bg-white rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 mb-3">Photos from tenant</p>
              <div className="grid grid-cols-3 gap-2">
                {req.photos.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {/* Landlord notes */}
          <div className="bg-white rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-900">Your Notes</p>
            <textarea
              value={notes || req.landlord_notes || ''}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add a note for the tenant (e.g. I'll have a plumber there Thursday between 9–11am)…"
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] resize-none"
            />
            <button
              onClick={() => handleSaveNotes(req.id)}
              disabled={updating}
              className="text-sm text-[#1B3A6B] font-semibold disabled:opacity-50"
            >
              {updating ? 'Saving…' : 'Save note'}
            </button>
          </div>

          {/* Status transitions */}
          {transitions.length > 0 && (
            <div className="bg-white rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-900">Update Status</p>
              {transitions.map(s => {
                const c = STATUS_CONFIG[s]
                return (
                  <button
                    key={s}
                    onClick={() => handleUpdateStatus(req.id, s)}
                    disabled={updating}
                    className={`w-full py-3 rounded-xl text-sm font-semibold border disabled:opacity-50 ${c.color} border-current/20`}
                  >
                    {updating ? 'Updating…' : `Mark as ${c.label}`}
                  </button>
                )
              })}
            </div>
          )}

          {req.status === 'completed' && (
            <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-xl px-4 py-3 text-sm font-semibold">
              <CheckCircle className="w-5 h-5" /> Marked as completed
            </div>
          )}
        </div>
        <BottomNav role="landlord" />
      </div>
    )
  }

  // List view
  const openCount = requests.filter(r => openStatuses.includes(r.status)).length

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-5">
        <button onClick={() => navigate('/landlord')} className="text-blue-200 text-sm mb-3">← Dashboard</button>
        <h1 className="text-white text-2xl font-bold">Maintenance</h1>
        <p className="text-blue-200 text-sm mt-0.5">{openCount} open request{openCount !== 1 ? 's' : ''}</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-4 pt-4">
        {['open', 'closed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              filter === f ? 'bg-[#1B3A6B] text-white' : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            {f === 'open' ? `Open (${openCount})` : 'History'}
          </button>
        ))}
      </div>

      <div className="px-4 pt-3 space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center">
            <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">{filter === 'open' ? 'No open requests.' : 'No completed requests yet.'}</p>
          </div>
        ) : (
          filtered.map(req => {
            const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.submitted
            const cat = CATEGORIES[req.category] || { label: req.category, icon: '🔧' }
            const property = req.property
            const address = property
              ? `${property.street_address}${property.unit_number ? ` #${property.unit_number}` : ''}`
              : 'Property'
            return (
              <button
                key={req.id}
                onClick={() => { setSelected(req); setNotes(req.landlord_notes || '') }}
                className="w-full bg-white rounded-xl p-4 flex items-center justify-between text-left shadow-sm border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${req.urgency === 'emergency' ? 'bg-red-50' : 'bg-gray-50'}`}>
                    {cat.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900">{cat.label}</span>
                      {req.urgency === 'emergency' && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{address}</div>
                    <div className="text-xs text-gray-400">{req.tenant?.full_name || 'Tenant'} · {new Date(req.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${cfg.color}`}>{cfg.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>
            )
          })
        )}
      </div>
      <BottomNav role="landlord" />
    </div>
  )
}
