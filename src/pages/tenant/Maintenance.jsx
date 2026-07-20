import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import BottomNav from '../../components/BottomNav'
import toast from 'react-hot-toast'
import { Plus, ChevronRight, Wrench, X, Upload, AlertTriangle } from 'lucide-react'

const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME

const CATEGORIES = [
  { value: 'plumbing',    label: 'Plumbing',     icon: '🚿' },
  { value: 'electrical',  label: 'Electrical',   icon: '⚡' },
  { value: 'hvac',        label: 'HVAC / Heat',  icon: '❄️' },
  { value: 'appliance',   label: 'Appliance',    icon: '🍳' },
  { value: 'pest',        label: 'Pest Control', icon: '🐛' },
  { value: 'structural',  label: 'Structural',   icon: '🏠' },
  { value: 'other',       label: 'Other',        icon: '🔧' },
]

const URGENCY = [
  { value: 'emergency', label: 'Emergency', sub: 'Unsafe / no heat / flooding', color: 'text-red-600 border-red-300 bg-red-50' },
  { value: 'urgent',    label: 'Urgent',    sub: 'Needs fix within days',       color: 'text-amber-600 border-amber-300 bg-amber-50' },
  { value: 'normal',    label: 'Normal',    sub: 'Routine repair',              color: 'text-gray-600 border-gray-200 bg-white' },
]

const STATUS_CONFIG = {
  submitted:    { label: 'Submitted',    color: 'bg-blue-100 text-blue-700' },
  acknowledged: { label: 'Acknowledged', color: 'bg-purple-100 text-purple-700' },
  in_progress:  { label: 'In Progress',  color: 'bg-amber-100 text-amber-700' },
  completed:    { label: 'Completed',    color: 'bg-green-100 text-green-700' },
  closed:       { label: 'Closed',       color: 'bg-gray-100 text-gray-600' },
}

