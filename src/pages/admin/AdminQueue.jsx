import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'
import {
  CheckCircle, XCircle, Clock, User, Home, AlertTriangle,
  Users, BarChart2, FileText, CreditCard, Activity,
  ShieldCheck, RefreshCw, TrendingUp, Key, Wrench, Eye,
} from 'lucide-react'

const fmt = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const dollar = v => v != null ? `$${parseFloat(v).toLocaleString()}` : '—'

function EmptyState({ icon, message }) {
  return (
    <div className="text-center py-14">
      <div className="flex justify-center mb-3 opacity-40">{icon}</div>
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  )
}

function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue:  'bg-[#EEF5FF] text-[#1B3A6B]',
    green: 'bg-green-50 text-[#1D9E75]',
    amber: 'bg-amber-50 text-amber-700',
    red:   'bg-red-50 text-red-600',
  }
  return (
    <div className={`rounded-xl p-3 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value ?? '—'}</p>
      <p className="text-xs font-semibold mt-0.5 opacity-80">{label}</p>
      {sub && <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Queue sub-components ─────────────────────────────────────────────────────

function ReviewCard({ review, onApprove, onReject }) {
  const isProperty = review.review_type === 'property'
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            isProperty ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
          }`}>
            {isProperty ? '🏠 Property Review' : '👤 Identity Review'}
          </span>
          <span className="text-xs text-gray-400">{fmt(review.created_at)}</span>
        </div>
        <div className="flex items-start gap-2">
          <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-900">{review.landlord?.full_name || 'Unknown'}</p>
            <p className="text-xs text-gray-500">{review.landlord?.email}</p>
            {review.landlord?.phone && <p className="text-xs text-gray-500">{review.landlord.phone}</p>}
            <p className={`text-xs font-medium mt-0.5 ${
              review.landlord?.verification_status === 'verified' ? 'text-green-600' : 'text-amber-600'
            }`}>Account: {review.landlord?.verification_status || 'unverified'}</p>
          </div>
        </div>
      </div>
      {isProperty && review.property && (
        <div className="px-4 py-3 bg-gray-50 flex items-start gap-2 border-b border-gray-100">
          <Home className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900">{review.property.street_address || review.property.neighborhood}</p>
            <p className="text-xs text-gray-500">
              {review.property.bedrooms === 0 ? 'Studio' : `${review.property.bedrooms} BR`}
              {review.property.zip_code ? ` · ${review.property.zip_code}` : ''}
              {review.property.rent_amount ? ` · $${Number(review.property.rent_amount).toLocaleString()}/mo` : ''}
            </p>
          </div>
        </div>
      )}
      <div className="px-4 py-3 flex gap-2">
        <button onClick={onApprove}
          className="flex-1 flex items-center justify-center gap-1.5 bg-[#1D9E75] text-white rounded-lg py-2.5 text-sm font-semibold">
          <CheckCircle className="w-4 h-4" /> Approve
        </button>
        <button onClick={onReject}
          className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg py-2.5 text-sm font-semibold">
          <XCircle className="w-4 h-4" /> Reject
        </button>
      </div>
    </div>
  )
}

function ReportCard({ report, onDismiss }) {
  const typeLabel = {
    scam: '🚨 Scam', fake_listing: '🏚 Fake listing', wrong_info: '❌ Wrong info',
    payment_request: '💸 Payment request', harassment: '⚠ Harassment', other: '📋 Other',
  }[report.report_type] || report.report_type
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">{typeLabel}</span>
        <span className="text-xs text-gray-400">{fmt(report.created_at)}</span>
      </div>
      {report.property && <p className="text-sm font-medium text-gray-900">{report.property.street_address || report.property.neighborhood}</p>}
      {report.description && <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{report.description}</p>}
      <p className="text-xs text-gray-500">Reported by: {report.reporter?.email || 'Unknown'}</p>
      <button onClick={onDismiss} className="w-full border border-gray-200 text-gray-600 rounded-lg py-2 text-sm font-medium">Dismiss</button>
    </div>
  )
}

