import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import BottomNav from '../../components/BottomNav'
import toast from 'react-hot-toast'
import { LogOut, ChevronRight, Building2, CreditCard, AlertTriangle, X } from 'lucide-react'

export default function LandlordProfile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connectStatus, setConnectStatus] = useState(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState(null)
  const [connectLoading, setConnectLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    mobilePhone: '',
    officePhone: '',
    preferredContact: 'email',
    bestTimeToContact: '',
  })

  useEffect(() => {
    if (user) fetchProfile()
  }, [user])

  async function fetchProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setForm({
        firstName: data.first_name || data.full_name?.split(' ')[0] || '',
        lastName: data.last_name || data.full_name?.split(' ').slice(1).join(' ') || '',
        companyName: data.company_name || '',
        mobilePhone: data.phone || '',
        officePhone: data.office_phone || '',
        preferredContact: data.preferred_contact || 'email',
        bestTimeToContact: data.best_time_to_contact || '',
      })
      setConnectStatus(data.connect_onboarding_status ?? null)
      setSubscriptionStatus(data.subscription_status ?? null)
    }
    setLoading(false)
  }

  async function handleManagePayouts() {
    setConnectLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/create-connect-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.open(data.url, '_blank')
    } catch (err) {
      toast.error(err.message || 'Could not open payout dashboard.')
    } finally {
      setConnectLoading(false)
    }
  }

  async function handleCancelSubscription() {
    setCancelLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSubscriptionStatus('canceling')
      setShowCancelModal(false)
      toast.success(`Subscription canceled. You keep access until ${data.cancelDate}.`)
    } catch (err) {
      toast.error(err.message || 'Could not cancel subscription.')
    } finally {
      setCancelLoading(false)
    }
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)

    const fullName = `${form.firstName} ${form.lastName}`.trim()

    const { error } = await supabase.from('profiles').update({
      full_name: fullName,
      first_name: form.firstName,
      last_name: form.lastName,
      company_name: form.companyName || null,
      phone: form.mobilePhone || null,
      office_phone: form.officePhone || null,
      preferred_contact: form.preferredContact || null,
      best_time_to_contact: form.bestTimeToContact || null,
    }).eq('id', user.id)

    setSaving(false)
    if (error) {
      toast.error('Failed to save changes.')
    } else {
      toast.success('Profile updated!')
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const inputClass = 'w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-6">
        <p className="text-blue-200 text-xs uppercase tracking-wide mb-1">Account</p>
        <h1 className="text-white text-2xl font-bold">
          {form.firstName || 'My'} {form.lastName || 'Profile'}
        </h1>
        <p className="text-blue-200 text-sm mt-0.5">{user?.email}</p>
      </div>

      <div className="px-4 pt-5">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="bg-white rounded-xl p-4 space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Personal info</p>

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>First name</label>
                <input name="firstName" type="text" value={form.firstName} onChange={handleChange}
                  className={inputClass} placeholder="John" />
              </div>
              <div>
                <label className={labelClass}>Last name</label>
                <input name="lastName" type="text" value={form.lastName} onChange={handleChange}
                  className={inputClass} placeholder="Smith" />
              </div>
            </div>

            {/* Company */}
            <div>
              <label className={labelClass}>Company name <span className="text-gray-400 font-normal">(optional)</span></label>
              <input name="companyName" type="text" value={form.companyName} onChange={handleChange}
                className={inputClass} placeholder="Smith Properties LLC" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact info</p>

            {/* Mobile */}
            <div>
              <label className={labelClass}>Mobile phone</label>
              <input name="mobilePhone" type="tel" value={form.mobilePhone} onChange={handleChange}
                className={inputClass} placeholder="(404) 555-0100" />
            </div>

            {/* Office */}
            <div>
              <label className={labelClass}>Office phone <span className="text-gray-400 font-normal">(optional)</span></label>
              <input name="officePhone" type="tel" value={form.officePhone} onChange={handleChange}
                className={inputClass} placeholder="(404) 555-0200" />
            </div>

            {/* Preferred contact */}
            <div>
              <label className={labelClass}>Preferred contact method</label>
              <div className="flex gap-2">
                {['phone', 'text', 'email'].map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, preferredContact: method }))}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border capitalize transition-colors ${
                      form.preferredContact === method
                        ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                        : 'bg-white text-gray-600 border-gray-300'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Best time */}
            <div>
              <label className={labelClass}>Best time to contact <span className="text-gray-400 font-normal">(optional)</span></label>
              <select name="bestTimeToContact" value={form.bestTimeToContact} onChange={handleChange}
                className={`${inputClass} bg-white`}>
                <option value="">Select a time</option>
                <option value="morning">Morning (8am–12pm)</option>
                <option value="afternoon">Afternoon (12pm–5pm)</option>
                <option value="evening">Evening (5pm–8pm)</option>
                <option value="anytime">Anytime</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#1B3A6B] text-white rounded-xl py-3.5 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </form>

        {/* Change password */}
        <button
          onClick={() => navigate('/forgot-password')}
          className="w-full mt-3 bg-white border border-gray-200 rounded-xl px-4 py-3.5 flex items-center justify-between text-sm text-gray-700"
        >
          <span>Change password</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        {/* Payout account */}
        {connectStatus === 'complete' && (
          <button
            onClick={handleManagePayouts}
            disabled={connectLoading}
            className="w-full mt-3 bg-white border border-gray-200 rounded-xl px-4 py-3.5 flex items-center justify-between text-sm text-gray-700 disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#1B3A6B]" />
              <span>{connectLoading ? 'Opening…' : 'Manage payout account'}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        )}

        {/* Subscription */}
        {['trialing', 'active'].includes(subscriptionStatus) && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="w-full mt-3 bg-white border border-gray-200 rounded-xl px-4 py-3.5 flex items-center justify-between text-sm text-gray-700"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-500" />
              <span>Cancel subscription</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        )}

        {subscriptionStatus === 'canceling' && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 text-sm text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Your subscription is canceled and will end at the close of your current billing period.
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full mt-3 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      <BottomNav role="landlord" />

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 px-4 pb-8">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <button onClick={() => setShowCancelModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Cancel subscription?</h2>
            <p className="text-sm text-gray-500 mb-6">
              You'll keep full access until the end of your current billing period. After that, your listings will be deactivated and you won't be charged again.
            </p>
            <div className="space-y-2">
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="w-full py-3 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {cancelLoading ? 'Canceling…' : 'Yes, cancel my subscription'}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium"
              >
                Keep my subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
