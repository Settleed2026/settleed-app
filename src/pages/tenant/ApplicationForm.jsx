import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { HOUSING_AUTHORITIES } from '../../lib/paymentStandards'
import toast from 'react-hot-toast'
import { ChevronLeft, Upload, X, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react'

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]'
const labelClass = 'text-xs text-gray-500 mb-1 block'
const sectionHead = 'font-semibold text-sm text-gray-900 mb-3'

const INCOME_SOURCES = [
  { value: 'employment', label: 'Employment / Wages' },
  { value: 'self_employment', label: 'Self-Employment' },
  { value: 'ssi', label: 'SSI / Social Security' },
  { value: 'disability', label: 'Disability Benefits' },
  { value: 'tanf', label: 'TANF / Public Assistance' },
  { value: 'child_support', label: 'Child Support / Alimony' },
  { value: 'pension', label: 'Pension / Retirement' },
  { value: 'other', label: 'Other' },
]

const STEPS = [
  { key: 'voucher',      label: 'Voucher' },
  { key: 'household',   label: 'Household' },
  { key: 'income',      label: 'Income' },
  { key: 'history',     label: 'History' },
  { key: 'background',  label: 'Background' },
  { key: 'documents',   label: 'Documents' },
  { key: 'intro',       label: 'Intro' },
]

