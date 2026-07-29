import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, Clock, User, Home, AlertTriangle } from 'lucide-react'

export default function AdminQueue() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(null) // null = loading
  const [reviews, setReviews] = useState([])
  const [reports, setReports] = useState([])
  const [fraudAlerts, setFraudAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('reviews') // reviews | reports | fraud

  useEffect(() => {
    if (user) checkAdminAndLoad()
  }, [user])

  async function checkAdminAndLoad() {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      setIsAdmin(false)
      return
    }
    setIsAdmin(true)
    await loadData()
  }

  async function loadData() {
    setLoading(true)
    try {
      const [reviewsRes, reportsRes, fraudRes] = await Promise.all([
        supabase
          .from('landlord_reviews')
          .select(`
            *,
            landlord:profiles!landlord_reviews_landlord_id_fkey(full_name, email, phone, verification_status),
            property:properties(neighborhood, zip_code, rent_amount, bedrooms, verification_status, street_address)
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: true }),
        supabase
          .from('listing_reports')
          .select(`
            *,
            reporter:profiles!listing_reports_reporter_id_fkey(full_name, email),
            property:properties(neighborhood, zip_code, street_address, verification_status),
            subject:profiles!listing_reports_landlord_id_fkey(full_name, email)
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: true }),
        supabase
          .from('fraud_alerts')
          .select(`
            *,
            landlord:profiles!fraud_alerts_landlord_id_fkey(full_name, email),
            property:properties(neighborhood, zip_code)
          `)
          .eq('status', 'open')
          .order('created_at', { ascending: false }),
      ])
      setReviews(reviewsRes.data || [])
      setReports(reportsRes.data || [])
      setFraudAlerts(fraudRes.data || [])
    } catch (err) {
      console.error('Admin queue load error:', err)
      toast.error('Failed to load queue')
    } finally {
      setLoading(false)
    }
  }

  async function approveReview(review) {
    // Determine what to update based on review type
    if (review.review_type === 'property') {
      const { error } = await supabase
        .from('properties')
        .update({ verification_status: 'approved' })
        .eq('id', review.property_id)
      if (error) { toast.error(error.message); return }
    } else if (review.review_type === 'identity') {
      const { error } = await supabase
        .from('profiles')
        .update({ verification_status: 'verified' })
        .eq('id', review.landlord_id)
      if (error) { toast.error(error.message); return }
    }

    // Mark review as approved
    await supabase
      .from('landlord_reviews')
      .update({ status: 'approved', reviewer_id: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', review.id)

    // Write audit log
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: review.review_type === 'property' ? 'property.approved' : 'landlord.verified',
      target_type: review.review_type === 'property' ? 'property' : 'landlord',
      target_id: review.review_type === 'property' ? review.property_id : review.landlord_id,
      metadata: { review_id: review.id },
    })

    toast.success('Approved ✓')
    setReviews(prev => prev.filter(r => r.id !== review.id))
  }

  async function rejectReview(review, reason) {
    const rejectionReason = reason || 'Does not meet verification requirements'

    if (review.review_type === 'property') {
      await supabase
        .from('properties')
        .update({ verification_status: 'rejected' })
        .eq('id', review.property_id)
    } else if (review.review_type === 'identity') {
      await supabase
        .from('profiles')
        .update({ verification_status: 'rejected' })
        .eq('id', review.landlord_id)
    }

    await supabase
      .from('landlord_reviews')
      .update({
        status: 'rejected',
        reviewer_id: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
      })
      .eq('id', review.id)

    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: review.review_type === 'property' ? 'property.rejected' : 'landlord.rejected',
      target_type: review.review_type === 'property' ? 'property' : 'landlord',
      target_id: review.review_type === 'property' ? review.property_id : review.landlord_id,
      metadata: { review_id: review.id, reason: rejectionReason },
    })

    toast.success('Rejected')
    setReviews(prev => prev.filter(r => r.id !== review.id))
  }

  async function dismissReport(reportId) {
    await supabase.from('listing_reports').update({ status: 'dismissed' }).eq('id', reportId)
    setReports(prev => prev.filter(r => r.id !== reportId))
  }

  async function dismissFraud(alertId) {
    await supabase
      .from('fraud_alerts')
      .update({ status: 'dismissed', resolved_by: user.id, resolved_at: new Date().toISOString() })
      .eq('id', alertId)
    setFraudAlerts(prev => prev.filter(a => a.id !== alertId))
  }

  // ── Access denied ──
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-gray-900">Access Denied</h1>
          <p className="text-sm text-gray-500 mt-1">You don't have admin access.</p>
          <button onClick={() => navigate('/')} className="mt-4 text-sm text-[#1B3A6B] underline">
            Go home
          </button>
        </div>
      </div>
    )
  }

  if (isAdmin === null || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const pendingCount = reviews.length + reports.length + fraudAlerts.length

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-5">
        <p className="text-blue-200 text-xs font-medium uppercase tracking-wide">Admin</p>
        <h1 className="text-white text-xl font-bold mt-0.5">Review Queue</h1>
        <p className="text-blue-200 text-sm mt-1">
          {pendingCount === 0 ? 'All clear — nothing pending.' : `${pendingCount} item${pendingCount > 1 ? 's' : ''} need attention`}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-4">
        {[
          { key: 'reviews', label: 'Verifications', count: reviews.length },
          { key: 'reports', label: 'Reports', count: reports.length },
          { key: 'fraud', label: 'Fraud Alerts', count: fraudAlerts.length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === t.key
                ? 'border-[#1B3A6B] text-[#1B3A6B]'
                : 'border-transparent text-gray-500'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* ── VERIFICATIONS TAB ── */}
        {tab === 'reviews' && (
          reviews.length === 0
            ? <EmptyState icon={<CheckCircle className="w-10 h-10 text-green-400" />} message="No pending verifications" />
            : reviews.map(review => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onApprove={() => approveReview(review)}
                  onReject={() => {
                    const reason = window.prompt('Rejection reason (optional):')
                    rejectReview(review, reason)
                  }}
                />
              ))
        )}

        {/* ── REPORTS TAB ── */}
        {tab === 'reports' && (
          reports.length === 0
            ? <EmptyState icon={<CheckCircle className="w-10 h-10 text-green-400" />} message="No pending reports" />
            : reports.map(report => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onDismiss={() => dismissReport(report.id)}
                />
              ))
        )}

        {/* ── FRAUD ALERTS TAB ── */}
        {tab === 'fraud' && (
          fraudAlerts.length === 0
            ? <EmptyState icon={<CheckCircle className="w-10 h-10 text-green-400" />} message="No open fraud alerts" />
            : fraudAlerts.map(alert => (
                <FraudCard
                  key={alert.id}
                  alert={alert}
                  onDismiss={() => dismissFraud(alert.id)}
                />
              ))
        )}

      </div>
    </div>
  )
}