export default function TenantMaintenance() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('list') // 'list' | 'new'
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)

  const [form, setForm] = useState({
    category: '',
    urgency: 'normal',
    description: '',
    photos: [],
  })

  useEffect(() => {
    if (user) fetchRequests()
  }, [user])

  async function fetchRequests() {
    setLoading(true)
    const { data } = await supabase
      .from('maintenance_requests')
      .select('*, property:property_id(street_address, unit_number, city)')
      .eq('tenant_id', user.id)
      .order('submitted_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  async function fetchProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('property_id, landlord_id')
      .eq('id', user.id)
      .single()
    return data
  }

  async function uploadPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!CLOUDINARY_CLOUD) { toast.error('Photo upload not configured.'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('upload_preset', 'settleed_listings')
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: fd })
      const data = await res.json()
      if (data.secure_url) setForm(prev => ({ ...prev, photos: [...prev.photos, data.secure_url] }))
    } catch { toast.error('Photo upload failed.') }
    finally { setUploading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.category) { toast.error('Please select a category.'); return }
    if (!form.description.trim()) { toast.error('Please describe the issue.'); return }

    setSubmitting(true)
    try {
      const profile = await fetchProfile()
      if (!profile?.property_id) {
        toast.error("You don't have an active lease on file. Contact your landlord.")
        setSubmitting(false)
        return
      }

      const { error } = await supabase.from('maintenance_requests').insert({
        tenant_id: user.id,
        landlord_id: profile.landlord_id,
        property_id: profile.property_id,
        category: form.category,
        urgency: form.urgency,
        description: form.description.trim(),
        photos: form.photos,
      })

      if (error) throw error

      toast.success('Request submitted! Your landlord will be notified.')

      // Notify landlord — fire-and-forget
      ;(async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const { data: tp } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
          let propertyAddress = ''
          if (profile.property_id) {
            const { data: prop } = await supabase
              .from('properties').select('street_address, neighborhood')
              .eq('id', profile.property_id).single()
            propertyAddress = prop?.street_address || prop?.neighborhood || ''
          }
          await fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({
              type: 'maintenance_request',
              payload: {
                landlord_id: profile.landlord_id,
                tenant_name: tp?.full_name || user.email,
                category: form.category,
                urgency: form.urgency,
                description: form.description.trim(),
                property_address: propertyAddress,
              },
            }),
          })
        } catch (_) {}
      })()

      setForm({ category: '', urgency: 'normal', description: '', photos: [] })
      setView('list')
      fetchRequests()
    } catch (err) {
      toast.error('Could not submit request. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const catIcon = (c) => CATEGORIES.find(x => x.value === c)?.icon || '🔧'
  const catLabel = (c) => CATEGORIES.find(x => x.value === c)?.label || c

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Detail view
  if (selectedRequest) {
    const req = selectedRequest
    const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.submitted
    const property = req.property
    const address = property
      ? `${property.street_address}${property.unit_number ? ` #${property.unit_number}` : ''}`
      : 'Your unit'

    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-[#1B3A6B] px-4 pt-10 pb-5">
          <button onClick={() => setSelectedRequest(null)} className="text-blue-200 text-sm mb-3">← Back</button>
          <h1 className="text-white text-xl font-bold">Request Details</h1>
        </div>
        <div className="px-4 pt-4 space-y-3">
          <div className="bg-white rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{catIcon(req.category)}</span>
                <span className="font-semibold text-gray-900">{catLabel(req.category)}</span>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
            </div>
            <div className="text-xs text-gray-500">{address} · Submitted {new Date(req.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            {req.urgency === 'emergency' && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-lg px-3 py-2 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4" /> Emergency
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 mb-1">Description</p>
              <p className="text-sm text-gray-700 leading-relaxed">{req.description}</p>
            </div>
            {req.landlord_notes && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">Landlord note</p>
                <p className="text-sm text-blue-900">{req.landlord_notes}</p>
              </div>
            )}
          </div>
          {(req.photos || []).length > 0 && (
            <div className="bg-white rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 mb-3">Photos</p>
              <div className="grid grid-cols-3 gap-2">
                {req.photos.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                ))}
              </div>
            </div>
          )}
        </div>
        <BottomNav role="tenant" />
      </div>
    )
  }

  // New request form
  if (view === 'new') {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-[#1B3A6B] px-4 pt-10 pb-5">
          <button onClick={() => setView('list')} className="text-blue-200 text-sm mb-3">← Back</button>
          <h1 className="text-white text-xl font-bold">New Maintenance Request</h1>
        </div>
        <form onSubmit={handleSubmit} className="px-4 pt-4 space-y-3">
          {/* Category */}
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">What's the issue?</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(({ value, label, icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, category: value }))}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    form.category === value
                      ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                      : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  <span>{icon}</span> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Urgency */}
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">How urgent is it?</p>
            <div className="space-y-2">
              {URGENCY.map(({ value, label, sub, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, urgency: value }))}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-xl border text-sm transition-colors ${
                    form.urgency === value ? color : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  <div className="text-left">
                    <div className="font-semibold">{label}</div>
                    <div className="text-xs opacity-70">{sub}</div>
                  </div>
                  {form.urgency === value && <div className="w-4 h-4 rounded-full bg-current opacity-80" />}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-900 mb-2">Describe the problem</p>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={5}
              placeholder="E.g. The kitchen faucet has been dripping for 3 days. Water is pooling under the sink…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] resize-none"
            />
          </div>

          {/* Photos */}
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-900 mb-2">Photos <span className="font-normal text-gray-400">(optional)</span></p>
            <div className="flex gap-2 flex-wrap">
              {form.photos.map((url, i) => (
                <div key={i} className="relative w-20 h-20">
                  <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, photos: prev.photos.filter((_, j) => j !== i) }))}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {form.photos.length < 5 && (
                <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer text-gray-400">
                  {uploading
                    ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    : <><Upload className="w-5 h-5" /><span className="text-[10px] mt-1">Add photo</span></>
                  }
                  <input type="file" accept="image/*" onChange={uploadPhoto} className="hidden" />
                </label>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#1B3A6B] text-white rounded-xl py-4 text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </form>
        <BottomNav role="tenant" />
      </div>
    )
  }

  // List view
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-5">
        <button onClick={() => navigate('/tenant')} className="text-blue-200 text-sm mb-3">← Dashboard</button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-bold">Maintenance</h1>
            <p className="text-blue-200 text-sm mt-0.5">{requests.length} request{requests.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setView('new')}
            className="flex items-center gap-1.5 bg-white/10 text-white text-sm font-semibold px-3 py-2 rounded-xl"
          >
            <Plus className="w-4 h-4" /> New
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center">
            <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No maintenance requests yet.</p>
            <button
              onClick={() => setView('new')}
              className="mt-4 bg-[#1B3A6B] text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
            >
              Submit a Request
            </button>
          </div>
        ) : (
          requests.map(req => {
            const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.submitted
            return (
              <button
                key={req.id}
                onClick={() => setSelectedRequest(req)}
                className="w-full bg-white rounded-xl p-4 flex items-center justify-between text-left shadow-sm border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl">
                    {catIcon(req.category)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{catLabel(req.category)}</div>
                    <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{req.description}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(req.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>
            )
          })
        )}
      </div>
      <BottomNav role="tenant" />
    </div>
  )
}
