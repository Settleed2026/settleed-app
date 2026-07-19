import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import BottomNav from '../../components/BottomNav'
import toast from 'react-hot-toast'
import { ShieldCheck, Clock, CheckCircle, XCircle, AlertTriangle, ChevronRight } from 'lucide-react'

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     icon: Clock,        color: 'text-amber-600 bg-amber-50' },
  in_progress: { label: 'In Progress', icon: Clock,        color: 'text-blue-600 bg-blue-50' },
  complete:    { label: 'Complete',    icon: CheckCircle,  color: 'text-green-600 bg-green-50' },
  failed:      { label: 'Failed',      icon: XCircle,      color: 'text-red-600 bg-red-50' },
}

const RESULT_CONFIG = {
  clear:     { label: 'Clear',     color: 'text-green-700 bg-green-100' },
  consider:  { label: 'Consider',  color: 'text-amber-700 bg-amber-100' },
  suspended: { label: 'Suspended', color: 'text-red-700 bg-red-100' },
}

export default function LandlordBackgroundChecks() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [checks, setChecks] = useState([])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(null)
  const [tab, setTab] = useState('checks')

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  async function fetchData() {
    setLoading(true)
    const [{ data: checksData }, { data: appsData }] = await Promise.all([
      supabase
        .from('background_checks')
        .select('*, tenant:tenant_id(full_name), property:property_id(street_address, unit_number)')
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('applications')
        .select('id, status, submitted_at, tenant:tenant_id(full_name), property:property_id(street_address, unit_number)')
        .eq('landlord_id', user.id)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false }),
    ])
    setChecks(checksData || [])
    setApplications(appsData || [])
    setLoading(false)
  }

  async function handleRequest(applicationId) {
    setRequesting(applicationId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/request-background-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ application_id: applicationId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.alreadyExists) {
        toast('A background check already exists for this applicant.', { icon: 'ℹ️' })
      } else {
        toast.success('Background check requested! The tenant will receive a consent email.')
      }
      fetchData()
      setTab('checks')
    } catch (err) {
      toast.error(err.message || 'Could not request background check.')
    } finally {
      setRequesting(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-5">
        <button onClick={() => navigate('/landlord')} className="text-blue-200 text-sm mb-3">← Dashboard</button>
        <h1 className="text-white text-2xl font-bold">Background Checks</h1>
        <p className="text-blue-200 text-sm mt-0.5">Powered by Checkr</p>
      </div>

      {/* Info banner */}
      <div className="mx-4 mt-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-900">How it works</p>
          <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
            Request a check on a pending application. The tenant receives a consent email and submits their info to Checkr. Results are returned within 1–3 business days.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-4">
        {['checks', 'request'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === t ? 'bg-[#1B3A6B] text-white' : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            {t === 'checks' ? `My Checks (${checks.length})` : `Request New`}
          </button>
        ))}
      </div>

      <div className="px-4 pt-3 space-y-3">
        {tab === 'checks' ? (
          checks.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center">
              <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No background checks yet.</p>
              <button onClick={() => setTab('request')} className="mt-4 bg-[#1B3A6B] text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
                Request a Check
              </button>
            </div>
          ) : (
            checks.map(check => {
              const cfg = STATUS_CONFIG[check.status] || STATUS_CONFIG.pending
              const StatusIcon = cfg.icon
              const resCfg = check.result ? RESULT_CONFIG[check.result] : null
              const property = check.property
              const address = property
                ? `${property.street_address}${property.unit_number ? ` #${property.unit_number}` : ''}`
                : 'Property'
              return (
                <div key={check.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-sm text-gray-900">{check.tenant?.full_name || 'Tenant'}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{address}</div>
                      <div className="text-xs text-gray-400">{new Date(check.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" /> {cfg.label}
                      </span>
                      {resCfg && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${resCfg.color}`}>{resCfg.label}</span>
                      )}
                    </div>
                  </div>
                  {check.status === 'pending' && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3">
                      Waiting for tenant to complete consent and submit their information.
                    </p>
                  )}
                </div>
              )
            })
          )
        ) : (
          // Request tab — list pending applications
          applications.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center">
              <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No pending applications to run a check on.</p>
              <button onClick={() => navigate('/landlord/applications')} className="mt-4 text-[#1B3A6B] text-sm font-semibold">
                View application inbox →
              </button>
            </div>
          ) : (
            applications.map(app => {
              const property = app.property
              const address = property
                ? `${property.street_address}${property.unit_number ? ` #${property.unit_number}` : ''}`
                : 'Property'
              const hasCheck = checks.some(c => c.tenant_id === app.tenant?.id)
              return (
                <div key={app.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-sm text-gray-900">{app.tenant?.full_name || 'Applicant'}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{address}</div>
                      <div className="text-xs text-gray-400">Applied {new Date(app.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </div>
                    {hasCheck && (
                      <span className="text-xs text-green-700 bg-green-100 font-semibold px-2 py-1 rounded-full">Check exists</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRequest(app.id)}
                    disabled={requesting === app.id}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                      hasCheck
                        ? 'border border-gray-200 text-gray-500'
                        : 'bg-[#1B3A6B] text-white'
                    }`}
                  >
                    {requesting === app.id
                      ? 'Requesting…'
                      : hasCheck ? 'Request another check' : 'Request Background Check'}
                  </button>
                </div>
              )
            })
          )
        )}
      </div>
      <BottomNav role="landlord" />
    </div>
  )
}
