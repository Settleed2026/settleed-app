import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import BottomNav from '../../components/BottomNav'
import toast from 'react-hot-toast'
import { LogOut, ChevronRight, Building2, CreditCard, AlertTriangle, X, Upload, ShieldCheck, ShieldAlert, Clock } from 'lucide-react'

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
  const [verificationStatus, setVerificationStatus] = useState('unverified')
  const [uploadedDocs, setUploadedDocs] = useState([])
  const [uploading, setUploading] = useState({})

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
      setVerificationStatus(data.verification_status || 'unverified')
    }

    const { data: docs } = await supabase
      .from('verification_documents')
      .select('document_type, file_name, status, uploaded_at')
      .eq('landlord_id', user.id)
      .order('uploaded_at', { ascending: false })
    setUploadedDocs(docs || [])

    setLoading(false)
  }

  async function handleManagePayouts() {
    setConnectLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'login_link' }),
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

  const DOC_TYPES = [
    { key: 'government_id',  label: 'Government ID',       desc: "Driver's license, passport, or state ID" },
    { key: 'selfie',         label: 'Selfie with ID',      desc: 'Photo of you holding your government ID' },
    { key: 'property_deed',  label: 'Proof of Ownership',  desc: 'Property deed, tax bill, or mortgage statement' },
  ]

  async function handleDocUpload(docType, file) {
    if (!file) return
    const MAX_MB = 10
    if (file.size > MAX_MB * 1024 * 1024) { toast.error(`File must be under ${MAX_MB} MB.`); return }

    setUploading(prev => ({ ...prev, [docType]: true }))
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${docType}_${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('verification-documents')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (uploadErr) throw uploadErr

      const { error: dbErr } = await supabase.from('verification_documents').insert({
        landlord_id: user.id,
        document_type: docType,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
      })
      if (dbErr) throw dbErr

      if (verificationStatus === 'unverified' || verificationStatus === 'rejected') {
        await supabase.from('profiles').update({ verification_status: 'pending' }).eq('id', user.id)
        setVerificationStatus('pending')
      }

      const { data: docs } = await supabase
        .from('verification_documents')
        .select('document_type, file_name, status, uploaded_at')
        .eq('landlord_id', user.id)
        .order('uploaded_at', { ascending: false })
      setUploadedDocs(docs || [])
      toast.success('Document uploaded — we\'ll review it shortly.')
    } catch (err) {
      toast.error(err.message || 'Upload failed.')
    } finally {
      setUploading(prev => ({ ...prev, [docType]: false }))
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

        {/* ── Verification ────────────────────────────────────────────── */}
        <div className="mt-3 bg-white rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Identity Verification</p>
            {verificationStatus === 'verified' && (
              <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" /> Verified
              </span>
            )}
            {verificationStatus === 'pending' && (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" /> Under Review
              </span>
            )}
            {(verificationStatus === 'unverified' || verificationStatus === 'rejected') && (
              <span className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                <ShieldAlert className="w-3 h-3" /> {verificationStatus === 'rejected' ? 'Rejected' : 'Not Verified'}
              </span>
            )}
          </div>

          {verificationStatus === 'verified' ? (
            <p className="text-sm text-gray-500">Your identity has been verified. Your listings will be shown with a verified badge.</p>
          ) : (
            <>
              <p className="text-sm text-gray-500">
                {verificationStatus === 'pending'
                  ? 'Your documents are under review. We\'ll notify you once approved.'
                  : verificationStatus === 'rejected'
                  ? 'Your previous submission was rejected. Please re-upload clear, readable documents.'
                  : 'Upload the documents below to get your account verified. Verified landlords get more applications.'}
              </p>

              <div className="space-y-3">
                {DOC_TYPES.map(({ key, label, desc }) => {
                  const existing = uploadedDocs.find(d => d.document_type === key)
                  return (
                    <div key={key} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                          {existing && (
                            <p className="text-xs mt-1 font-medium truncate" style={{ color: existing.status === 'accepted' ? '#16a34a' : existing.status === 'rejected' ? '#dc2626' : '#d97706' }}>
                              {existing.status === 'accepted' ? '✓ Accepted' : existing.status === 'rejected' ? '✗ Rejected — re-upload' : '⏳ ' + existing.file_name}
                            </p>
                          )}
                        </div>
                        <label className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                          uploading[key] ? 'bg-gray-100 text-gray-400' : 'bg-[#EEF5FF] text-[#1B3A6B] hover:bg-[#dbeafe]'
                        }`}>
                          {uploading[key] ? (
                            <span className="w-3 h-3 border-2 border-[#1B3A6B] border-t-transparent rounded-full animate-spin inline-block" />
                          ) : (
                            <Upload className="w-3 h-3" />
                          )}
                          {uploading[key] ? 'Uploading…' : existing ? 'Replace' : 'Upload'}
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*,.pdf"
                            disabled={uploading[key]}
                            onChange={e => handleDocUpload(key, e.target.files?.[0])}
                          />
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

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