// ── Document uploader ────────────────────────────────────────────────────────
function DocUploader({ label, hint, fieldKey, url, onUploaded, userId }) {
  const [uploading, setUploading] = useState(false)
  const ref = useRef()

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const ALLOWED = ['image/jpeg','image/png','image/webp','application/pdf']
    if (!ALLOWED.includes(file.type)) { toast.error('JPG, PNG, WebP, or PDF only'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10 MB'); return }
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}/${fieldKey}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('tenant-documents').upload(path, file, { upsert: true })
    if (error) { toast.error('Upload failed'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('tenant-documents').getPublicUrl(path)
    onUploaded(fieldKey, publicUrl)
    setUploading(false)
    toast.success(`${label} uploaded`)
  }

  return (
    <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center">
      <p className="text-xs font-semibold text-gray-700 mb-0.5">{label}</p>
      {hint && <p className="text-[10px] text-gray-400 mb-3">{hint}</p>}
      {url ? (
        <div className="flex items-center justify-center gap-2 text-[#1D9E75] text-xs font-semibold">
          <CheckCircle className="w-4 h-4" /> Uploaded
          <button onClick={() => onUploaded(fieldKey, '')} className="ml-1 text-gray-400 hover:text-red-500">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 mx-auto text-xs font-semibold text-[#1B3A6B] bg-[#EEF5FF] px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {uploading ? <span className="w-3.5 h-3.5 border-2 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? 'Uploading…' : 'Choose file'}
        </button>
      )}
      <input ref={ref} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={handleFile} />
    </div>
  )
}

// ── Step progress bar ────────────────────────────────────────────────────────
function StepBar({ steps, current }) {
  const idx = steps.findIndex(s => s.key === current)
  const pct = Math.round(((idx + 1) / steps.length) * 100)
  return (
    <div className="px-4 pt-3 pb-2">
      <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
        <span>Step {idx + 1} of {steps.length}</span>
        <span>{steps[idx]?.label}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-[#1D9E75] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function ApplicationForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [alreadyApplied, setAlreadyApplied] = useState(false)
  const [step, setStep] = useState('voucher')

  const [form, setForm] = useState({
    // Voucher
    housing_authority: '',
    voucher_size: '',
    voucher_expiration: '',
    // Household
    adults_count: '1',
    adult_names: [''],
    children_count: '0',
    children_ages: '',
    household_size: '',
    desired_move_in: '',
    // Income
    monthly_income: '',
    income_source: '',
    employer_name: '',
    employment_length: '',
    // Rental history
    current_address: '',
    time_at_address: '',
    move_reason: '',
    prev_landlord_contact: '',
    // Background
    has_criminal_history: '',
    criminal_explanation: '',
    // Documents
    id_document_url: '',
    voucher_document_url: '',
    income_document_url: '',
    reference_document_url: '',
    // Intro
    message: '',
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const [listingRes, dupeRes, profileRes] = await Promise.all([
          supabase.from('properties')
            .select('id, neighborhood, zip_code, bedrooms, rent_amount, photos, landlord_id, application_fee')
            .eq('id', id).single(),
          supabase.from('applications')
            .select('id').eq('property_id', id).eq('tenant_id', user.id).maybeSingle(),
          supabase.from('profiles')
            .select('saved_application_data, housing_authority, voucher_size')
            .eq('id', user.id).single(),
        ])
        setListing(listingRes.data || null)
        if (dupeRes.data) setAlreadyApplied(true)

        // Pre-fill from saved profile
        const saved = profileRes.data?.saved_application_data
        if (saved) {
          setForm(prev => ({ ...prev, ...saved }))
        } else {
          // Pull what we can from profile
          const p = profileRes.data
          setForm(prev => ({
            ...prev,
            housing_authority: p?.housing_authority || '',
            voucher_size: p?.voucher_size != null ? String(p.voucher_size) : '',
          }))
        }
      } catch (err) {
        console.error('ApplicationForm fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, user.id])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function handleDocUploaded(fieldKey, url) {
    setForm(prev => ({ ...prev, [fieldKey]: url }))
  }

  function handleAdultName(idx, value) {
    setForm(prev => {
      const names = [...(prev.adult_names || [''])]
      names[idx] = value
      return { ...prev, adult_names: names }
    })
  }

  function syncAdultCount(count) {
    const n = parseInt(count) || 1
    setForm(prev => {
      const names = [...(prev.adult_names || [''])]
      while (names.length < n) names.push('')
      return { ...prev, adults_count: String(n), adult_names: names.slice(0, n) }
    })
  }

  // Validate current step before advancing
  function validateStep() {
    if (step === 'voucher') {
      if (!form.housing_authority) { toast.error('Select your housing authority'); return false }
      if (!form.voucher_size) { toast.error('Select your voucher bedroom size'); return false }
    }
    if (step === 'income') {
      if (!form.monthly_income) { toast.error('Enter your monthly household income'); return false }
      if (!form.income_source) { toast.error('Select your income source'); return false }
    }
    if (step === 'background') {
      if (form.has_criminal_history === '') { toast.error('Please answer the background question'); return false }
    }
    if (step === 'documents') {
      if (!form.id_document_url) { toast.error('A government-issued photo ID is required'); return false }
      if (!form.voucher_document_url) { toast.error('Your voucher letter is required'); return false }
      if (!form.income_document_url) { toast.error('Income verification document is required'); return false }
    }
    return true
  }

  function nextStep() {
    if (!validateStep()) return
    const idx = STEPS.findIndex(s => s.key === step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key)
  }

  function prevStep() {
    const idx = STEPS.findIndex(s => s.key === step)
    if (idx > 0) setStep(STEPS[idx - 1].key)
  }

  async function handleSubmit() {
    if (!validateStep()) return
    setSubmitting(true)

    // Build the household_size from adults + children
    const adultsN = parseInt(form.adults_count) || 1
    const childrenN = parseInt(form.children_count) || 0
    const householdSize = adultsN + childrenN

    // Parse children ages
    const childrenAges = form.children_ages
      ? form.children_ages.split(',').map(a => parseInt(a.trim())).filter(n => !isNaN(n))
      : []

    const payload = {
      property_id: id,
      tenant_id: user.id,
      status: 'pending',
      // Voucher
      housing_authority: form.housing_authority,
      voucher_size: parseInt(form.voucher_size),
      voucher_expiration: form.voucher_expiration || null,
      // Household
      household_size: householdSize,
      adults_count: adultsN,
      adult_names: form.adult_names.filter(n => n.trim()),
      children_count: childrenN,
      children_ages: childrenAges,
      desired_move_in: form.desired_move_in || null,
      // Income
      monthly_income: form.monthly_income ? parseFloat(form.monthly_income) : null,
      income_source: form.income_source || null,
      employer_name: form.employer_name || null,
      employment_length: form.employment_length || null,
      // History
      current_address: form.current_address || null,
      time_at_address: form.time_at_address || null,
      move_reason: form.move_reason || null,
      prev_landlord_contact: form.prev_landlord_contact || null,
      // Background
      has_criminal_history: form.has_criminal_history === 'yes',
      criminal_explanation: form.criminal_explanation || null,
      // Documents
      id_document_url: form.id_document_url || null,
      voucher_document_url: form.voucher_document_url || null,
      income_document_url: form.income_document_url || null,
      reference_document_url: form.reference_document_url || null,
      // Intro
      message: form.message || null,
    }

    const { error } = await supabase.from('applications').insert(payload)

    if (error) {
      if (error.code === '23505') {
        setAlreadyApplied(true)
      } else {
        toast.error(error.message)
      }
      setSubmitting(false)
      return
    }

    // Save reusable profile data (exclude property-specific fields)
    const saveableData = {
      housing_authority: form.housing_authority,
      voucher_size: form.voucher_size,
      adults_count: form.adults_count,
      adult_names: form.adult_names,
      children_count: form.children_count,
      monthly_income: form.monthly_income,
      income_source: form.income_source,
      employer_name: form.employer_name,
      employment_length: form.employment_length,
      current_address: form.current_address,
      time_at_address: form.time_at_address,
      has_criminal_history: form.has_criminal_history,
    }
    supabase.from('profiles').update({ saved_application_data: saveableData }).eq('id', user.id).then(() => {})

    // Notify landlord
    if (listing) {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: tenantProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          type: 'new_application',
          payload: {
            landlord_id: listing.landlord_id || null,
            tenant_name: tenantProfile?.full_name || user.email,
            property_address: `${listing.neighborhood}${listing.zip_code ? `, ${listing.zip_code}` : ''}`,
          },
        }),
      }).catch(() => {})
    }

    setSubmitted(true)
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-[#1B3A6B] px-4 pt-10 pb-5 h-20 animate-pulse" />
      </div>
    )
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 pb-10">
        <div className="bg-[#1B3A6B] px-4 pt-10 pb-5">
          <h1 className="text-white text-lg font-bold">Application Sent</h1>
        </div>
        <div className="mx-4 mt-8 bg-white rounded-2xl p-6 flex flex-col items-center text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#EBF9F4] flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-[#1D9E75]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">You're in the running!</h2>
          <p className="text-sm text-gray-500 mb-1">
            Your application for{' '}
            <span className="font-semibold text-gray-700">{listing?.neighborhood}</span>{' '}
            has been sent to the landlord.
          </p>
          <p className="text-xs text-gray-400 mb-2">Your application profile has been saved — future applications will pre-fill automatically.</p>
          <p className="text-xs text-gray-400 mb-6">Most landlords respond within 1–3 business days.</p>
          <button onClick={() => navigate('/tenant/applications')}
            className="w-full bg-[#1D9E75] text-white rounded-xl py-3 font-semibold text-sm mb-3">
            View My Applications
          </button>
          <button onClick={() => navigate('/tenant/search')}
            className="w-full border border-gray-200 text-gray-600 rounded-xl py-3 font-semibold text-sm">
            Keep Searching
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-6 px-4">
          We'll notify you by email when the landlord responds.
        </p>
      </div>
    )
  }

  const beds = listing?.bedrooms === 0 ? 'Studio' : `${listing?.bedrooms} BR`
  const photo = listing?.photos?.[0]
  const daysLeft = form.voucher_expiration
    ? Math.ceil((new Date(form.voucher_expiration) - new Date()) / (1000 * 60 * 60 * 24))
    : null
  const isLastStep = step === STEPS[STEPS.length - 1].key

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-4 flex items-center gap-3">
        <button onClick={() => step === 'voucher' ? navigate(-1) : prevStep()} className="text-white">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-white text-lg font-bold">Apply</h1>
      </div>

      {/* Progress */}
      <StepBar steps={STEPS} current={step} />

      {/* Listing card */}
      {listing && (
        <div className="mx-4 mt-3 bg-white rounded-xl p-3 flex items-center gap-3">
          {photo
            ? <img src={photo} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
            : <div className="w-14 h-14 rounded-lg bg-gray-100 shrink-0" />
          }
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{listing.neighborhood}</p>
            <p className="text-xs text-gray-500">{beds} · {listing.zip_code}</p>
            <p className="text-sm font-bold text-[#1B3A6B] mt-0.5">${listing.rent_amount?.toLocaleString()}/mo</p>
          </div>
        </div>
      )}

      {/* Already applied warning */}
      {alreadyApplied && (
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">You already applied to this listing</p>
            <p className="text-xs text-amber-700 mt-0.5">Check your applications for the status.</p>
            <button onClick={() => navigate('/tenant/applications')}
              className="mt-2 text-xs font-semibold text-amber-800 underline">View my applications →</button>
          </div>
        </div>
      )}

      <div className="px-4 mt-4 space-y-4">

        {/* ── STEP: VOUCHER ─────────────────────────────────────────────── */}
        {step === 'voucher' && (
          <div className="bg-white rounded-xl p-4 space-y-3">
            <h2 className={sectionHead}>Your Voucher</h2>
            <div>
              <label className={labelClass}>Housing authority that issued your voucher *</label>
              <select name="housing_authority" required value={form.housing_authority} onChange={handleChange} className={inputClass}>
                <option value="">Select housing authority...</option>
                {HOUSING_AUTHORITIES.map(ha => <option key={ha.value} value={ha.value}>{ha.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Voucher bedroom size *</label>
                <select name="voucher_size" required value={form.voucher_size} onChange={handleChange} className={inputClass}>
                  <option value="">Select</option>
                  {[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n === 0 ? 'Studio (0BR)' : `${n} BR`}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Voucher expiration date</label>
                <input name="voucher_expiration" type="date" value={form.voucher_expiration} onChange={handleChange} className={inputClass} />
              </div>
            </div>
            {daysLeft !== null && daysLeft <= 60 && (
              <div className={`rounded-lg px-3 py-2.5 text-xs font-medium ${daysLeft <= 30 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                {daysLeft <= 30
                  ? `⚠ Voucher expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — apply quickly!`
                  : `⏱ ${daysLeft} days remaining on your voucher`}
              </div>
            )}
          </div>
        )}

        {/* ── STEP: HOUSEHOLD ───────────────────────────────────────────── */}
        {step === 'household' && (
          <div className="bg-white rounded-xl p-4 space-y-4">
            <h2 className={sectionHead}>Household Composition</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Number of adults *</label>
                <select value={form.adults_count}
                  onChange={e => syncAdultCount(e.target.value)} className={inputClass}>
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Number of children</label>
                <select name="children_count" value={form.children_count} onChange={handleChange} className={inputClass}>
                  {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {/* Adult names */}
            <div className="space-y-2">
              <label className={labelClass}>Names of all adults on lease</label>
              {(form.adult_names || ['']).map((name, i) => (
                <input key={i} type="text" value={name} placeholder={`Adult ${i + 1} full name`}
                  onChange={e => handleAdultName(i, e.target.value)} className={inputClass} />
              ))}
            </div>

            {parseInt(form.children_count) > 0 && (
              <div>
                <label className={labelClass}>Children's ages (comma-separated)</label>
                <input name="children_ages" type="text" value={form.children_ages} onChange={handleChange}
                  placeholder="e.g. 4, 7, 12" className={inputClass} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Desired move-in date</label>
                <input name="desired_move_in" type="date" value={form.desired_move_in} onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]} className={inputClass} />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: INCOME ──────────────────────────────────────────────── */}
        {step === 'income' && (
          <div className="bg-white rounded-xl p-4 space-y-3">
            <h2 className={sectionHead}>Income & Employment</h2>
            <div>
              <label className={labelClass}>Total monthly household income * </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input name="monthly_income" type="number" min="0" step="1" value={form.monthly_income} onChange={handleChange}
                  placeholder="0" className={`${inputClass} pl-6`} />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Include all household income sources combined.</p>
            </div>
            <div>
              <label className={labelClass}>Primary income source *</label>
              <select name="income_source" value={form.income_source} onChange={handleChange} className={inputClass}>
                <option value="">Select income source...</option>
                {INCOME_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {(form.income_source === 'employment' || form.income_source === 'self_employment') && (
              <>
                <div>
                  <label className={labelClass}>Employer / Business name</label>
                  <input name="employer_name" type="text" value={form.employer_name} onChange={handleChange}
                    placeholder="e.g. Home Depot, Self-employed" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Length of employment</label>
                  <input name="employment_length" type="text" value={form.employment_length} onChange={handleChange}
                    placeholder="e.g. 2 years, 6 months" className={inputClass} />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── STEP: HISTORY ─────────────────────────────────────────────── */}
        {step === 'history' && (
          <div className="bg-white rounded-xl p-4 space-y-3">
            <h2 className={sectionHead}>Rental History</h2>
            <div>
              <label className={labelClass}>Current or most recent address</label>
              <input name="current_address" type="text" value={form.current_address} onChange={handleChange}
                placeholder="123 Main St, Atlanta, GA 30316" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>How long lived there</label>
                <input name="time_at_address" type="text" value={form.time_at_address} onChange={handleChange}
                  placeholder="e.g. 18 months" className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Reason for moving</label>
              <textarea name="move_reason" rows={3} value={form.move_reason} onChange={handleChange}
                placeholder="e.g. Looking for more space, landlord selling property..."
                className={`${inputClass} resize-none`} />
            </div>
            <div>
              <label className={labelClass}>Previous landlord name & phone (optional)</label>
              <input name="prev_landlord_contact" type="text" value={form.prev_landlord_contact} onChange={handleChange}
                placeholder="e.g. John Smith, (404) 555-1234" className={inputClass} />
            </div>
          </div>
        )}

        {/* ── STEP: BACKGROUND ──────────────────────────────────────────── */}
        {step === 'background' && (
          <div className="bg-white rounded-xl p-4 space-y-4">
            <h2 className={sectionHead}>Background Disclosure</h2>
            <div className="bg-blue-50 rounded-lg px-3 py-3 text-xs text-[#1B3A6B] leading-relaxed">
              Georgia law and Fair Chance housing principles require landlords to consider all applicants
              individually. Disclosing a conviction does <strong>not</strong> automatically disqualify you.
              Landlords must evaluate the nature, recency, and relevance of any conviction.
            </div>
            <div>
              <label className="text-sm font-medium text-gray-800 block mb-3">
                Have you been convicted of a felony in the last 7 years? *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[{ val: 'no', label: 'No' }, { val: 'yes', label: "Yes — I'll explain below" }].map(opt => (
                  <button key={opt.val} type="button"
                    onClick={() => setForm(prev => ({ ...prev, has_criminal_history: opt.val }))}
                    className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                      form.has_criminal_history === opt.val
                        ? 'border-[#1B3A6B] bg-[#EEF5FF] text-[#1B3A6B]'
                        : 'border-gray-200 text-gray-600'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {form.has_criminal_history === 'yes' && (
              <div>
                <label className={labelClass}>Brief explanation (optional but recommended)</label>
                <textarea name="criminal_explanation" rows={4} value={form.criminal_explanation} onChange={handleChange}
                  placeholder="Share context about the conviction, rehabilitation, or other relevant information..."
                  className={`${inputClass} resize-none`} maxLength={800} />
                <p className="text-[10px] text-gray-400 mt-1">{form.criminal_explanation.length}/800 characters</p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP: DOCUMENTS ───────────────────────────────────────────── */}
        {step === 'documents' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl p-4">
              <h2 className={sectionHead}>Required Documents</h2>
              <p className="text-xs text-gray-400 mb-4">Upload JPG, PNG, WebP, or PDF. Max 10 MB each.</p>
              <div className="space-y-3">
                <DocUploader
                  label="Government-Issued Photo ID *"
                  hint="Driver's license, passport, or state ID"
                  fieldKey="id_document_url"
                  url={form.id_document_url}
                  onUploaded={handleDocUploaded}
                  userId={user.id}
                />
                <DocUploader
                  label="Voucher Letter from Housing Authority *"
                  hint="Current voucher — must show your name and bedroom size"
                  fieldKey="voucher_document_url"
                  url={form.voucher_document_url}
                  onUploaded={handleDocUploaded}
                  userId={user.id}
                />
                <DocUploader
                  label="Proof of Income *"
                  hint="Pay stubs, benefit award letter, or bank statements (last 2 months)"
                  fieldKey="income_document_url"
                  url={form.income_document_url}
                  onUploaded={handleDocUploaded}
                  userId={user.id}
                />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4">
              <h2 className="font-semibold text-sm text-gray-900 mb-3">Optional Documents</h2>
              <DocUploader
                label="Reference Letter"
                hint="From a previous landlord, employer, or character reference"
                fieldKey="reference_document_url"
                url={form.reference_document_url}
                onUploaded={handleDocUploaded}
                userId={user.id}
              />
            </div>
          </div>
        )}

        {/* ── STEP: INTRO ───────────────────────────────────────────────── */}
        {step === 'intro' && (
          <div className="bg-white rounded-xl p-4 space-y-3">
            <h2 className={sectionHead}>Introduction to Landlord</h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Briefly introduce yourself and explain why you're a great fit for this unit.
              Landlords respond faster to applicants who take a moment to introduce themselves.
            </p>
            <textarea name="message" value={form.message} onChange={handleChange} rows={6}
              maxLength={800}
              placeholder="Hi, I'm [your name]. I'm looking for a [BR] unit for my household of [X]. I've been at my current address for [X years] and work as [job/income source]..."
              className={`${inputClass} resize-none`} />
            <div className="flex justify-end">
              <span className={`text-xs ${form.message.length >= 750 ? 'text-amber-500 font-medium' : 'text-gray-400'}`}>
                {form.message.length}/800
              </span>
            </div>

            {/* Fee breakdown */}
            {(() => {
              const appFee = listing?.application_fee ?? 0
              const serviceFee = appFee > 0 ? 5 : 0
              const stripeFee = appFee > 0 ? Math.round((appFee + serviceFee) * 0.029 + 0.30) : 0
              const total = appFee + serviceFee + stripeFee
              return (
                <div className="border border-gray-200 rounded-xl overflow-hidden mt-2">
                  <div className="bg-[#1B3A6B] px-3 py-2">
                    <p className="text-xs font-semibold text-white">Fee Summary</p>
                  </div>
                  <div className="px-3 py-3 space-y-2 bg-white">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Application Fee</span>
                      <span className="font-medium text-gray-800">{appFee > 0 ? `$${appFee.toFixed(2)}` : 'Free'}</span>
                    </div>
                    {serviceFee > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Service Fee <span className="text-gray-400">(Settleed)</span></span>
                        <span className="font-medium text-gray-800">${serviceFee.toFixed(2)}</span>
                      </div>
                    )}
                    {stripeFee > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Processing Fee <span className="text-gray-400">(Stripe · card est.)</span></span>
                        <span className="font-medium text-gray-800">~${stripeFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-100 pt-2 flex justify-between text-xs font-semibold">
                      <span className="text-gray-900">Total due today</span>
                      <span className="text-[#1B3A6B]">{total > 0 ? `$${total.toFixed(2)}` : '$0.00 — Free to apply'}</span>
                    </div>
                    {appFee > 0 && (
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        💡 Pay by bank transfer (ACH) to lower the processing fee to ~$0.80. Settleed never keeps the application fee — it goes to the landlord minus our $5.00 service fee.
                      </p>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Summary before submit */}
            <div className="border border-gray-100 rounded-xl p-3 mt-2 space-y-1.5 bg-gray-50">
              <p className="text-xs font-semibold text-gray-600 mb-2">Application Summary</p>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Housing authority</span><span className="font-medium text-gray-800">{form.housing_authority}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Voucher size</span><span className="font-medium text-gray-800">{form.voucher_size === '0' ? 'Studio' : `${form.voucher_size} BR`}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Household</span><span className="font-medium text-gray-800">{(parseInt(form.adults_count)||1) + (parseInt(form.children_count)||0)} people</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Monthly income</span><span className="font-medium text-gray-800">${Number(form.monthly_income||0).toLocaleString()}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">ID</span><span className={form.id_document_url ? 'text-[#1D9E75] font-medium' : 'text-red-500 font-medium'}>{form.id_document_url ? '✓ Uploaded' : 'Missing'}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Voucher letter</span><span className={form.voucher_document_url ? 'text-[#1D9E75] font-medium' : 'text-red-500 font-medium'}>{form.voucher_document_url ? '✓ Uploaded' : 'Missing'}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Income docs</span><span className={form.income_document_url ? 'text-[#1D9E75] font-medium' : 'text-red-500 font-medium'}>{form.income_document_url ? '✓ Uploaded' : 'Missing'}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 safe-area-bottom">
        {alreadyApplied ? (
          <button disabled className="w-full bg-gray-200 text-gray-500 rounded-xl py-4 font-semibold text-sm">Already Applied</button>
        ) : isLastStep ? (
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full bg-[#1D9E75] text-white rounded-xl py-4 font-semibold text-sm disabled:opacity-50 shadow-lg shadow-[#1D9E75]/20">
            {submitting ? 'Submitting…' : 'Submit Application'}
          </button>
        ) : (
          <button onClick={nextStep}
            className="w-full bg-[#1B3A6B] text-white rounded-xl py-4 font-semibold text-sm flex items-center justify-center gap-2">
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
