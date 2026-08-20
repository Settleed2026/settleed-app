// src/pages/landlord/RFTATracker.jsx
// RFTA (Request for Tenancy Approval) tracker for landlords
// Track each submission through: draft → submitted → ha_reviewing → inspection → approved/denied

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Plus, ChevronRight, FileText, Calendar,
  CheckCircle2, XCircle, Clock, AlertCircle, Home,
  Upload, ChevronDown, X,
} from 'lucide-react'

const STATUS_CONFIG = {
  draft:                { label: 'Draft',               color: 'text-gray-600 bg-gray-100',   icon: FileText,     step: 0 },
  submitted:            { label: 'Submitted to HA',     color: 'text-blue-700 bg-blue-50',    icon: Clock,        step: 1 },
  ha_reviewing:         { label: 'HA Reviewing',        color: 'text-amber-700 bg-amber-50',  icon: AlertCircle,  step: 2 },
  inspection_scheduled: { label: 'Inspection Scheduled',color: 'text-purple-700 bg-purple-50',icon: Calendar,     step: 3 },
  inspection_passed:    { label: 'Inspection Passed',   color: 'text-green-700 bg-green-50',  icon: CheckCircle2, step: 4 },
  inspection_failed:    { label: 'Inspection Failed',   color: 'text-red-700 bg-red-50',      icon: XCircle,      step: 4 },
  approved:             { label: 'Approved',            color: 'text-green-700 bg-green-50',  icon: CheckCircle2, step: 5 },
  denied:               { label: 'Denied',              color: 'text-red-700 bg-red-50',      icon: XCircle,      step: 5 },
}

const STATUS_STEPS = ['draft','submitted','ha_reviewing','inspection_scheduled','inspection_passed','approved']

const HA_OPTIONS = ['AHA','DCA','Cobb County HA','DeKalb County HA','Gwinnett County HA','Other']

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]'
const labelClass = 'text-xs text-gray-500 mb-1 block'

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  )
}

function ProgressBar({ status }) {
  const current = STATUS_CONFIG[status]?.step ?? 0
  const total = 5
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total + 1 }).map((_, i) => (
        <div key={i} className={`h-1.5 rounded-full flex-1 ${i <= current ? 'bg-[#1D9E75]' : 'bg-gray-200'}`} />
      ))}
    </div>
  )
}

