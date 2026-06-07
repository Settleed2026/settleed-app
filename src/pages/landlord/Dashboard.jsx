import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import BottomNav from '../../components/BottomNav'
import { Plus, AlertTriangle, CheckCircle, Clock, Inbox } from 'lucide-react'
import { differenceInDays, format } from 'date-fns'

export default function LandlordDashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [properties, setProperties] = useState([])
  const [inspections, setInspections] = useState([])
  const [appCount, setAppCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  async function fetchData() {
    const [profileRes, propsRes, inspRes, appRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('properties').select('*').eq('landlord_id', user.id).neq('status', 'deleted'),
      supabase.from('hqs_inspections').select('*, properties(neighborhood)').eq('landlord_id', user.id),
      supabase.from('applications').select('id', { count: 'exact' }).eq('landlord_id', user.id).eq('status', 'pending'),
    ])
    setProfile(profileRes.data)
    setProperties(propsRes.data || [])
    setInspections(inspRes.data || [])
    setAppCount(appRes.count || 0)
    setLoading(false)
  }

  function inspectionStatus(nextDate) {
    if (!nextDate) return 'unknown'
    const days = differenceInDays(new Date(nextDate), new Date())
    if (days < 0) return 'overdue'
    if (days <= 30) return 'urgent'
    if (days <= 90) return 'warning'
    return 'ok'
  }

  function statusColor(status) {
    return {
      ok: 'text-green-600 bg-green-50',
      warning: 'text-yellow-600 bg-yellow-50',
      urgent: 'text-orange-600 bg-orange-50',
      overdue: 'text-red-600 bg-red-50',
      unknown: 'text-gray-500 bg-gray-50',
    }[status]
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const activeProperties = properties.filter(p => p.status === 'active')

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-6">
        <p className="text-blue-200 text-sm">Good morning</p>
        <h1 className="text-white text-2xl font-bold">{firstName}</h1>
        <div className="flex gap-3 mt-4">
          <div className="bg-white/10 rounded-xl p-3 flex-1 text-center">
            <div className="text-white text-2xl font-bold">{activeProperties.length}</div>
            <div className="text-blue-200 text-xs mt-0.5">Active listings</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 flex-1 text-center">
            <div className="text-white text-2xl font-bold">{appCount}</div>
            <div className="text-blue-200 text-xs mt-0.5">New applications</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 flex-1 text-center">
            <div className="text-white text-2xl font-bold">{inspections.length}</div>
            <div className="text-blue-200 text-xs mt-0.5">Units tracked</div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        <Link to="/landlord/listing/new" className="flex items-center justify-between bg-[#1D9E75] text-white rounded-xl px-4 py-4">
          <div>
            <div className="font-semibold text-sm">Add a new listing</div>
            <div className="text-green-100 text-xs mt-0.5">Attract verified voucher holders</div>
          </div>
          <Plus className="w-5 h-5" />
        </Link>

        {appCount > 0 && (
          <Link to="/landlord/applications" className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-4">
            <div>
              <div className="font-semibold text-sm text-[#1B3A6B]">{appCount} pending application{appCount > 1 ? 's' : ''}</div>
              <div className="text-blue-500 text-xs mt-0.5">Tap to review</div>
            </div>
            <Inbox className="w-5 h-5 text-[#1B3A6B]" />
          </Link>
        )}

        {inspections.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 text-sm">HQS Inspections</h2>
              <Link to="/landlord/hqs" className="text-[#1B3A6B] text-xs font-medium">View all</Link>
            </div>
            <div className="space-y-2">
              {inspections.slice(0, 3).map(insp => {
                const status = inspectionStatus(insp.next_inspection_date)
                const days = insp.next_inspection_date ? differenceInDays(new Date(insp.next_inspection_date), new Date()) : null
                return (
                  <div key={insp.id} className="bg-white rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-gray-900">{insp.properties?.neighborhood || 'Property'}</div>
                      <div className="text-gray-400 text-xs mt-0.5">
                        {insp.next_inspection_date ? `Due ${format(new Date(insp.next_inspection_date), 'MMM d, yyyy')}` : 'No date set'}
                      </div>
                    </div>
                    <div className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(status)}`}>
                      {days !== null ? (days < 0 ? 'Overdue' : `${days}d`) : '--'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <h2 className="font-semibold text-gray-900 text-sm mb-3">My listings</h2>
          {properties.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center">
              <p className="text-gray-400 text-sm">No listings yet.</p>
              <Link to="/landlord/listing/new" className="text-[#1D9E75] text-sm font-medium mt-1 inline-block">Add your first property</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {properties.map(p => (
                <Link key={p.id} to={`/landlord/listing/${p.id}/edit`} className="bg-white rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm text-gray-900">{p.neighborhood}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{p.bedrooms}BR · ${p.rent_amount?.toLocaleString()}/mo</div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    p.status === 'active' ? 'bg-green-50 text-green-600' :
                    p.status === 'rented' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav role="landlord" />
    </div>
  )
}
