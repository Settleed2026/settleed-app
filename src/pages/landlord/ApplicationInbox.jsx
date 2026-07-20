import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import BottomNav from '../../components/BottomNav'
import toast from 'react-hot-toast'
import {
  User, Home, Calendar, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Key, Clock, FileText,
} from 'lucide-react'

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'bg-amber-100 text-amber-700' },
  reviewing: { label: 'Reviewing', color: 'bg-blue-100 text-blue-700' },
  approved:  { label: 'Approved',  color: 'bg-green-100 text-green-700' },
  rejected:  { label: 'Declined',  color: 'bg-red-100 text-red-700' },
  withdrawn: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-500' },
}

function LeaseModal({ application, property, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const oneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [form, setForm] = useState({
    lease_start_date: today,
    lease_end_date: oneYear,
    rent_amount: property?.rent_amount?.toString() || '',
    ha_portion: '',
    tenant_portion: '',
    hap_contract_number: '',
    recertification_date: '',
  })

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'ha_portion' || name === 'rent_amount') {
        const rent = parseFloat(name === 'rent_amount' ? value : next.rent_amount) || 0
        const ha   = parseFloat(name === 'ha_portion'  ? value : next.ha_portion)  || 0
        next.tenant_portion = rent > ha ? (rent - ha).toFixed(2) : '0.00'
      }
      return next
    })
  }

  async function handleActivate(e) {
    e.preventDefault()
    if (!form.lease_start_date || !form.rent_amount) {
      toast.error('Lease start date and rent amount are required.')
      return
    }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/activate-lease', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ application_id: application.id, ...form }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to activate lease.')
      toast.success('Lease activated! Tenant can now pay rent and submit maintenance requests.')
      onSuccess()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]'
  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Activate Lease</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {application.tenant_name} · {property?.neighborhood}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-light">✕</button>
        </div>

        <div className="bg-[#EEF5FF] rounded-xl p-3 mb-4">
          <p className="text-xs text-[#1B3A6B] font-medium leading-relaxed">
            This will mark the property as Rented, approve this application, and unlock
            rent payments and maintenance requests for the tenant.
          </p>
        </div>

        <form onSubmit={handleActivate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Lease Start *</label>
              <input name="lease_start_date" type="date" required value={form.lease_start_date}
                onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Lease End</label>
              <input name="lease_end_date" type="date" value={form.lease_end_date}
                onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Total Monthly Rent *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input name="rent_amount" type="number" step="0.01" required value={form.rent_amount}
                onChange={handleChange} className={`${inputClass} pl-6`} placeholder="1200.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>HA Pays (HAP)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input name="ha_portion" type="number" step="0.01" value={form.ha_portion}
                  onChange={handleChange} className={`${inputClass} pl-6`} placeholder="900.00" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Tenant Pays</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input name="tenant_portion" type="number" step="0.01" value={form.tenant_portion}
                  onChange={handleChange} className={`${inputClass} pl-6`} placeholder="300.00" />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>HAP Contract # <span className="text-gray-400 font-normal">(optional)</span></label>
            <input name="hap_contract_number" type="text" value={form.hap_contract_number}
              onChange={handleChange} className={inputClass} placeholder="AHA-2024-XXXXX" />
          </div>

          <div>
            <label className={labelClass}>Recertification Date <span className="text-gray-400 font-normal">(optional)</span></label>
            <input name="recertification_date" type="date" value={form.recertification_date}
              onChange={handleChange} className={inputClass} />
            <p className="text-[10px] text-gray-400 mt-1">
              Settleed will remind you at 90, 60, and 30 days out.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#1B3A6B] text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {loading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Key className="w-4 h-4" /> Activate Lease</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ApplicationCard({ app, onStatusChange, onActivate }) {
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)
  const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending

  async function updateStatus(newStatus) {
    setUpdating(true)
    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', app.id)
    if (error) {
      toast.error('Failed to update status.')
    } else {
      toast.success(newStatus === 'approved' ? 'Application approved.' : 'Application declined.')
      onStatusChange(app.id, newStatus)
    }
    setUpdating(false)
  }

  const moveIn = app.desired_move_in
    ? new Date(app.desired_move_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Top row */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#EEF5FF] flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-[#1B3A6B]" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{app.tenant_name}</p>
              <p className="text-xs text-gray-500 truncate">{app.property_address}</p>
            </div>
          </div>
          <span className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>

        {/* Voucher / household chips */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {app.housing_authority && (
            <span className="text-[11px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full border border-gray-100">
              {app.housing_authority}
            </span>
          )}
          {app.voucher_size != null && (
            <span className="text-[11px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full border border-gray-100">
              {app.voucher_size === 0 ? 'Studio' : `${app.voucher_size} BR`} voucher
            </span>
          )}
          {app.household_size && (
            <span className="text-[11px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full border border-gray-100">
              {app.household_size} in household
            </span>
          )}
          {moveIn && (
            <span className="text-[11px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full border border-gray-100 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {moveIn}
            </span>
          )}
        </div>

        <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Applied {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Expandable message */}
      {app.message && (
        <div className="border-t border-gray-50">
          <button
            onClick={() => setExpanded(p => !p)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Message from applicant
            </span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {expanded && (
            <div className="px-4 pb-3">
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">{app.message}</p>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {(app.status === 'pending' || app.status === 'reviewing') && (
        <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
          <button
            onClick={() => updateStatus('rejected')}
            disabled={updating}
            className="flex-1 flex items-center justify-center gap-1.5 border border-red-200 text-red-600 rounded-lg py-2 text-xs font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" /> Decline
          </button>
          <button
            onClick={() => updateStatus('approved')}
            disabled={updating}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#1D9E75] text-white rounded-lg py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Approve
          </button>
        </div>
      )}

      {app.status === 'approved' && !app.lease_activated && (
        <div className="border-t border-gray-100 px-4 py-3">
          <button
            onClick={() => onActivate(app)}
            className="w-full flex items-center justify-center gap-2 bg-[#1B3A6B] text-white rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-colors"
          >
            <Key className="w-4 h-4" /> Activate Lease
          </button>
          <p className="text-[10px] text-gray-400 text-center mt-1.5">
            Unlocks rent payment &amp; maintenance for this tenant
          </p>
        </div>
      )}

      {app.lease_activated && (
        <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-center gap-2 text-[#1D9E75] text-xs font-semibold">
          <CheckCircle className="w-4 h-4" /> Lease Active
        </div>
      )}
    </div>
  )
}

export default function ApplicationInbox() {
  const { user } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [leaseModal, setLeaseModal] = useState(null)

  const fetchApplications = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('applications')
      .select(`
        id, status, message, desired_move_in, household_size,
        housing_authority, voucher_size, created_at,
        property:property_id(id, neighborhood, street_address, unit_number, rent_amount),
        tenant:tenant_id(id, full_name, email, active_lease_id)
      `)
      .eq('landlord_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load applications.')
      console.error(error)
    } else {
      setApplications((data || []).map(app => ({
        ...app,
        tenant_name: app.tenant?.full_name || app.tenant?.email || 'Applicant',
        property_address: app.property
          ? `${app.property.neighborhood}${app.property.street_address ? ` · ${app.property.street_address}` : ''}`
          : 'Unknown property',
        lease_activated: !!app.tenant?.active_lease_id,
      })))
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetchApplications() }, [fetchApplications])

  function handleStatusChange(appId, newStatus) {
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a))
  }

  const filtered = filter === 'all' ? applications
    : filter === 'pending' ? applications.filter(a => a.status === 'pending' || a.status === 'reviewing')
    : applications.filter(a => a.status === filter)

  const counts = {
    all:      applications.length,
    pending:  applications.filter(a => a.status === 'pending' || a.status === 'reviewing').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-5">
        <h1 className="text-white text-lg font-bold">Applications</h1>
        <p className="text-blue-200 text-xs mt-0.5">
          {counts.pending > 0
            ? `${counts.pending} application${counts.pending === 1 ? '' : 's'} need your review`
            : 'All caught up'}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="bg-white border-b border-gray-100 px-4 flex gap-1 overflow-x-auto">
        {[
          { key: 'all',      label: 'All' },
          { key: 'pending',  label: 'To Review' },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Declined' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`shrink-0 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              filter === tab.key
                ? 'border-[#1B3A6B] text-[#1B3A6B]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                filter === tab.key ? 'bg-[#1B3A6B] text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                    <div className="h-3 bg-gray-200 rounded w-48" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Home className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium text-sm">No applications here</p>
            <p className="text-gray-400 text-xs mt-1">
              {filter === 'all'
                ? 'Applications appear here when tenants apply to your listings.'
                : `No ${filter} applications yet.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(app => (
              <ApplicationCard
                key={app.id}
                app={app}
                onStatusChange={handleStatusChange}
                onActivate={application => setLeaseModal({ application, property: application.property })}
              />
            ))}
          </div>
        )}
      </div>

      {leaseModal && (
        <LeaseModal
          application={leaseModal.application}
          property={leaseModal.property}
          onClose={() => setLeaseModal(null)}
          onSuccess={() => { setLeaseModal(null); fetchApplications() }}
        />
      )}

      <BottomNav role="landlord" />
    </div>
  )
}
