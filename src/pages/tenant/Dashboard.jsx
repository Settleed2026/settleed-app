import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Search, FileText, Clock, CheckCircle2, XCircle, ChevronRight, Home } from 'lucide-react'

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-amber-600 bg-amber-50', icon: Clock },
  approved: { label: 'Approved', color: 'text-green-700 bg-green-50', icon: CheckCircle2 },
  rejected: { label: 'Declined', color: 'text-red-600 bg-red-50', icon: XCircle },
  withdrawn: { label: 'Withdrawn', color: 'text-gray-600 bg-gray-100', icon: XCircle },
}

function ApplicationCard({ application, onClick }) {
  const p = application.properties
  const status = STATUS_CONFIG[application.status] || STATUS_CONFIG.pending
  const Icon = status.icon
  const beds = p?.bedrooms === 0 ? 'Studio' : `${p?.bedrooms} BR`
  const photo = p?.photos?.[0]

  return (
    <div onClick={onClick} className="bg-white rounded-xl p-3 flex items-center gap-3 cursor-pointer active:bg-gray-50 transition-colors border border-gray-100">
      {photo
        ? <img src={photo} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
        : <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <Home className="w-5 h-5 text-gray-300" />
          </div>
      }
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{p?.neighborhood || 'Property'}</p>
        <p className="text-xs text-gray-500">{beds} · {p?.zip_code}</p>
        <p className="text-sm font-bold text-[#1B3A6B]">${p?.rent_amount?.toLocaleString()}/mo</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${status.color}`}>
          <Icon className="w-3 h-3" />
          {status.label}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </div>
    </div>
  )
}

export default function TenantDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    async function fetchData() {
      const [{ data: apps }, { data: prof }] = await Promise.all([
        supabase
          .from('applications')
          .select('id, status, created_at, properties:property_id(id, neighborhood, zip_code, bedrooms, rent_amount, photos)')
          .eq('tenant_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('profiles')
          .select('full_name, housing_authority, voucher_size')
          .eq('id', user.id)
          .single(),
      ])
      setApplications(apps || [])
      setProfile(prof)
      setLoading(false)
    }
    fetchData()
  }, [user.id])

  const pending = applications.filter(a => a.status === 'pending').length
  const approved = applications.filter(a => a.status === 'approved').length

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-6">
        <p className="text-white/60 text-sm">Welcome back</p>
        <h1 className="text-white text-xl font-bold">{profile?.full_name?.split(' ')[0] || 'Tenant'}</h1>
        {profile?.housing_authority && (
          <div className="mt-3 bg-white/10 rounded-xl px-3 py-2.5 inline-flex items-center gap-2">
            <div className="w-2 h-2 bg-[#1D9E75] rounded-full" />
            <span className="text-white text-xs font-medium">
              {profile.housing_authority} Voucher
              {profile.voucher_size !== undefined && profile.voucher_size !== null
                ? ` · ${profile.voucher_size === 0 ? 'Studio' : `${profile.voucher_size} BR`}`
                : ''}
            </span>
          </div>
        )}
      </div>

      {applications.length > 0 && (
        <div className="mx-4 -mt-3 bg-white rounded-xl shadow-sm border border-gray-100 grid grid-cols-3 divide-x divide-gray-100">
          <div className="py-3 text-center">
            <p className="text-xl font-bold text-gray-900">{applications.length}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Applied</p>
          </div>
          <div className="py-3 text-center">
            <p className="text-xl font-bold text-amber-500">{pending}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Pending</p>
          </div>
          <div className="py-3 text-center">
            <p className="text-xl font-bold text-green-600">{approved}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Approved</p>
          </div>
        </div>
      )}

      <div className="px-4 mt-5 space-y-5">
        <button
          onClick={() => navigate('/tenant/search')}
          className="w-full bg-[#1D9E75] text-white rounded-xl py-4 flex items-center justify-center gap-2 font-semibold shadow-lg shadow-[#1D9E75]/20">
          <Search className="w-5 h-5" />
          Browse Available Listings
        </button>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">My Applications</h2>
            <span className="text-xs text-gray-400">{applications.length}</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-xl p-3 flex gap-3 animate-pulse border border-gray-100">
                  <div className="w-14 h-14 bg-gray-200 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-gray-200 rounded w-28" />
                    <div className="h-3 bg-gray-200 rounded w-20" />
                    <div className="h-4 bg-gray-200 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
              <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium text-sm">No applications yet</p>
              <p className="text-gray-400 text-xs mt-1">Browse listings and apply to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map(app => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  onClick={() => navigate(`/tenant/listing/${app.properties?.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