function FraudCard({ alert, onDismiss }) {
  const severityColor = {
    low: 'bg-gray-100 text-gray-700', medium: 'bg-amber-100 text-amber-700',
    high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700',
  }[alert.severity] || 'bg-gray-100 text-gray-700'
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${severityColor}`}>
          {alert.severity?.toUpperCase()} · {alert.alert_type}
        </span>
        <span className="text-xs text-gray-400">{fmt(alert.created_at)}</span>
      </div>
      {alert.landlord && <p className="text-sm text-gray-900"><span className="font-medium">Landlord:</span> {alert.landlord.email}</p>}
      {alert.property && <p className="text-sm text-gray-700"><span className="font-medium">Property:</span> {alert.property.neighborhood}</p>}
      {alert.details && (
        <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 font-mono break-all">
          {JSON.stringify(alert.details, null, 2)}
        </div>
      )}
      <button onClick={onDismiss} className="w-full border border-gray-200 text-gray-600 rounded-lg py-2 text-sm font-medium">Dismiss</button>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AdminQueue() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin]     = useState(null)
  const [tab, setTab]             = useState('queue')
  const [stats, setStats]         = useState(null)
  const [loadedTabs, setLoadedTabs] = useState(new Set())

  // Queue
  const [reviews, setReviews]         = useState([])
  const [reports, setReports]         = useState([])
  const [fraudAlerts, setFraudAlerts] = useState([])
  const [queueTab, setQueueTab]       = useState('verifications')

  // Per-tab data
  const [users, setUsers]           = useState([])
  const [listings, setListings]     = useState([])
  const [subs, setSubs]             = useState([])
  const [apps, setApps]             = useState([])
  const [leases, setLeases]         = useState([])
  const [insights, setInsights]     = useState(null)
  const [visitors, setVisitors]     = useState([])

  const [loading, setLoading]       = useState(false)

  useEffect(() => { if (user) init() }, [user])

  async function init() {
    const { data, error } = await supabase.rpc('is_admin')
    if (error || !data) { setIsAdmin(false); return }
    setIsAdmin(true)
    loadStats()
    loadQueue()
    setLoadedTabs(new Set(['queue']))
  }

  async function loadStats() {
    const [landlordRes, tenantRes, listingRes, appRes, leaseRes, subRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'landlord'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'tenant'),
      supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('applications').select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase.from('leases').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('profiles').select('id', { count: 'exact', head: true })
        .eq('role', 'landlord').eq('subscription_status', 'active'),
    ])
    setStats({
      landlords:   landlordRes.count ?? 0,
      tenants:     tenantRes.count   ?? 0,
      listings:    listingRes.count  ?? 0,
      appsWeek:    appRes.count      ?? 0,
      activeLeases: leaseRes.count   ?? 0,
      mrr:         (subRes.count ?? 0) * 49,
    })
  }

  async function loadQueue() {
    const [r1, r2, r3] = await Promise.all([
      supabase.from('landlord_reviews').select(`*, landlord:profiles!landlord_reviews_landlord_id_fkey(full_name,email,phone,verification_status), property:properties(neighborhood,zip_code,rent_amount,bedrooms,verification_status,street_address)`).eq('status','pending').order('created_at',{ascending:true}),
      supabase.from('listing_reports').select(`*, reporter:profiles!listing_reports_reporter_id_fkey(full_name,email), property:properties(neighborhood,zip_code,street_address,verification_status), subject:profiles!listing_reports_landlord_id_fkey(full_name,email)`).eq('status','pending').order('created_at',{ascending:true}),
      supabase.from('fraud_alerts').select(`*, landlord:profiles!fraud_alerts_landlord_id_fkey(full_name,email), property:properties(neighborhood,zip_code)`).eq('status','open').order('created_at',{ascending:false}),
    ])
    setReviews(r1.data || [])
    setReports(r2.data || [])
    setFraudAlerts(r3.data || [])
  }

  async function loadTab(t) {
    if (loadedTabs.has(t)) return
    setLoadedTabs(prev => new Set([...prev, t]))
    setLoading(true)
    try {
      if (t === 'users') {
        const { data } = await supabase.from('profiles')
          .select('id,full_name,email,role,verification_status,subscription_status,created_at,housing_authority,voucher_size')
          .order('created_at', { ascending: false })
          .limit(200)
        setUsers(data || [])
      }
      if (t === 'listings') {
        const { data } = await supabase.from('properties')
          .select('id,neighborhood,street_address,bedrooms,rent_amount,status,verification_status,created_at,landlord:profiles!properties_landlord_id_fkey(full_name,email)')
          .order('created_at', { ascending: false })
          .limit(200)
        setListings(data || [])
      }
      if (t === 'subscriptions') {
        const { data } = await supabase.from('profiles')
          .select('id,full_name,email,subscription_status,created_at')
          .eq('role', 'landlord')
          .order('created_at', { ascending: false })
          .limit(200)
        setSubs(data || [])
      }
      if (t === 'applications') {
        const { data } = await supabase.from('applications')
          .select('id,status,created_at,housing_authority,tenant:profiles!applications_tenant_id_fkey(full_name,email), property:properties(neighborhood,street_address,rent_amount)')
          .order('created_at', { ascending: false })
          .limit(200)
        setApps(data || [])
      }
      if (t === 'leases') {
        const { data } = await supabase.from('leases')
          .select('id,status,lease_start_date,lease_end_date,rent_amount,recertification_date,lease_type,created_at, tenant:profiles!leases_tenant_id_fkey(full_name,email), property:properties(neighborhood,street_address)')
          .in('status', ['active','pending_tenant_signature'])
          .order('created_at', { ascending: false })
          .limit(200)
        setLeases(data || [])
      }
      if (t === 'insights') {
        const [haRes, voucherRes, recertRes, maintRes] = await Promise.all([
          supabase.from('profiles').select('housing_authority').eq('role','tenant').not('housing_authority','is',null),
          supabase.from('profiles').select('voucher_size').eq('role','tenant').not('voucher_size','is',null),
          supabase.from('leases').select('id,tenant:profiles!leases_tenant_id_fkey(full_name,email),property:properties(neighborhood,street_address),recertification_date,status')
            .eq('status','active').not('recertification_date','is',null)
            .lte('recertification_date', new Date(Date.now() + 90*86400000).toISOString())
            .order('recertification_date', { ascending: true }),
          supabase.from('maintenance_requests').select('id,status').eq('status','open'),
        ])
        // HA breakdown
        const haCounts = {}
        ;(haRes.data||[]).forEach(r => { haCounts[r.housing_authority] = (haCounts[r.housing_authority]||0)+1 })
        const haBreakdown = Object.entries(haCounts).sort((a,b) => b[1]-a[1])
        // Voucher breakdown
        const vCounts = {}
        ;(voucherRes.data||[]).forEach(r => { const k = r.voucher_size===0?'Studio':`${r.voucher_size}BR`; vCounts[k]=(vCounts[k]||0)+1 })
        const voucherBreakdown = Object.entries(vCounts).sort((a,b) => parseInt(a[0])-parseInt(b[0]))
        setInsights({
          haBreakdown,
          voucherBreakdown,
          upcomingRecerts: recertRes.data || [],
          openMaintenance: maintRes.count ?? (maintRes.data?.length ?? 0),
        })
      }
      if (t === 'visitors') {
        const { data } = await supabase.from('page_views')
          .select('id,session_id,page,referrer,device,browser,user_id,created_at')
          .order('created_at', { ascending: false })
          .limit(500)
        setVisitors(data || [])
      }
    } catch(e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function switchTab(t) {
    setTab(t)
    loadTab(t)
  }

  // Queue actions
  async function approveReview(review) {
    if (review.review_type === 'property') {
      const { error } = await supabase.from('properties').update({ verification_status: 'approved' }).eq('id', review.property_id)
      if (error) { toast.error(error.message); return }
    } else {
      const { error } = await supabase.from('profiles').update({ verification_status: 'verified' }).eq('id', review.landlord_id)
      if (error) { toast.error(error.message); return }
    }
    await supabase.from('landlord_reviews').update({ status: 'approved', reviewer_id: user.id, reviewed_at: new Date().toISOString() }).eq('id', review.id)
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: review.review_type === 'property' ? 'property.approved' : 'landlord.verified', target_type: review.review_type === 'property' ? 'property' : 'landlord', target_id: review.review_type === 'property' ? review.property_id : review.landlord_id, metadata: { review_id: review.id } })
    toast.success('Approved ✓')
    setReviews(prev => prev.filter(r => r.id !== review.id))
    loadStats()
  }

  async function rejectReview(review, reason) {
    const r = reason || 'Does not meet verification requirements'
    if (review.review_type === 'property') await supabase.from('properties').update({ verification_status: 'rejected' }).eq('id', review.property_id)
    else await supabase.from('profiles').update({ verification_status: 'rejected' }).eq('id', review.landlord_id)
    await supabase.from('landlord_reviews').update({ status: 'rejected', reviewer_id: user.id, reviewed_at: new Date().toISOString(), rejection_reason: r }).eq('id', review.id)
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'landlord.rejected', target_type: 'landlord', target_id: review.landlord_id, metadata: { review_id: review.id, reason: r } })
    toast.success('Rejected')
    setReviews(prev => prev.filter(r => r.id !== review.id))
  }

  async function dismissReport(id) {
    await supabase.from('listing_reports').update({ status: 'dismissed' }).eq('id', id)
    setReports(prev => prev.filter(r => r.id !== id))
  }

  async function dismissFraud(id) {
    await supabase.from('fraud_alerts').update({ status: 'dismissed', resolved_by: user.id, resolved_at: new Date().toISOString() }).eq('id', id)
    setFraudAlerts(prev => prev.filter(a => a.id !== id))
  }

  // ── Access denied / loading ──
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-gray-900">Access Denied</h1>
          <p className="text-sm text-gray-500 mt-1">You don't have admin access.</p>
          <button onClick={() => navigate('/')} className="mt-4 text-sm text-[#1B3A6B] underline">Go home</button>
        </div>
      </div>
    )
  }
  if (isAdmin === null) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-7 h-7 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" /></div>
  }

  const pendingCount = reviews.length + reports.length + fraudAlerts.length
  const TABS = [
    { key: 'queue',         label: 'Queue',         icon: ShieldCheck,  badge: pendingCount },
    { key: 'users',         label: 'Users',         icon: Users },
    { key: 'listings',      label: 'Listings',      icon: Home },
    { key: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { key: 'applications',  label: 'Applications',  icon: FileText },
    { key: 'leases',        label: 'Leases',        icon: Key },
    { key: 'insights',      label: 'Insights',      icon: BarChart2 },
    { key: 'visitors',      label: 'Visitors',      icon: Eye },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wide">Settleed</p>
            <h1 className="text-white text-xl font-bold mt-0.5">Admin Dashboard</h1>
          </div>
          <button onClick={() => { loadStats(); loadQueue(); setLoadedTabs(new Set(['queue'])); setTab('queue') }}
            className="text-blue-200 hover:text-white p-2">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            <StatCard label="Landlords" value={stats.landlords} color="blue" />
            <StatCard label="Tenants" value={stats.tenants} color="blue" />
            <StatCard label="Live Listings" value={stats.listings} color="green" />
            <StatCard label="Apps (7d)" value={stats.appsWeek} color="blue" />
            <StatCard label="Active Leases" value={stats.activeLeases} color="green" />
            <StatCard label="MRR" value={`$${stats.mrr}`} color={stats.mrr > 0 ? 'green' : 'amber'} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 overflow-x-auto">
        <div className="flex px-2 min-w-max">
          {TABS.map(({ key, label, icon: Icon, badge }) => (
            <button key={key} onClick={() => switchTab(key)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                tab === key ? 'border-[#1B3A6B] text-[#1B3A6B]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
              {badge > 0 && <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">{badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 pt-4">

        {/* ── QUEUE ── */}
        {tab === 'queue' && (
          <>
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {[
                { key: 'verifications', label: 'Verifications', count: reviews.length },
                { key: 'reports',       label: 'Reports',       count: reports.length },
                { key: 'fraud',         label: 'Fraud Alerts',  count: fraudAlerts.length },
              ].map(t => (
                <button key={t.key} onClick={() => setQueueTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    queueTab === t.key ? 'bg-[#1B3A6B] text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                  {t.label}
                  {t.count > 0 && <span className={`rounded-full px-1.5 text-[10px] ${queueTab === t.key ? 'bg-white text-[#1B3A6B]' : 'bg-red-500 text-white'}`}>{t.count}</span>}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {queueTab === 'verifications' && (reviews.length === 0
                ? <EmptyState icon={<CheckCircle className="w-10 h-10" />} message="No pending verifications" />
                : reviews.map(r => <ReviewCard key={r.id} review={r} onApprove={() => approveReview(r)} onReject={() => { const reason = window.prompt('Rejection reason (optional):'); rejectReview(r, reason) }} />)
              )}
              {queueTab === 'reports' && (reports.length === 0
                ? <EmptyState icon={<CheckCircle className="w-10 h-10" />} message="No pending reports" />
                : reports.map(r => <ReportCard key={r.id} report={r} onDismiss={() => dismissReport(r.id)} />)
              )}
              {queueTab === 'fraud' && (fraudAlerts.length === 0
                ? <EmptyState icon={<CheckCircle className="w-10 h-10" />} message="No open fraud alerts" />
                : fraudAlerts.map(a => <FraudCard key={a.id} alert={a} onDismiss={() => dismissFraud(a.id)} />)
              )}
            </div>
          </>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          loading && !loadedTabs.has('users') ? <Spinner /> : (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 mb-3">{users.length} users total</p>
              {users.map(u => (
                <div key={u.id} className="bg-white rounded-xl p-3 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    u.role === 'landlord' ? 'bg-[#EEF5FF] text-[#1B3A6B]' : 'bg-green-50 text-[#1D9E75]'
                  }`}>
                    {u.full_name?.[0] || u.email?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 truncate">{u.full_name || u.email}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        u.role === 'landlord' ? 'bg-[#EEF5FF] text-[#1B3A6B]' : 'bg-green-50 text-[#1D9E75]'
                      }`}>{u.role}</span>
                      {u.verification_status === 'verified' && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">✓ Verified</span>}
                      {u.subscription_status === 'active' && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700">Subscribed</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    <div className="flex gap-3 mt-0.5">
                      {u.housing_authority && <span className="text-[10px] text-gray-400">{u.housing_authority}</span>}
                      {u.voucher_size != null && <span className="text-[10px] text-gray-400">{u.voucher_size === 0 ? 'Studio' : `${u.voucher_size}BR`} voucher</span>}
                      <span className="text-[10px] text-gray-400">Joined {fmt(u.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {users.length === 0 && <EmptyState icon={<Users className="w-10 h-10" />} message="No users yet" />}
            </div>
          )
        )}

        {/* ── LISTINGS ── */}
        {tab === 'listings' && (
          loading && !loadedTabs.has('listings') ? <Spinner /> : (
            <div className="space-y-2">
              {['pending_review','active','rejected','draft'].map(status => {
                const group = listings.filter(l => l.verification_status === status || l.status === status)
                if (group.length === 0) return null
                const statusLabel = { pending_review: '⏳ Pending Review', active: '✅ Active', rejected: '❌ Rejected', draft: '📝 Draft' }[status]
                const statusColor = { pending_review: 'amber', active: 'green', rejected: 'red', draft: 'gray' }[status]
                return (
                  <div key={status}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 mt-4 first:mt-0">{statusLabel} ({group.length})</p>
                    {group.map(l => (
                      <div key={l.id} className="bg-white rounded-xl p-3 mb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{l.street_address || l.neighborhood}</p>
                            <p className="text-xs text-gray-500">
                              {l.bedrooms === 0 ? 'Studio' : `${l.bedrooms}BR`} · {dollar(l.rent_amount)}/mo
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">by {l.landlord?.full_name || l.landlord?.email} · {fmt(l.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
              {listings.length === 0 && <EmptyState icon={<Home className="w-10 h-10" />} message="No listings yet" />}
            </div>
          )
        )}

        {/* ── SUBSCRIPTIONS ── */}
        {tab === 'subscriptions' && (
          loading && !loadedTabs.has('subscriptions') ? <Spinner /> : (
            <div className="space-y-3">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: 'Active', status: 'active',   color: 'green' },
                  { label: 'Trialing', status: 'trialing', color: 'blue' },
                  { label: 'Past Due', status: 'past_due', color: 'amber' },
                  { label: 'Canceled', status: 'canceled', color: 'red' },
                ].map(({ label, status, color }) => (
                  <StatCard key={status} label={label}
                    value={subs.filter(s => s.subscription_status === status).length}
                    color={color} />
                ))}
              </div>
              {subs.map(s => (
                <div key={s.id} className="bg-white rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#EEF5FF] flex items-center justify-center shrink-0 text-xs font-bold text-[#1B3A6B]">
                    {s.full_name?.[0] || s.email?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.full_name || s.email}</p>
                    <p className="text-xs text-gray-500 truncate">{s.email}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    s.subscription_status === 'active'   ? 'bg-green-100 text-green-700' :
                    s.subscription_status === 'trialing' ? 'bg-blue-100 text-blue-700' :
                    s.subscription_status === 'past_due' ? 'bg-amber-100 text-amber-700' :
                    s.subscription_status === 'canceled' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>{s.subscription_status || 'no plan'}</span>
                </div>
              ))}
              {subs.length === 0 && <EmptyState icon={<CreditCard className="w-10 h-10" />} message="No landlords yet" />}
            </div>
          )
        )}

        {/* ── APPLICATIONS ── */}
        {tab === 'applications' && (
          loading && !loadedTabs.has('applications') ? <Spinner /> : (
            <div className="space-y-3">
              {/* Funnel */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                {[
                  { label: 'Total',    filter: () => true,                     color: 'blue' },
                  { label: 'Pending',  filter: a => a.status === 'pending',    color: 'amber' },
                  { label: 'Approved', filter: a => a.status === 'approved',   color: 'green' },
                  { label: 'Declined', filter: a => a.status === 'rejected',   color: 'red' },
                ].map(({ label, filter, color }) => (
                  <StatCard key={label} label={label} value={apps.filter(filter).length} color={color} />
                ))}
              </div>
              <p className="text-xs text-gray-400">Most recent {apps.length} applications</p>
              {apps.map(a => (
                <div key={a.id} className="bg-white rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{a.tenant?.full_name || a.tenant?.email}</p>
                      <p className="text-xs text-gray-500 truncate">→ {a.property?.street_address || a.property?.neighborhood}</p>
                      {a.housing_authority && <p className="text-xs text-gray-400 mt-0.5">{a.housing_authority}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        a.status === 'approved' ? 'bg-green-100 text-green-700' :
                        a.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{a.status}</span>
                      <p className="text-[10px] text-gray-400 mt-1">{fmt(a.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {apps.length === 0 && <EmptyState icon={<FileText className="w-10 h-10" />} message="No applications yet" />}
            </div>
          )
        )}

        {/* ── LEASES ── */}
        {tab === 'leases' && (
          loading && !loadedTabs.has('leases') ? <Spinner /> : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <StatCard label="Active"           value={leases.filter(l => l.status === 'active').length}                    color="green" />
                <StatCard label="Awaiting Tenant"  value={leases.filter(l => l.status === 'pending_tenant_signature').length}  color="amber" />
              </div>
              {leases.map(l => (
                <div key={l.id} className="bg-white rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{l.property?.street_address || l.property?.neighborhood}</p>
                      <p className="text-xs text-gray-500">Tenant: {l.tenant?.full_name || l.tenant?.email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmt(l.lease_start_date)} → {fmt(l.lease_end_date)} · {dollar(l.rent_amount)}/mo
                      </p>
                      {l.recertification_date && (
                        <p className={`text-xs font-medium mt-0.5 ${
                          new Date(l.recertification_date) < new Date(Date.now() + 30*86400000) ? 'text-red-600' :
                          new Date(l.recertification_date) < new Date(Date.now() + 90*86400000) ? 'text-amber-600' : 'text-gray-400'
                        }`}>Recert: {fmt(l.recertification_date)}</p>
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      l.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>{l.status === 'active' ? 'Active' : 'Pending Sig.'}</span>
                  </div>
                </div>
              ))}
              {leases.length === 0 && <EmptyState icon={<Key className="w-10 h-10" />} message="No leases yet" />}
            </div>
          )
        )}

        {/* ── INSIGHTS ── */}
        {tab === 'insights' && (
          loading && !loadedTabs.has('insights') ? <Spinner /> :
          !insights ? <EmptyState icon={<BarChart2 className="w-10 h-10" />} message="Loading insights…" /> : (
            <div className="space-y-5">

              {/* HA Breakdown */}
              <div className="bg-white rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Housing Authority Breakdown</p>
                {insights.haBreakdown.length === 0
                  ? <p className="text-xs text-gray-400">No data yet</p>
                  : insights.haBreakdown.map(([ha, count]) => {
                      const total = insights.haBreakdown.reduce((s,[,c])=>s+c,0)
                      const pct = Math.round(count/total*100)
                      return (
                        <div key={ha} className="mb-2">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="font-medium text-gray-700">{ha}</span>
                            <span className="text-gray-500">{count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full">
                            <div className="h-1.5 bg-[#1B3A6B] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })
                }
              </div>

              {/* Voucher Size */}
              <div className="bg-white rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Voucher Size Distribution</p>
                {insights.voucherBreakdown.length === 0
                  ? <p className="text-xs text-gray-400">No data yet</p>
                  : (
                    <div className="grid grid-cols-3 gap-2">
                      {insights.voucherBreakdown.map(([size, count]) => (
                        <div key={size} className="bg-[#EEF5FF] rounded-lg p-2.5 text-center">
                          <p className="text-xl font-bold text-[#1B3A6B]">{count}</p>
                          <p className="text-xs text-[#1B3A6B] opacity-70">{size}</p>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>

              {/* Open Maintenance */}
              <div className="bg-white rounded-xl p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  insights.openMaintenance > 0 ? 'bg-amber-100' : 'bg-green-100'
                }`}>
                  <Wrench className={`w-6 h-6 ${insights.openMaintenance > 0 ? 'text-amber-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{insights.openMaintenance}</p>
                  <p className="text-sm text-gray-500">Open maintenance requests</p>
                </div>
              </div>

              {/* Upcoming Recerts */}
              <div className="bg-white rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Recertifications Due (Next 90 days) · {insights.upcomingRecerts.length}
                </p>
                {insights.upcomingRecerts.length === 0
                  ? <p className="text-xs text-gray-400">None due in the next 90 days</p>
                  : insights.upcomingRecerts.map(l => {
                      const days = Math.ceil((new Date(l.recertification_date) - new Date()) / 86400000)
                      return (
                        <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{l.tenant?.full_name || l.tenant?.email}</p>
                            <p className="text-xs text-gray-500">{l.property?.street_address || l.property?.neighborhood}</p>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            days <= 30 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>{days}d</span>
                        </div>
                      )
                    })
                }
              </div>

            </div>
          )
        )}

        {/* ── VISITORS ── */}
        {tab === 'visitors' && (
          loading && !loadedTabs.has('visitors')
            ? <Spinner />
            : <VisitorsTab visitors={visitors} />
        )}

      </div>
    </div>
  )
}

function VisitorsTab({ visitors }) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const weekAgo  = new Date(Date.now() - 7 * 86400000).toISOString()

  const todayViews   = visitors.filter(v => v.created_at?.slice(0, 10) === todayStr)
  const weekViews    = visitors.filter(v => v.created_at >= weekAgo)
  const uniqueToday  = new Set(todayViews.map(v => v.session_id)).size
  const uniqueWeek   = new Set(weekViews.map(v => v.session_id)).size

  const pageCounts = {}
  visitors.forEach(v => { pageCounts[v.page] = (pageCounts[v.page] || 0) + 1 })
  const topPages = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)

  const devices = {}
  visitors.forEach(v => { if (v.device) devices[v.device] = (devices[v.device] || 0) + 1 })

  const fmtTime = d => new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })

  return (
    <div className="space-y-4">

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Today's Visits"  value={todayViews.length} color="blue" />
        <StatCard label="Sessions Today"  value={uniqueToday}       color="blue" />
        <StatCard label="This Week"       value={weekViews.length}  color="green" sub="page views" />
        <StatCard label="Sessions (7d)"   value={uniqueWeek}        color="green" />
      </div>

      {/* Top Pages */}
      <div className="bg-white rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Top Pages</p>
        {topPages.length === 0
          ? <p className="text-xs text-gray-400">No data yet</p>
          : topPages.map(([page, count]) => {
              const pct = Math.round(count / visitors.length * 100)
              return (
                <div key={page} className="mb-2">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="font-mono text-gray-700 truncate max-w-[180px]">{page}</span>
                    <span className="text-gray-500 shrink-0 ml-2">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-1.5 bg-[#1B3A6B] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })
        }
      </div>

      {/* Device Breakdown */}
      <div className="bg-white rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Devices</p>
        <div className="grid grid-cols-3 gap-2">
          {['mobile', 'tablet', 'desktop'].map(d => (
            <div key={d} className="bg-gray-50 rounded-lg p-2.5 text-center">
              <p className="text-xl font-bold text-gray-900">{devices[d] || 0}</p>
              <p className="text-xs text-gray-500 capitalize">{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Visits Log */}
      <div className="bg-white rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Recent Visits · {visitors.length} logged
        </p>
        {visitors.length === 0
          ? <p className="text-xs text-gray-400">No visits recorded yet. Run the migration in Supabase first.</p>
          : visitors.slice(0, 50).map(v => (
              <div key={v.id} className="py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-gray-800 truncate">{v.page}</p>
                    {v.referrer && (
                      <p className="text-[10px] text-gray-400 truncate">
                        ↩ {v.referrer.replace(/^https?:\/\//, '').slice(0, 50)}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-gray-400">{fmtTime(v.created_at)}</p>
                    <p className="text-[10px] text-gray-300 capitalize">
                      {[v.device, v.browser].filter(Boolean).join(' · ')}
                    </p>
                    {v.user_id && <span className="text-[10px] text-green-600 font-medium">✓ user</span>}
                  </div>
                </div>
              </div>
            ))
        }
      </div>

    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
