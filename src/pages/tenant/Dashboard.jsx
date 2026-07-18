import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Search, FileText, Clock, CheckCircle2, XCircle, ChevronRight, Home, Sparkles } from 'lucide-react'

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

function OnboardingCard({ profile, onAddVoucherSize, onBrowse, onDismiss }) {
  const steps = [
    {
      label: 'Account created',
      done: true,
    },
    {
      label: profile?.voucher_size != null && profile?.household_size != null && profile?.has_pet != null
        ? `Profile set — ${profile.voucher_size === 0 ? 'Studio' : `${profile.voucher_size} BR`} · ${profile.household_size} person${profile.household_size !== 1 ? 's' : ''}${profile.has_pet ? ' · 🐾 Pet' : ''}`
        : 'Add your voucher & household info',
      done: profile?.voucher_size != null && profile?.household_size != null && profile?.has_pet != null,
      action: onAddVoucherSize,
      cta: 'Add now',
    },
    {
      label: 'Browse available listings',
      done: false,
      action: onBrowse,
      cta: 'Search',
    },
  ]

  const completedCount = steps.filter(s => s.done).length
  const allDone = completedCount === steps.length
  const pct = Math.round((completedCount / steps.length) * 100)

  if (allDone) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#1D9E75]" />
          <span className="text-sm font-bold text-gray-900">Get started</span>
        </div>
        <button onClick={onDismiss} className="text-gray-300 text-xs hover:text-gray-400">skip</button>
      </div>

      <p className="text-xs text-gray-400 mb-4">{completedCount} of {steps.length} complete</p>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-[#1D9E75] rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
              step.done ? 'bg-[#1D9E75]' : 'border-2 border-gray-200'
            }`}>
              {step.done && <CheckCircle2 size={12} className="text-white" />}
            </div>
            <span className={`flex-1 text-sm ${step.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
              {step.label}
            </span>
            {!step.done && step.action && (
              <button
                onClick={step.action}
                className="text-xs font-semibold text-[#1D9E75] shrink-0"
              >
                {step.cta} →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function VoucherSizeModal({ onSave, onClose }) {
  const [size, setSize] = useState('')
  const [household, setHousehold] = useState('')
  const [hasPet, setHasPet] = useState(null)
  const [petType, setPetType] = useState('')
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()

  async function handleSave() {
    if (size === '' || household === '' || hasPet === null) return
    setSaving(true)
    await supabase.from('profiles').update({
      voucher_size: parseInt(size),
      household_size: parseInt(household),
      has_pet: hasPet,
      pet_type: hasPet ? petType : null,
    }).eq('id', user.id)
    onSave(parseInt(size), parseInt(household), hasPet, hasPet ? petType : null)
    setSaving(false)
  }

  const bedroomOptions = [
    { value: '0', label: 'Studio' },
    { value: '1', label: '1 Bedroom' },
    { value: '2', label: '2 Bedrooms' },
    { value: '3', label: '3 Bedrooms' },
    { value: '4', label: '4 Bedrooms' },
  ]

  const householdOptions = [1,2,3,4,5,6,7,8].map(n => ({
    value: String(n),
    label: n === 1 ? '1 person (just me)' : `${n} people`,
  }))

  const petOptions = [
    { value: 'Dog', label: '🐕 Dog' },
    { value: 'Cat', label: '🐈 Cat' },
    { value: 'Dog & Cat', label: '🐕🐈 Dog & Cat' },
    { value: 'Other', label: '🐾 Other' },
  ]

  const canSave = size !== '' && household !== '' && hasPet !== null && (hasPet === false || petType !== '')

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Your rental profile</h2>
        <p className="text-sm text-gray-500 mb-6">
          Landlords see this when you apply — fill it out accurately.
        </p>

        <div className="mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-2">Voucher bedroom size</p>
          <div className="grid grid-cols-2 gap-2">
            {bedroomOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSize(opt.value)}
                className={`border-2 rounded-xl py-3 text-sm font-medium transition-colors ${
                  size === opt.value
                    ? 'border-[#1D9E75] bg-green-50 text-[#1D9E75]'
                    : 'border-gray-200 text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-2">People on your voucher</p>
          <div className="grid grid-cols-2 gap-2">
            {householdOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setHousehold(opt.value)}
                className={`border-2 rounded-xl py-3 text-sm font-medium transition-colors ${
                  household === opt.value
                    ? 'border-[#1D9E75] bg-green-50 text-[#1D9E75]'
                    : 'border-gray-200 text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-2">Do you have a pet?</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => { setHasPet(false); setPetType('') }}
              className={`border-2 rounded-xl py-3 text-sm font-medium transition-colors ${
                hasPet === false
                  ? 'border-[#1D9E75] bg-green-50 text-[#1D9E75]'
                  : 'border-gray-200 text-gray-700'
              }`}
            >
              No pets
            </button>
            <button
              onClick={() => setHasPet(true)}
              className={`border-2 rounded-xl py-3 text-sm font-medium transition-colors ${
                hasPet === true
                  ? 'border-[#1D9E75] bg-green-50 text-[#1D9E75]'
                  : 'border-gray-200 text-gray-700'
              }`}
            >
              Yes, I have a pet
            </button>
          </div>

          {hasPet === true && (
            <div>
              <p className="text-xs text-gray-500 mb-2">What type?</p>
              <div className="grid grid-cols-2 gap-2">
                {petOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPetType(opt.value)}
                    className={`border-2 rounded-xl py-3 text-sm font-medium transition-colors ${
                      petType === opt.value
                        ? 'border-[#1D9E75] bg-green-50 text-[#1D9E75]'
                        : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3">
                ⚠️ Always disclose pets honestly. Misrepresenting this on an application can get you rejected or lose your voucher.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full bg-[#1B3A6B] text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
        >
          {saving ? 'Saving...' : 'Save profile'}
        </button>
        <button onClick={onClose} className="w-full text-center text-sm text-gray-400 mt-3">
          Cancel
        </button>
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
  const [showVoucherModal, setShowVoucherModal] = useState(false)
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem('settleed_onboarding_done') === 'true'
  )

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
          .select('full_name, first_name, housing_authority, voucher_size, household_size, has_pet, pet_type, profile_wizard_completed')
          .eq('id', user.id)
          .single(),
      ])
      setApplications(apps || [])
      setProfile(prof)
      setLoading(false)
      // Auto-launch wizard for new tenants who haven't completed it
      if (prof && prof.profile_wizard_completed === false) {
        navigate('/tenant/profile/setup')
      }
    }
    fetchData()
  }, [user.id])

  function handleVoucherSave(size, householdSize, hasPet, petType) {
    setProfile(prev => ({ ...prev, voucher_size: size, household_size: householdSize, has_pet: hasPet, pet_type: petType }))
    setShowVoucherModal(false)
  }

  function handleDismissOnboarding() {
    localStorage.setItem('settleed_onboarding_done', 'true')
    setOnboardingDismissed(true)
  }

  function handleBrowse() {
    navigate('/tenant/search')
  }

  const pending  = applications.filter(a => a.status === 'pending').length
  const approved = applications.filter(a => a.status === 'approved').length
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const isNewUser = applications.length === 0

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-6">
        <p className="text-white/60 text-sm">{isNewUser ? 'Welcome to Settleed 👋' : 'Welcome back'}</p>
        <h1 className="text-white text-xl font-bold">{firstName}</h1>
        {profile?.housing_authority && (
          <div className="mt-3 bg-white/10 rounded-xl px-3 py-2.5 inline-flex items-center gap-2">
            <div className="w-2 h-2 bg-[#1D9E75] rounded-full" />
            <span className="text-white text-xs font-medium">
              {profile.housing_authority} Voucher
              {profile.voucher_size != null
                ? ` · ${profile.voucher_size === 0 ? 'Studio' : `${profile.voucher_size} BR`}`
                : ''}
              {profile.household_size != null
                ? ` · ${profile.household_size} person${profile.household_size !== 1 ? 's' : ''}`
                : ''}
            </span>
          </div>
        )}
      </div>

      {/* Stats (only after first application) */}
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

      <div className="px-4 mt-5 space-y-4">
        {/* Onboarding checklist */}
        {!onboardingDismissed && !loading && (
          <OnboardingCard
            profile={profile}
            onAddVoucherSize={() => setShowVoucherModal(true)}
            onBrowse={handleBrowse}
            onDismiss={handleDismissOnboarding}
          />
        )}

        {/* Search CTA */}
        <button
          onClick={handleBrowse}
          className="w-full bg-[#1D9E75] text-white rounded-xl py-4 flex items-center justify-center gap-2 font-semibold shadow-lg shadow-[#1D9E75]/20"
        >
          <Search className="w-5 h-5" />
          Browse Available Listings
        </button>

        {/* Applications */}
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
              <p className="text-gray-400 text-xs mt-1">Find a listing you like and apply with your voucher</p>
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

      {/* Voucher size modal */}
      {showVoucherModal && (
        <VoucherSizeModal
          onSave={handleVoucherSave}
          onClose={() => setShowVoucherModal(false)}
        />
      )}
    </div>
  )
}