export default function RFTATracker() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [rftaList, setRftaList]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [openId, setOpenId]         = useState(null)
  const [showNew, setShowNew]       = useState(false)
  const [applications, setApplications] = useState([])

  // New RFTA form state
  const [newForm, setNewForm] = useState({
    application_id: '', ha_name: 'AHA', submitted_date: '', inspection_date: '',
    rent_approved: '', lease_start_date: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    fetchData()
  }, [user?.id])

  async function fetchData() {
    const [{ data: rftas }, { data: apps }] = await Promise.all([
      supabase
        .from('rfta_submissions')
        .select(`
          *,
          properties:property_id(street_address, neighborhood, bedrooms, photos),
          tenant:tenant_id(full_name)
        `)
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('applications')
        .select('id, status, properties:property_id(street_address, neighborhood, bedrooms), profiles:tenant_id(full_name)')
        .eq('landlord_id', user.id)
        .eq('status', 'approved'),
    ])
    setRftaList(rftas || [])
    setApplications(apps || [])
    setLoading(false)
  }

  async function createRFTA() {
    if (!newForm.application_id) { toast.error('Select an application first'); return }
    setSaving(true)
    const app = applications.find(a => a.id === newForm.application_id)
    if (!app) { toast.error('Application not found'); setSaving(false); return }

    const { data: appFull } = await supabase
      .from('applications')
      .select('tenant_id, property_id')
      .eq('id', newForm.application_id)
      .single()

    const { error } = await supabase.from('rfta_submissions').insert({
      application_id: newForm.application_id,
      property_id: appFull.property_id,
      tenant_id: appFull.tenant_id,
      landlord_id: user.id,
      ha_name: newForm.ha_name,
      submitted_date: newForm.submitted_date || null,
      status: newForm.submitted_date ? 'submitted' : 'draft',
      notes: newForm.notes || null,
    })
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('RFTA created!')
    setShowNew(false)
    setNewForm({ application_id: '', ha_name: 'AHA', submitted_date: '', inspection_date: '', rent_approved: '', lease_start_date: '', notes: '' })
    fetchData()
    setSaving(false)
  }

  async function updateStatus(rfta, newStatus) {
    const updates = { status: newStatus }
    if (newStatus === 'approved') updates.approved_date = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('rfta_submissions').update(updates).eq('id', rfta.id)
    if (error) { toast.error(error.message); return }
    toast.success(`Status updated to "${STATUS_CONFIG[newStatus]?.label}"`)
    setRftaList(prev => prev.map(r => r.id === rfta.id ? { ...r, ...updates } : r))
  }

  async function updateField(id, field, value) {
    await supabase.from('rfta_submissions').update({ [field]: value || null }).eq('id', id)
    setRftaList(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const active   = rftaList.filter(r => !['approved','denied'].includes(r.status))
  const resolved = rftaList.filter(r =>  ['approved','denied'].includes(r.status))

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-5">
        <button onClick={() => navigate('/landlord')} className="text-blue-200 flex items-center gap-1.5 text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">RFTA Tracker</h1>
            <p className="text-blue-200 text-xs mt-0.5">Request for Tenancy Approval pipeline</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 bg-[#1D9E75] text-white px-3 py-2 rounded-xl text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> New RFTA
          </button>
        </div>
      </div>

      {/* Stats row */}
      {rftaList.length > 0 && (
        <div className="mx-4 -mt-3 bg-white rounded-xl shadow-sm border border-gray-100 grid grid-cols-3 divide-x divide-gray-100">
          <div className="py-3 text-center">
            <p className="text-xl font-bold text-gray-900">{active.length}</p>
            <p className="text-[10px] text-gray-500">Active</p>
          </div>
          <div className="py-3 text-center">
            <p className="text-xl font-bold text-green-600">{rftaList.filter(r => r.status === 'approved').length}</p>
            <p className="text-[10px] text-gray-500">Approved</p>
          </div>
          <div className="py-3 text-center">
            <p className="text-xl font-bold text-amber-500">{rftaList.filter(r => r.status === 'inspection_scheduled').length}</p>
            <p className="text-[10px] text-gray-500">Inspection</p>
          </div>
        </div>
      )}

      <div className="px-4 mt-5 space-y-4">
        {loading && [1,2].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 animate-pulse border border-gray-100">
            <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
        ))}

        {!loading && rftaList.length === 0 && (
          <div className="text-center py-14">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-[#1B3A6B]" />
            </div>
            <p className="font-semibold text-gray-800">No RFTAs yet</p>
            <p className="text-gray-400 text-sm mt-1 mb-4">Track your Request for Tenancy Approval submissions here</p>
            <button onClick={() => setShowNew(true)}
              className="bg-[#1B3A6B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
              Create first RFTA
            </button>
          </div>
        )}

        {/* Active RFTAs */}
        {active.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">In Progress ({active.length})</p>
            <div className="space-y-3">
              {active.map(rfta => <RFTACard key={rfta.id} rfta={rfta} open={openId === rfta.id}
                onToggle={() => setOpenId(openId === rfta.id ? null : rfta.id)}
                onStatusChange={updateStatus} onFieldUpdate={updateField} />)}
            </div>
          </div>
        )}

        {/* Resolved */}
        {resolved.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Resolved ({resolved.length})</p>
            <div className="space-y-3">
              {resolved.map(rfta => <RFTACard key={rfta.id} rfta={rfta} open={openId === rfta.id}
                onToggle={() => setOpenId(openId === rfta.id ? null : rfta.id)}
                onStatusChange={updateStatus} onFieldUpdate={updateField} />)}
            </div>
          </div>
        )}
      </div>

      {/* New RFTA modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">New RFTA submission</h2>
              <button onClick={() => setShowNew(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Approved application *</label>
                <select value={newForm.application_id} onChange={e => setNewForm(p => ({ ...p, application_id: e.target.value }))}
                  className={`${inputClass} bg-white`}>
                  <option value="">Select an approved application</option>
                  {applications.map(app => (
                    <option key={app.id} value={app.id}>
                      {app.profiles?.full_name} — {app.properties?.neighborhood || app.properties?.street_address}
                    </option>
                  ))}
                </select>
                {applications.length === 0 && <p className="text-xs text-amber-600 mt-1">No approved applications found. Approve an application first.</p>}
              </div>
              <div>
                <label className={labelClass}>Housing authority</label>
                <select value={newForm.ha_name} onChange={e => setNewForm(p => ({ ...p, ha_name: e.target.value }))}
                  className={`${inputClass} bg-white`}>
                  {HA_OPTIONS.map(ha => <option key={ha} value={ha}>{ha}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Date submitted to HA (if already submitted)</label>
                <input type="date" value={newForm.submitted_date}
                  onChange={e => setNewForm(p => ({ ...p, submitted_date: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea value={newForm.notes} onChange={e => setNewForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} placeholder="Reference numbers, HA contact info, anything useful…" className={`${inputClass} resize-none`} />
              </div>
              <button onClick={createRFTA} disabled={saving || !newForm.application_id}
                className="w-full bg-[#1B3A6B] text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40">
                {saving ? 'Creating…' : 'Create RFTA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RFTACard({ rfta, open, onToggle, onStatusChange, onFieldUpdate }) {
  const prop    = rfta.properties
  const tenant  = rfta.tenant
  const address = prop?.neighborhood || prop?.street_address || 'Property'
  const cfg     = STATUS_CONFIG[rfta.status] || STATUS_CONFIG.draft

  const NEXT_STATUSES = {
    draft:                ['submitted'],
    submitted:            ['ha_reviewing'],
    ha_reviewing:         ['inspection_scheduled','denied'],
    inspection_scheduled: ['inspection_passed','inspection_failed'],
    inspection_passed:    ['approved'],
    inspection_failed:    ['inspection_scheduled','denied'],
    approved:             [],
    denied:               [],
  }

  const nextOptions = NEXT_STATUSES[rfta.status] || []

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button onClick={onToggle} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-sm text-gray-900 truncate">{address}</p>
              {prop?.bedrooms != null && (
                <span className="text-xs text-gray-400 shrink-0">{prop.bedrooms === 0 ? 'Studio' : `${prop.bedrooms}BR`}</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-2">{tenant?.full_name || 'Tenant'} · {rfta.ha_name || 'HA'}</p>
            <StatusBadge status={rfta.status} />
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform mt-1 ${open ? 'rotate-180' : ''}`} />
        </div>
        <div className="mt-3">
          <ProgressBar status={rfta.status} />
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
          {/* Key dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Submitted date</label>
              <input type="date" defaultValue={rfta.submitted_date || ''}
                onBlur={e => onFieldUpdate(rfta.id, 'submitted_date', e.target.value)}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Inspection date</label>
              <input type="date" defaultValue={rfta.inspection_date || ''}
                onBlur={e => onFieldUpdate(rfta.id, 'inspection_date', e.target.value)}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Approved rent ($)</label>
              <input type="number" defaultValue={rfta.rent_approved || ''}
                onBlur={e => onFieldUpdate(rfta.id, 'rent_approved', e.target.value)}
                placeholder="0.00" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Lease start date</label>
              <input type="date" defaultValue={rfta.lease_start_date || ''}
                onBlur={e => onFieldUpdate(rfta.id, 'lease_start_date', e.target.value)}
                className={inputClass} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes</label>
            <textarea rows={2} defaultValue={rfta.notes || ''}
              onBlur={e => onFieldUpdate(rfta.id, 'notes', e.target.value)}
              placeholder="Reference numbers, HA contact, inspection results…"
              className={`${inputClass} resize-none bg-white`} />
          </div>

          {/* Status progression */}
          {nextOptions.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">Move to next stage:</p>
              <div className="flex flex-wrap gap-2">
                {nextOptions.map(s => {
                  const c = STATUS_CONFIG[s]
                  const Icon = c.icon
                  return (
                    <button key={s} onClick={() => onStatusChange(rfta, s)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border ${c.color} border-current`}>
                      <Icon className="w-3.5 h-3.5" /> {c.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {rfta.status === 'approved' && rfta.rent_approved && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-green-700 font-semibold text-sm">✓ Approved at ${parseFloat(rfta.rent_approved).toFixed(2)}/mo</p>
              {rfta.lease_start_date && <p className="text-green-600 text-xs mt-0.5">Lease starts {rfta.lease_start_date}</p>}
            </div>
          )}

          {rfta.status === 'denied' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-700 font-semibold text-sm">RFTA Denied</p>
              {rfta.denial_reason && <p className="text-red-600 text-xs mt-0.5">{rfta.denial_reason}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
