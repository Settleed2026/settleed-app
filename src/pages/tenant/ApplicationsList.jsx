import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import BottomNav from '../../components/BottomNav'
import { Clock, CheckCircle2, XCircle, Home, ChevronRight, FileText } from 'lucide-react'

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'text-amber-600 bg-amber-50',  icon: Clock },
  approved:  { label: 'Approved',  color: 'text-green-700 bg-green-50',  icon: CheckCircle2 },
  rejected:  { label: 'Declined',  color: 'text-red-600 bg-red-50',      icon: XCircle },
  withdrawn: { label: 'Withdrawn', color: 'text-gray-600 bg-gray-100',   icon: XCircle },
}

function ApplicationCard({ application, onClick }) {
  const p = application.properties
  const status = STATUS_CONFIG[application.status] || STATUS_CONFIG.pending
  const Icon = status.icon
  const beds = p?.bedrooms === 0 ? 'Studio' : `${p?.bedrooms} BR`
  const photo = p?.photos?.[0]
  const appliedDate = new Date(application.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })

  return (
    <div onClick={onClick}
      className="bg-white rounded-xl p-3 flex items-center gap-3 cursor-pointer active:bg-gray-50 transition-colors border border-gray-100">
      {photo
        ? <img src={photo} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
        : <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <Home className="w-6 h-6 text-gray-300" />
          </div>
      }
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
  )
}

const FILTERS = ['All', 'Pending', 'Approved', 'Declined']

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
        .select('id, status, created_at, properties:property_id(id, neighborhood, city, zip_code, bedrooms, rent_amount, photos)')
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false })
      if (!error) setApplications(data || [])
      setLoading(false)
    }
    fetchApplications()
  }, [user])

  const filtered = applications.filter(a => {
    if (filter === 'All') return true
    if (filter === 'Pending') return a.status === 'pending'
    if (filter === 'Approved') return a.status === 'approved'
    if (filter === 'Declined') return a.status === 'rejected'
    return true
  })

  const counts = {
    pending:  applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
<<<<<<< HEAD
      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-6">
        <h1 className="text-white text-2xl font-bold">My Applications</h1>
        <p className="text-blue-200 text-sm mt-1">{applications.length} total</p>

        {/* Stats row */}
=======
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-6">
        <h1 className="text-white text-2xl font-bold">My Applications</h1>
        <p className="text-blue-200 text-sm mt-1">{applications.length} total</p>
>>>>>>> 916c6791bc01800d734a9f04f982a1ed9f597490
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
              <p className="text-green-300 font-bold text-lg">{counts.approved}</p>
              <p className="text-blue-200 text-[10px] font-medium">Approved</p>
            </div>
          </div>
        )}
      </div>

<<<<<<< HEAD
      {/* Filter tabs */}
      {applications.length > 0 && (
        <div className="px-4 pt-4 flex gap-2 overflow-x-auto no-scrollbar">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                filter === f
                  ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                  : 'bg-white text-gray-600 border-gray-200'
=======
      {applications.length > 0 && (
        <div className="px-4 pt-4 flex gap-2 overflow-x-auto">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                filter === f ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200'
>>>>>>> 916c6791bc01800d734a9f04f982a1ed9f597490
              }`}>
              {f}
            </button>
          ))}
        </div>
      )}

<<<<<<< HEAD
      {/* List */}
      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          <>
            {[1, 2, 3].map(i => (
=======
      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          <>
            {[1,2,3].map(i => (
>>>>>>> 916c6791bc01800d734a9f04f982a1ed9f597490
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
<<<<<<< HEAD
                <p className="text-gray-400 text-sm mt-2 mb-5">Apply to listings with your Section 8 voucher and they'll appear here.</p>
=======
                <p className="text-gray-400 text-sm mt-2 mb-5">Apply to listings with your Section 8 voucher and they appear here.</p>
>>>>>>> 916c6791bc01800d734a9f04f982a1ed9f597490
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
<<<<<<< HEAD
            <ApplicationCard
              key={app.id}
              application={app}
              onClick={() => navigate(`/tenant/listing/${app.properties?.id}`)}
            />
=======
            <ApplicationCard key={app.id} application={app}
              onClick={() => navigate(`/tenant/listing/${app.properties?.id}`)} />
>>>>>>> 916c6791bc01800d734a9f04f982a1ed9f597490
          ))
        )}
      </div>

      <BottomNav role="tenant" />
    </div>
  )
}
