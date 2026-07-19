import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { ClipboardCheck, AlertTriangle, CheckCircle2, Clock, XCircle, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

const RESULT_CONFIG = {
  pass: { label: 'Pass', color: 'text-green-700 bg-green-50 border-green-200', icon: CheckCircle2 },
  fail: { label: 'Fail', color: 'text-red-600 bg-red-50 border-red-200', icon: XCircle },
  scheduled: { label: 'Scheduled', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Clock },
  pending: { label: 'Pending', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock },
}

const COMMON_FAIL_ITEMS = [
  'Smoke detector missing or inoperable',
  'Carbon monoxide detector missing',
  'Peeling lead paint',
  'Window guards missing',
  'HVAC not functioning',
  'Hot water heater issue',
  'Plumbing leak',
  'Electrical hazard',
  'Pest infestation',
  'Roof leak',
  'Broken door/lock',
  'Mold or moisture damage',
]

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
}

function urgencyColor(days) {
  if (days === null) return 'text-gray-400'
  if (days < 0) return 'text-red-600'
  if (days <= 30) return 'text-red-500'
  if (days <= 90) return 'text-amber-500'
  return 'text-green-600'
}

function InspectionCard({ record, property, onEdit }) {
  const [expanded, setExpanded] = useState(false)
  const result = RESULT_CONFIG[record.result || 'pending']
  const Icon = result.icon
  const daysNext = daysUntil(record.next_inspection_date)

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{property?.neighborhood || 'Property'}</p>
            <p className="text-xs text-gray-400">{property?.zip_code}</p>
          </div>
          <span className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${result.color}`}>
            <Icon className="w-3 h-3" />
            {result.label}
          </span>
        </div>

        {record.hap_suspended && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            HAP payment suspended
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-gray-400">Last inspection</p>
            <p className="font-medium text-gray-700 mt-0.5">
              {record.inspection_date
                ? new Date(record.inspection_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Next inspection</p>
            <p className={`font-medium mt-0.5 ${urgencyColor(daysNext)}`}>
              {record.next_inspection_date
                ? <>
                    {new Date(record.next_inspection_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {daysNext !== null && (
                      <span className="ml-1 font-normal">
                        ({daysNext < 0 ? `${Math.abs(daysNext)}d overdue` : `${daysNext}d`})
                      </span>
                    )}
                  </>
                : '—'}
            </p>
          </div>
        </div>

        {record.result === 'fail' && record.failed_items?.length > 0 && (
          <button onClick={() => setExpanded(p => !p)}
            className="mt-3 flex items-center gap-1 text-xs text-red-600 font-medium">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {record.failed_items.length} failed item{record.failed_items.length !== 1 ? 's' : ''}
          </button>
        )}

        {expanded && record.failed_items?.length > 0 && (
          <div className="mt-2 space-y-1">
            {record.failed_items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-lg px-2.5 py-1.5">
                <XCircle className="w-3 h-3 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        )}

        {record.reinspection_scheduled && record.reinspection_date && (
          <div className="mt-2 bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
            Re-inspection scheduled: {new Date(record.reinspection_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        )}

        {record.notes && (
          <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 line-clamp-2">{record.notes}</p>
        )}
      </div>

      <div className="border-t border-gray-100 px-4 py-2.5">
        <button onClick={() => onEdit(record, property)}
          className="text-xs font-medium text-[#1B3A6B]">
          Update inspection record
        </button>
      </div>
    </div>
  )
}

function InspectionModal({ record, property, onClose, onSave }) {
  const [form, setForm] = useState({
    result: record?.result || 'pending',
    inspection_date: record?.inspection_date || '',
    next_inspection_date: record?.next_inspection_date || '',
    notes: record?.notes || '',
    failed_items: record?.failed_items || [],
    reinspection_scheduled: record?.reinspection_scheduled || false,
    reinspection_date: record?.reinspection_date || '',
    hap_suspended: record?.hap_suspended || false,
    hap_suspended_date: record?.hap_suspended_date || '',
  })
  const [saving, setSaving] = useState(false)
  const [customItem, setCustomItem] = useState('')

  function toggleFailedItem(item) {
    setForm(prev => ({
      ...prev,
      failed_items: prev.failed_items.includes(item)
        ? prev.failed_items.filter(i => i !== item)
        : [...prev.failed_items, item]
    }))
  }

  function addCustomItem() {
    if (!customItem.trim()) return
    setForm(prev => ({ ...prev, failed_items: [...prev.failed_items, customItem.trim()] }))
    setCustomItem('')
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      ...form,
      inspection_date: form.inspection_date || null,
      next_inspection_date: form.next_inspection_date || null,
      reinspection_date: form.reinspection_date || null,
      hap_suspended_date: form.hap_suspended_date || null,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase
      .from('hqs_inspections')
      .update(payload)
      .eq('id', record.id)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Inspection record updated')
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Update Inspection</h2>
            <p className="text-xs text-gray-400 mt-0.5">{property?.neighborhood} · {property?.zip_code}</p>
          </div>
          <button onClick={onClose} className="text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Result */}
          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium">Inspection result</p>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(RESULT_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => setForm(p => ({ ...p, result: key }))}
                  className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${form.result === key ? cfg.color : 'bg-white text-gray-500 border-gray-200'}`}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Inspection date</label>
              <input type="date" value={form.inspection_date}
                onChange={e => setForm(p => ({ ...p, inspection_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Next inspection</label>
              <input type="date" value={form.next_inspection_date}
                onChange={e => setForm(p => ({ ...p, next_inspection_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
            </div>
          </div>

          {/* Failed items */}
          {form.result === 'fail' && (
            <div>
              <p className="text-xs text-gray-500 mb-2 font-medium">Failed items</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {COMMON_FAIL_ITEMS.map(item => (
                  <button key={item} onClick={() => toggleFailedItem(item)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${form.failed_items.includes(item) ? 'bg-red-50 text-red-700 border-red-300' : 'bg-white text-gray-500 border-gray-200'}`}>
                    {item}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={customItem} onChange={e => setCustomItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomItem())}
                  placeholder="Add custom item..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                <button onClick={addCustomItem} className="px-3 py-2 bg-[#1B3A6B] text-white rounded-lg text-xs font-medium">
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Re-inspection */}
          {form.result === 'fail' && (
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.reinspection_scheduled}
                  onChange={e => setForm(p => ({ ...p, reinspection_scheduled: e.target.checked }))}
                  className="w-4 h-4 accent-[#1B3A6B]" />
                <span className="text-sm text-gray-700">Re-inspection scheduled</span>
              </label>
              {form.reinspection_scheduled && (
                <input type="date" value={form.reinspection_date}
                  onChange={e => setForm(p => ({ ...p, reinspection_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
              )}
            </div>
          )}

          {/* HAP suspension */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.hap_suspended}
                onChange={e => setForm(p => ({ ...p, hap_suspended: e.target.checked }))}
                className="w-4 h-4 accent-red-500" />
              <span className="text-sm text-gray-700">HAP payment suspended</span>
            </label>
            {form.hap_suspended && (
              <input type="date" value={form.hap_suspended_date}
                onChange={e => setForm(p => ({ ...p, hap_suspended_date: e.target.value }))}
                placeholder="Suspension date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3}
              placeholder="Inspector notes, action items, contacts..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] resize-none" />
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full bg-[#1B3A6B] text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50">
            {saving ? 'Saving...' : 'Save record'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HQSTracker() {
  const { user } = useAuth()
  const [records, setRecords] = useState([])
  const [properties, setProperties] = useState({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newPropertyId, setNewPropertyId] = useState('')
  const [myProperties, setMyProperties] = useState([])

  useEffect(() => {
    if (user?.id) fetchAll()
  }, [user?.id])

  async function fetchAll() {
    setLoading(true)
    try {
      const [{ data: recs }, { data: props }] = await Promise.all([
        supabase
          .from('hqs_inspections')
          .select('*')
          .eq('landlord_id', user.id)
          .order('next_inspection_date', { ascending: true }),
        supabase
          .from('properties')
          .select('id, neighborhood, zip_code, status')
          .eq('landlord_id', user.id),
      ])

      const propMap = {}
      for (const p of (props || [])) propMap[p.id] = p
      setProperties(propMap)
      setMyProperties(props || [])
      setRecords(recs || [])
    } catch (err) {
      console.error('HQS fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function addRecord() {
    if (!newPropertyId) { toast.error('Select a property'); return }
    const exists = records.find(r => r.property_id === newPropertyId)
    if (exists) { toast.error('Already tracking this property'); return }

    const { error } = await supabase.from('hqs_inspections').insert({
      property_id: newPropertyId,
      landlord_id: user.id,
      result: 'pending',
    })
    if (error) { toast.error(error.message); return }
    toast.success('Property added to HQS tracker')
    setCreating(false)
    setNewPropertyId('')
    fetchAll()
  }

  // Stats
  const passed = records.filter(r => r.result === 'pass').length
  const failed = records.filter(r => r.result === 'fail').length
  const upcoming = records.filter(r => {
    const d = daysUntil(r.next_inspection_date)
    return d !== null && d >= 0 && d <= 60
  }).length
  const suspended = records.filter(r => r.hap_suspended).length

  // Untracked properties (have no HQS record)
  const trackedIds = new Set(records.map(r => r.property_id))
  const untrackedProperties = myProperties.filter(p => !trackedIds.has(p.id))

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-5">
        <h1 className="text-white text-lg font-bold">HQS Tracker</h1>
        <p className="text-white/60 text-xs mt-1">Housing Quality Standards inspections</p>
      </div>

      {/* Stats */}
      <div className="mx-4 mt-4 bg-white rounded-xl border border-gray-100 grid grid-cols-4 divide-x divide-gray-100">
        <div className="py-3 text-center">
          <p className="text-lg font-bold text-green-600">{passed}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Passed</p>
        </div>
        <div className="py-3 text-center">
          <p className="text-lg font-bold text-red-500">{failed}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Failed</p>
        </div>
        <div className="py-3 text-center">
          <p className="text-lg font-bold text-amber-500">{upcoming}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Due Soon</p>
        </div>
        <div className="py-3 text-center">
          <p className={`text-lg font-bold ${suspended > 0 ? 'text-red-600' : 'text-gray-400'}`}>{suspended}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Suspended</p>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* Add property button */}
        {untrackedProperties.length > 0 && !creating && (
          <button onClick={() => setCreating(true)}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-3.5 text-sm font-medium text-gray-400 hover:border-[#1B3A6B] hover:text-[#1B3A6B] transition-colors">
            <Plus className="w-4 h-4" />
            Add property to tracker
          </button>
        )}

        {creating && (
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-sm font-semibold text-gray-900 mb-3">Add property</p>
            <select value={newPropertyId} onChange={e => setNewPropertyId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] mb-3">
              <option value="">Select property...</option>
              {untrackedProperties.map(p => (
                <option key={p.id} value={p.id}>{p.neighborhood} — {p.zip_code}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={addRecord} className="flex-1 bg-[#1B3A6B] text-white rounded-lg py-2.5 text-sm font-semibold">Add</button>
              <button onClick={() => { setCreating(false); setNewPropertyId('') }}
                className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-semibold">Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          [1, 2].map(i => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse border border-gray-100">
              <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-20 mb-4" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-8 bg-gray-200 rounded" />
                <div className="h-8 bg-gray-200 rounded" />
              </div>
            </div>
          ))
        ) : records.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <ClipboardCheck className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium text-sm">No properties tracked yet</p>
            <p className="text-gray-400 text-xs mt-1">Add your Section 8 properties to track HQS inspections</p>
          </div>
        ) : (
          records.map(record => (
            <InspectionCard
              key={record.id}
              record={record}
              property={properties[record.property_id]}
              onEdit={(rec, prop) => setEditing({ record: rec, property: prop })}
            />
          ))
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <InspectionModal
          record={editing.record}
          property={editing.property}
          onClose={() => setEditing(null)}
          onSave={() => { setEditing(null); fetchAll() }}
        />
      )}
    </div>
  )
}
