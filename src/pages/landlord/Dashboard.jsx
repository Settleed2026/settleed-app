import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import BottomNav from '../../components/BottomNav'
import { Plus, AlertTriangle, CheckCircle, Clock, Inbox, Zap, FileText, MessageSquare, Crown } from 'lucide-react'
import { differenceInDays, format } from 'date-fns'
import toast from 'react-hot-toast'

export default function LandlordDashboard() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [properties, setProperties] = useState([])
  const [inspections, setInspections] = useState([])
  const [appCount, setAppCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  useEffect(() => {
    if (searchParams.get('subscribed') === 'true') {
      toast.success('Subscription started! Your 7-day free trial is active.')
    }
  }, [])

  async function fetchData() {
    try {
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
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function boostListing(e, listingId) {
    e.preventDefault()
    e.stopPropagation()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/feature-listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ listing_id: listingId }),
      })
      const json = await res.json()
      if (json.url) {
        window.location.href = json.url
      } else {
        toast.error(json.error || 'Could not start checkout')
      }
    } catch (err) {
      toast.error('Something went wrong')
    }
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

  const isSubscribed = ['trialing', 'active'].includes(profile?.subscription_status)
  const firstName = profile?.first_name || profile?.full_name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour >= 5 && hour <= 11 ? 'Good morning'
                 : hour >= 12 && hour <= 16 ? 'Good afternoon'
                 : hour >= 17 && hour <= 21 ? 'Good evening'
                 : 'Good night'
  const activeProperties   = properties.filter(p => p.status === 'active' && p.verification_status === 'approved')
  const pendingProperties  = properties.filter(p => p.verification_status === 'verification_pending')
  const rejectedProperties = properties.filter(p => p.verification_status === 'rejected')
  const draftProperties    = properties.filter(p => p.status === 'draft' && p.verification_status === 'draft')
  const verificationStatus = profile?.verification_status ?? 'unverified'

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-6">
        <p className="text-blue-200 text-sm">{greeting}</p>
        <h1 className="text-white text-2xl font-bold">{firstName}</h1>
        <div className="flex gap-3 mt-4">
          <div className="bg-white/10 rounded-xl p-3 flex-1 text-center">
            <div className="text-white text-2xl font-bold">{activeProperties.length}</div>
            <div className="text-blue-200 text-xs mt-0.5">
              {pendingProperties.length > 0 ? `${pendingProperties.length} pending review` : 'Active listings'}
            </div>
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

        {/* Subscription prompt for inactive landlords */}
        {!isSubscribed && (
          <Link to="/subscribe" className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 block">
            <div>
              <div className="font-semibold text-sm text-amber-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                Start your free 7-day trial
              </div>
              <div className="text-amber-700 text-xs mt-0.5">Subscribe to publish listings and reach tenants</div>
            </div>
            <span className="text-xs font-bold text-amber-900 bg-amber-200 px-2.5 py-1 rounded-full">$49/mo →</span>
          </Link>
        )}

        {/* ── Verification status banners ── */}
        {verificationStatus === 'unverified' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-amber-500 text-lg leading-none mt-0.5">⚠</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">Account not yet verified</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Your identity and property ownership must be verified before listings go live.
                Once you submit a listing, Settleed will review and verify your account.
              </p>
            </div>
          </div>
        )}

        {(verificationStatus === 'identity_pending' || verificationStatus === 'property_pending') && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Verification in progress</p>
              <p className="text-xs text-blue-700 mt-0.5">
                We're reviewing your account. Most verifications complete within 1–2 business days.
                We'll email you when it's done.
              </p>
            </div>
          </div>
        )}

        {verificationStatus === 'verified' && pendingProperties.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">
                {pendingProperties.length} listing{pendingProperties.length > 1 ? 's' : ''} under review
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                We're verifying your property details. Listings go live once approved — usually within 1–2 business days.
              </p>
            </div>
          </div>
        )}

        {verificationStatus === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-red-500 text-lg leading-none mt-0.5">✕</span>
            <div>
              <p className="text-sm font-semibold text-red-900">Verification unsuccessful</p>
              <p className="text-xs text-red-700 mt-0.5">
                We were unable to verify your account. Please contact{' '}
                <a href="mailto:support@settleed.com" className="underline">support@settleed.com</a>{' '}
                for details.
              </p>
            </div>
          </div>
        )}

        {verificationStatus === 'suspended' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-900">Account suspended</p>
              <p className="text-xs text-red-700 mt-0.5">
                Your account has been suspended. Contact{' '}
                <a href="mailto:support@settleed.com" className="underline">support@settleed.com</a>{' '}
                to appeal.
              </p>
            </div>
          </div>
        )}

        {/* Rejected listings */}
        {rejectedProperties.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-red-500 text-lg leading-none mt-0.5">✕</span>
            <div>
              <p className="text-sm font-semibold text-red-900">
                {rejectedProperties.length} listing{rejectedProperties.length > 1 ? 's' : ''} not approved
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                One or more listings could not be verified. Contact support for details.
              </p>
            </div>
          </div>
        )}

        {/* Connect bank account prompt for subscribed landlords who haven't connected */}
        {isSubscribed && profile?.connect_onboarding_status !== 'complete' && (
          <Link to="/landlord/connect" className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-4 block">
            <div>
              <div className="font-semibold text-sm text-blue-900 flex items-center gap-1.5">
                🏦 Connect your bank account
              </div>
              <div className="text-blue-700 text-xs mt-0.5">Set up payouts to receive rent payments from tenants</div>
            </div>
            <span className="text-xs font-bold text-blue-900 bg-blue-200 px-2.5 py-1 rounded-full">Set up →</span>
          </Link>
        )}

        <Link to="/landlord/listing/new" className="flex items-center justify-between bg-[#1D9E75] text-white rounded-xl px-4 py-4">
          <div>
            <div className="font-semibold text-sm">Add a new listing</div>
            <div className="text-green-100 text-xs mt-0.5">Attract verified voucher holders</div>
          </div>
          <Plus className="w-5 h-5" />
        </Link>

        {/* Quick tools row */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/landlord/rfta" className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col gap-2 shadow-sm">
            <div className="w-9 h-9 bg-[#1B3A6B]/10 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#1B3A6B]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">RFTA Tracker</p>
              <p className="text-[11px] text-gray-400 leading-tight">Track approvals pipeline</p>
            </div>
          </Link>
          <Link to="/messages" className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col gap-2 shadow-sm">
            <div className="w-9 h-9 bg-[#1D9E75]/10 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-[#1D9E75]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Messages</p>
              <p className="text-[11px] text-gray-400 leading-tight">Chat with applicants</p>
            </div>
          </Link>
        </div>

        {/* Draft listing banner */}
        {draftProperties.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
            <div className="font-semibold text-sm text-amber-800 mb-1">
              📝 {draftProperties.length} draft listing{draftProperties.length > 1 ? 's' : ''} — finish to go live
            </div>
            {draftProperties.map(p => (
              <Link key={p.id} to={`/landlord/listing/${p.id}/edit`}
                className="block text-xs text-amber-700 underline mt-1">
                {p.street_address || p.neighborhood || 'Untitled listing'} → Complete & publish
              </Link>
            ))}
          </div>
        )}

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
                <div key={p.id} className="bg-white rounded-xl p-4 flex items-center justify-between gap-3">
                  <Link to={`/landlord/listing/${p.id}/edit`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="font-medium text-sm text-gray-900 truncate">{p.neighborhood}</div>
                      {p.is_featured && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    </div>
                    <div className="text-gray-400 text-xs mt-0.5">{p.bedrooms}BR · ${p.rent_amount?.toLocaleString()}/mo</div>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.status === 'active' && !p.is_featured && (
                      <button
                        onClick={e => boostListing(e, p.id)}
                        className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full hover:bg-amber-100 transition-colors"
                      >
                        <Crown className="w-3 h-3" /> Boost
                      </button>
                    )}
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      p.status === 'active' ? 'bg-green-50 text-green-600' :
                      p.status === 'rented' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav role="landlord" />
    </div>
  )
}