function EmptyState({ icon, message }) {
  return (
    <div className="text-center py-12">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  )
}

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
          <span className="text-xs text-gray-400">
            {new Date(review.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* Landlord info */}
        <div className="flex items-start gap-2">
          <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {review.landlord?.full_name || 'Unknown'}
            </p>
            <p className="text-xs text-gray-500">{review.landlord?.email}</p>
            {review.landlord?.phone && (
              <p className="text-xs text-gray-500">{review.landlord.phone}</p>
            )}
            <p className="text-xs mt-0.5">
              <span className={`font-medium ${
                review.landlord?.verification_status === 'verified' ? 'text-green-600' : 'text-amber-600'
              }`}>
                Account: {review.landlord?.verification_status || 'unverified'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Property info (if property review) */}
      {isProperty && review.property && (
        <div className="px-4 py-3 bg-gray-50 flex items-start gap-2 border-b border-gray-100">
          <Home className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {review.property.street_address || review.property.neighborhood}
            </p>
            <p className="text-xs text-gray-500">
              {review.property.bedrooms === 0 ? 'Studio' : `${review.property.bedrooms} BR`}
              {review.property.zip_code ? ` · ${review.property.zip_code}` : ''}
              {review.property.rent_amount ? ` · $${Number(review.property.rent_amount).toLocaleString()}/mo` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 flex gap-2">
        <button
          onClick={onApprove}
          className="flex-1 flex items-center justify-center gap-1.5 bg-[#1D9E75] text-white rounded-lg py-2.5 text-sm font-semibold"
        >
          <CheckCircle className="w-4 h-4" />
          Approve
        </button>
        <button
          onClick={onReject}
          className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg py-2.5 text-sm font-semibold"
        >
          <XCircle className="w-4 h-4" />
          Reject
        </button>
      </div>
    </div>
  )
}

function ReportCard({ report, onDismiss }) {
  const typeLabel = {
    scam: '🚨 Scam',
    fake_listing: '🏚 Fake listing',
    wrong_info: '❌ Wrong info',
    payment_request: '💸 Payment request',
    harassment: '⚠ Harassment',
    other: '📋 Other',
  }[report.report_type] || report.report_type

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
          {typeLabel}
        </span>
        <span className="text-xs text-gray-400">{new Date(report.created_at).toLocaleDateString()}</span>
      </div>
      {report.property && (
        <p className="text-sm text-gray-900 font-medium">
          {report.property.street_address || report.property.neighborhood}
        </p>
      )}
      {report.description && (
        <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{report.description}</p>
      )}
      <div className="text-xs text-gray-500">
        Reported by: {report.reporter?.email || 'Unknown'}
      </div>
      <button
        onClick={onDismiss}
        className="w-full border border-gray-200 text-gray-600 rounded-lg py-2 text-sm font-medium"
      >
        Dismiss
      </button>
    </div>
  )
}

function FraudCard({ alert, onDismiss }) {
  const severityColor = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  }[alert.severity] || 'bg-gray-100 text-gray-700'

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${severityColor}`}>
          {alert.severity.toUpperCase()} · {alert.alert_type}
        </span>
        <span className="text-xs text-gray-400">{new Date(alert.created_at).toLocaleDateString()}</span>
      </div>
      {alert.landlord && (
        <p className="text-sm text-gray-900">
          <span className="font-medium">Landlord:</span> {alert.landlord.email}
        </p>
      )}
      {alert.property && (
        <p className="text-sm text-gray-700">
          <span className="font-medium">Property:</span> {alert.property.neighborhood}
        </p>
      )}
      {alert.details && (
        <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 font-mono break-all">
          {JSON.stringify(alert.details, null, 2)}
        </div>
      )}
      <button
        onClick={onDismiss}
        className="w-full border border-gray-200 text-gray-600 rounded-lg py-2 text-sm font-medium"
      >
        Dismiss
      </button>
    </div>
  )
}
