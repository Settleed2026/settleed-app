import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { HOUSING_AUTHORITIES } from '../../lib/paymentStandards'
import toast from 'react-hot-toast'
import {
  LogOut, ChevronRight, User, Bell, Shield,
  Home, X, AlertTriangle,
} from 'lucide-react'

const VOUCHER_STATUS_LABELS = { yes: 'Active', no: 'No voucher', pending: 'Pending' }
const HA_LABELS = {
  AHA: 'Atlanta Housing (AHA)', DCA: 'Georgia DCA',
  COBB: 'Cobb County HA', DEKALB: 'DeKalb County HA', other: 'Other',
}

export default function TenantProfile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    preferredName: '',
    secondaryPhone: '',
    bio: '',
    housingAuthority: '',
    voucherStatus: '',
    voucherBedroomSize: '',
    contactPreferences: ['email'],
  })

  const [profile, setProfile] = useState(null)

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
      setProfile(data)
      setForm({
        firstName: data.first_name || data.full_name?.split(' ')[0] || '',
        lastName: data.last_name || data.full_name?.split(' ').slice(1).join(' ') || '',
        phone: data.phone || '',
        preferredName: data.preferred_name || '',
        secondaryPhone: data.secondary_phone || '',
        bio: data.bio || '',
        housingAuthority: data.housing_authority || '',
        voucherStatus: data.voucher_status || '',
        voucherBedroomSize: data.voucher_bedroom_size || '',
        contactPreferences: data.contact_preferences || ['email'],
      })
    }
    setLoading(false)
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function toggleContact(method) {
    setForm(prev => {
      const arr = prev.contactPreferences
      return {
        ...prev,
        contactPreferences: arr.includes(method)
          ? arr.filter(x => x !== method)
          : [...arr, method],
      }
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const fullName = `${form.firstName} ${form.lastName}`.trim()
    const { error } = await supabase.from('profiles').update({
      full_name: fullName,
      first_name: form.firstName,
      last_name: form.lastName,
      phone: form.phone || null,
      preferred_name: form.preferredName || null,
      secondary_phone: form.secondaryPhone || null,
      bio: form.bio || null,
      housing_authority: form.housingAuthority || null,
      voucher_status: form.voucherStatus || null,
      voucher_bedroom_size: form.voucherBedroomSize || null,
      contact_preferences: form.contactPreferences,
    }).eq('id', user.id)

    setSaving(false)
    if (error) toast.error('Failed to save changes.')
    else toast.success('Profile updated!')
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

  const initials = `${form.firstName?.[0] || ''}${form.lastName?.[0] || ''}`.toUpperCase() || '?'

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-white text-xl font-bold truncate">
              {form.preferredName || form.firstName || 'My'} {!form.preferredName && form.lastName}
            </h1>
            <p className="text-blue-200 text-sm">{user?.email}</p>
            {profile?.voucher_status === 'yes' && (
              <span className="mt-1 inline-block bg-[#1D9E75] text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">
                {HA_LABELS[profile?.housing_authority] || 'Voucher Holder'}
                {profile?.voucher_bedroom_size ? ` · ${profile.voucher_bedroom_size.toUpperCase()} voucher` : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">
        <form onSubmit={handleSave} className="space-y-4">
          {/* Personal Info */}
          <div className="bg-white rounded-xl p-4 space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Personal info
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>First name</label>
                <input name="firstName" value={form.firstName} onChange={handleChange}
                  className={inputClass} placeholder="First" />
              </div>
              <div>
                <label className={labelClass}>Last name</label>
                <input name="lastName" value={form.lastName} onChange={handleChange}
                  className={inputClass} placeholder="Last" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Preferred name <span className="text-gray-400 font-normal">(optional)</span></label>
              <input name="preferredName" value={form.preferredName} onChange={handleChange}
                className={inputClass} placeholder="What landlords should call you" />
            </div>
            <div>
              <label className={labelClass}>Mobile phone</label>
              <input name="phone" type="tel" value={form.phone} onChange={handleChange}
                className={inputClass} placeholder="(404) 555-0100" />
            </div>
            <div>
              <label className={labelClass}>Secondary phone <span className="text-gray-400 font-normal">(optional)</span></label>
              <input name="secondaryPhone" type="tel" value={form.secondaryPhone} onChange={handleChange}
                className={inputClass} placeholder="(404) 555-0200" />
            </div>
            <div>
              <label className={labelClass}>About me <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea name="bio" value={form.bio} onChange={handleChange}
                rows={4} maxLength={500}
                placeholder="Introduce yourself to landlords..."
                className={`${inputClass} resize-none`} />
              <p className="text-xs text-gray-400 mt-1">{form.bio.length}/500</p>
            </div>
          </div>

          {/* Voucher Info */}
          <div className="bg-white rounded-xl p-4 space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5" /> Voucher info
            </p>
            <div>
              <label className={labelClass}>Voucher status</label>
              <select name="voucherStatus" value={form.voucherStatus} onChange={handleChange}
                className={`${inputClass} bg-white`}>
                <option value="">Select</option>
                <option value="yes">Active voucher</option>
                <option value="pending">Pending / waiting list</option>
                <option value="no">No voucher</option>
              </select>
            </div>
            {form.voucherStatus === 'yes' && (
              <>
                <div>
                  <label className={labelClass}>Housing authority</label>
                  <select name="housingAuthority" value={form.housingAuthority} onChange={handleChange}
                    className={`${inputClass} bg-white`}>
                    <option value="">Select housing authority</option>
                    {HOUSING_AUTHORITIES.map(ha => (
                      <option key={ha.value} value={ha.value}>{ha.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Voucher bedroom size</label>
                  <select name="voucherBedroomSize" value={form.voucherBedroomSize} onChange={handleChange}
                    className={`${inputClass} bg-white`}>
                    <option value="">Select</option>
                    {[['Studio','studio'],['1 BR','1br'],['2 BR','2br'],['3 BR','3br'],['4 BR','4br'],['5+ BR','5br+']].map(([label,val]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Contact Preferences */}
          <div className="bg-white rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" /> How to contact me
            </p>
            <div className="flex gap-2 flex-wrap">
              {['phone', 'text', 'email', 'in-app'].map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => toggleContact(method)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border-2 capitalize transition-colors ${
                    form.contactPreferences.includes(method)
                      ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#1B3A6B] text-white rounded-xl py-3.5 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        {/* Security */}
        <div className="bg-white rounded-xl divide-y divide-gray-100">
          <button
            onClick={() => navigate('/forgot-password')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-gray-700"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-400" />
              <span>Change password</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => navigate('/tenant/profile/setup')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-sm text-gray-700"
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span>Edit full profile</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Active lease quick link */}
        {profile?.active_lease_id && (
          <button
            onClick={() => navigate('/tenant/lease')}
            className="w-full bg-white rounded-xl px-4 py-3.5 flex items-center justify-between text-sm text-gray-700 border border-gray-100"
          >
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-[#1B3A6B]" />
              <span className="font-medium">View my lease</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

    </div>
  )
}
