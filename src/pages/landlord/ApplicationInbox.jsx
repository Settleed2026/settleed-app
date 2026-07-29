import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import BottomNav from '../../components/BottomNav'
import toast from 'react-hot-toast'
import {
  User, Home, Calendar, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Key, Clock, FileText,
  Upload, PenLine, ChevronRight, ChevronLeft,
} from 'lucide-react'

// ─── helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'bg-amber-100 text-amber-700' },
  reviewing: { label: 'Reviewing', color: 'bg-blue-100 text-blue-700' },
  approved:  { label: 'Approved',  color: 'bg-green-100 text-green-700' },
  rejected:  { label: 'Declined',  color: 'bg-red-100 text-red-700' },
  withdrawn: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-500' },
}

const UTILITIES = ['Water', 'Gas', 'Electricity', 'Trash / Recycling', 'Internet', 'Cable']

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]'
const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

// ─── LeaseBuilderModal ─────────────────────────────────────────────────────────
function LeaseBuilderModal({ application, property, onClose, onSuccess }) {
  const { user } = useAuth()
  const [leaseType, setLeaseType] = useState('digital')
  const [step, setStep] = useState(1)   // 1 = details, 2 = sign & send
  const [loading, setLoading] = useState(false)
  const [pdfFile, setPdfFile] = useState(null)

  const today   = new Date().toISOString().split('T')[0]
  const oneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [form, setForm] = useState({
    lease_start_date:     today,
    lease_end_date:       oneYear,
    rent_amount:          property?.rent_amount?.toString() || '',
    ha_portion:           '',
    tenant_portion:       '',
    security_deposit:     property?.deposit_amount?.toString() || '',
    late_fee_amount:      '75',
    late_fee_grace_days:  '5',
    utilities_included:   [],
    pets_allowed:         false,
    pet_deposit:          '',
    parking_included:     false,
    parking_spaces:       '1',
    additional_terms:     '',
    special_provisions:   '',
    hap_contract_number:  '',
    recertification_date: '',
    // sign step
    landlord_signature_name: '',
    agreed: false,
  })

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(prev => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : value }
      if (name === 'ha_portion' || name === 'rent_amount') {
        const rent = parseFloat(name === 'rent_amount' ? value : next.rent_amount) || 0
        const ha   = parseFloat(name === 'ha_portion'  ? value : next.ha_portion)  || 0
        next.tenant_portion = rent > ha ? (rent - ha).toFixed(2) : '0.00'
      }
      return next
    })
  }

  function toggleUtility(util) {
    setForm(prev => ({
      ...prev,
      utilities_included: prev.utilities_included.includes(util)
        ? prev.utilities_included.filter(u => u !== util)
        : [...prev.utilities_included, util],
    }))
  }

  function validateStep1() {
    if (!form.lease_start_date) { toast.error('Lease start date is required.'); return false }
    if (!form.rent_amount)      { toast.error('Rent amount is required.'); return false }
    if (leaseType === 'uploaded' && !pdfFile) {
      toast.error('Please select a PDF file to upload.'); return false
    }
    return true
  }

  async function handleSubmit() {
    if (!form.landlord_signature_name.trim()) {
      toast.error('Please type your name to sign.'); return
    }
    if (!form.agreed) {
      toast.error('Please check the agreement box.'); return
    }

    setLoading(true)
    try {
      let document_path = null
      let document_url  = null

      // Upload PDF if needed
      if (leaseType === 'uploaded' && pdfFile) {
        const fileName = `${user.id}/${Date.now()}_${pdfFile.name.replace(/\s+/g, '_')}`
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('lease-documents')
          .upload(fileName, pdfFile, { contentType: 'application/pdf', upsert: false })
        if (uploadErr) throw new Error('PDF upload failed: ' + uploadErr.message)
        document_path = uploadData.path
        const { data: urlData } = await supabase.storage
          .from('lease-documents')
          .createSignedUrl(document_path, 60 * 60 * 24 * 365) // 1 year
        document_url = urlData?.signedUrl || null
      }

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/activate-lease', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          application_id:       application.id,
          lease_type:           leaseType,
          document_path,
          document_url,
          ...form,
          utilities_included:   form.utilities_included,
          pets_allowed:         form.pets_allowed,
          parking_included:     form.parking_included,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create lease.')
      toast.success('Lease sent to tenant for signature!')
      onSuccess()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const dollar = v => v ? `$${parseFloat(v).toLocaleString()}` : '—'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create Lease Agreement</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {application.tenant_name} · {property?.neighborhood}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-light leading-none">✕</button>
        </div>

        {/* Step indicator */}
        <div className="flex px-5 pt-3 pb-1 gap-2 shrink-0">
          {['Lease Details', 'Sign & Send'].map((label, i) => (
            <div key={i} className={`flex-1 text-center text-[11px] font-semibold py-1.5 rounded-full transition-colors ${
              step === i + 1 ? 'bg-[#1B3A6B] text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              {i + 1}. {label}
            </div>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {step === 1 && (
            <>
              {/* Lease type toggle */}
              <div>
                <p className={labelClass}>Lease type</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'digital', icon: PenLine, label: 'Digital Lease', sub: 'GA template, filled here' },
                    { value: 'uploaded', icon: Upload, label: 'Upload My Lease', sub: 'PDF from your files' },
                  ].map(({ value, icon: Icon, label, sub }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLeaseType(value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                        leaseType === value
                          ? 'border-[#1B3A6B] bg-[#EEF5FF]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${leaseType === value ? 'text-[#1B3A6B]' : 'text-gray-400'}`} />
                      <span className={`text-xs font-semibold ${leaseType === value ? 'text-[#1B3A6B]' : 'text-gray-700'}`}>{label}</span>
                      <span className="text-[10px] text-gray-400">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload PDF (uploaded only) */}
              {leaseType === 'uploaded' && (
                <div>
                  <label className={labelClass}>Upload lease PDF *</label>
                  <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors ${
                    pdfFile ? 'border-[#1D9E75] bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <Upload className={`w-5 h-5 shrink-0 ${pdfFile ? 'text-[#1D9E75]' : 'text-gray-400'}`} />
                    <div className="min-w-0">
                      {pdfFile
                        ? <><p className="text-sm font-medium text-green-700 truncate">{pdfFile.name}</p>
                            <p className="text-xs text-green-600">{(pdfFile.size / 1024).toFixed(0)} KB</p></>
                        : <><p className="text-sm text-gray-600">Click to choose a PDF</p>
                            <p className="text-xs text-gray-400">Max 10 MB</p></>
                      }
                    </div>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f && f.size > 10 * 1024 * 1024) { toast.error('File must be under 10 MB.'); return }
                        setPdfFile(f || null)
                      }}
                    />
                  </label>
                </div>
              )}

              {/* Lease term */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Lease Term</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Start date *</label>
                    <input name="lease_start_date" type="date" required value={form.lease_start_date}
                      onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>End date</label>
                    <input name="lease_end_date" type="date" value={form.lease_end_date}
                      onChange={handleChange} className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Rent */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rent</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Total monthly rent *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input name="rent_amount" type="number" step="0.01" required value={form.rent_amount}
                        onChange={handleChange} className={`${inputClass} pl-6`} placeholder="1200.00" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>HA pays (HAP)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input name="ha_portion" type="number" step="0.01" value={form.ha_portion}
                          onChange={handleChange} className={`${inputClass} pl-6`} placeholder="900.00" />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Tenant pays</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input name="tenant_portion" type="number" step="0.01" value={form.tenant_portion}
                          onChange={handleChange} className={`${inputClass} pl-6`} placeholder="300.00" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Security deposit</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input name="security_deposit" type="number" step="0.01" value={form.security_deposit}
                          onChange={handleChange} className={`${inputClass} pl-6`} placeholder="1200.00" />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Late fee</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input name="late_fee_amount" type="number" step="0.01" value={form.late_fee_amount}
                          onChange={handleChange} className={`${inputClass} pl-6`} placeholder="75.00" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Late fee grace period (days after 1st)</label>
                    <input name="late_fee_grace_days" type="number" min="1" max="30" value={form.late_fee_grace_days}
                      onChange={handleChange} className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Digital-only fields */}
              {leaseType === 'digital' && (
                <>
                  {/* Utilities */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Utilities Included in Rent</p>
                    <div className="grid grid-cols-2 gap-2">
                      {UTILITIES.map(util => (
                        <label key={util} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs font-medium transition-colors ${
                          form.utilities_included.includes(util)
                            ? 'border-[#1B3A6B] bg-[#EEF5FF] text-[#1B3A6B]'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}>
                          <input type="checkbox" className="hidden"
                            checked={form.utilities_included.includes(util)}
                            onChange={() => toggleUtility(util)} />
                          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                            form.utilities_included.includes(util) ? 'bg-[#1B3A6B] border-[#1B3A6B]' : 'border-gray-300'
                          }`}>
                            {form.utilities_included.includes(util) && (
                              <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 fill-white"><path d="M1.5 5l2.5 2.5L8.5 2"/></svg>
                            )}
                          </span>
                          {util}
                        </label>
                      ))}
                    </div>
                    {form.utilities_included.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1">None checked = tenant pays all utilities</p>
                    )}
                  </div>

                  {/* Parking */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Parking</p>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input type="checkbox" name="parking_included" className="w-4 h-4 rounded accent-[#1B3A6B]"
                        checked={form.parking_included} onChange={handleChange} />
                      <span className="text-sm text-gray-700">Parking included</span>
                    </label>
                    {form.parking_included && (
                      <div>
                        <label className={labelClass}>Number of spaces</label>
                        <input name="parking_spaces" type="number" min="1" max="10" value={form.parking_spaces}
                          onChange={handleChange} className={inputClass} />
                      </div>
                    )}
                  </div>

                  {/* Pets */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pets</p>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input type="checkbox" name="pets_allowed" className="w-4 h-4 rounded accent-[#1B3A6B]"
                        checked={form.pets_allowed} onChange={handleChange} />
                      <span className="text-sm text-gray-700">Pets allowed</span>
                    </label>
                    {form.pets_allowed && (
                      <div>
                        <label className={labelClass}>Pet deposit</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                          <input name="pet_deposit" type="number" step="0.01" value={form.pet_deposit}
                            onChange={handleChange} className={`${inputClass} pl-6`} placeholder="300.00" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional terms */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Additional Terms</p>
                    <div>
                      <label className={labelClass}>Lease rules or restrictions <span className="text-gray-400 font-normal">(optional)</span></label>
                      <textarea name="additional_terms" value={form.additional_terms} onChange={handleChange}
                        rows={3} placeholder="e.g. No smoking on premises. Quiet hours 10pm–8am."
                        className={`${inputClass} resize-none`} />
                    </div>
                    <div className="mt-3">
                      <label className={labelClass}>Special provisions <span className="text-gray-400 font-normal">(optional)</span></label>
                      <textarea name="special_provisions" value={form.special_provisions} onChange={handleChange}
                        rows={3} placeholder="e.g. Landlord will replace HVAC filter every 90 days."
                        className={`${inputClass} resize-none`} />
                    </div>
                  </div>
                </>
              )}

              {/* Section 8 */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Section 8 / HAP</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>HAP contract # <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input name="hap_contract_number" type="text" value={form.hap_contract_number}
                      onChange={handleChange} className={inputClass} placeholder="AHA-2024-XXXXX" />
                  </div>
                  <div>
                    <label className={labelClass}>Recertification date <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input name="recertification_date" type="date" value={form.recertification_date}
                      onChange={handleChange} className={inputClass} />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Settleed will remind both parties at 90, 60, and 30 days out.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {/* Summary card */}
              <div className="bg-[#EEF5FF] rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-[#1B3A6B] uppercase tracking-wide">Lease Summary</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium text-gray-800 capitalize">{leaseType === 'digital' ? 'Digital (GA Template)' : 'Uploaded PDF'}</span>
                  <span className="text-gray-500">Term</span>
                  <span className="font-medium text-gray-800">{form.lease_start_date} → {form.lease_end_date || 'MTM'}</span>
                  <span className="text-gray-500">Total rent</span>
                  <span className="font-medium text-gray-800">{dollar(form.rent_amount)}/mo</span>
                  {form.ha_portion && <><span className="text-gray-500">HA pays</span><span className="font-medium text-[#1D9E75]">{dollar(form.ha_portion)}</span></>}
                  {form.tenant_portion && <><span className="text-gray-500">Tenant pays</span><span className="font-medium text-gray-800">{dollar(form.tenant_portion)}</span></>}
                  {form.security_deposit && <><span className="text-gray-500">Security dep.</span><span className="font-medium text-gray-800">{dollar(form.security_deposit)}</span></>}
                  {form.utilities_included.length > 0 && (
                    <><span className="text-gray-500">Utilities incl.</span><span className="font-medium text-gray-800">{form.utilities_included.join(', ')}</span></>
                  )}
                  <span className="text-gray-500">Pets</span>
                  <span className="font-medium text-gray-800">{form.pets_allowed ? `Yes${form.pet_deposit ? ` (${dollar(form.pet_deposit)} deposit)` : ''}` : 'No'}</span>
                  {leaseType === 'uploaded' && pdfFile && (
                    <><span className="text-gray-500">Document</span><span className="font-medium text-gray-800 truncate">{pdfFile.name}</span></>
                  )}
                </div>
              </div>

              {/* What happens next */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-800 font-medium leading-relaxed">
                  After you sign, this lease will appear in the tenant's account for their signature.
                  The unit is marked as Rented once both parties have signed.
                </p>
              </div>

              {/* Disclaimer */}
              <p className="text-[10px] text-gray-400 leading-relaxed">
                This lease was generated using Settleed's template. Both parties are advised to consult
                a licensed Georgia real estate attorney before signing.
              </p>

              {/* Landlord signature block */}
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <PenLine className="w-3.5 h-3.5" /> Landlord signature
                </p>
                <div>
                  <label className={labelClass}>Type your full legal name *</label>
                  <input
                    name="landlord_signature_name"
                    type="text"
                    value={form.landlord_signature_name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className={`${inputClass} font-medium italic`}
                  />
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" name="agreed" className="w-4 h-4 rounded accent-[#1B3A6B] mt-0.5 shrink-0"
                    checked={form.agreed} onChange={handleChange} />
                  <span className="text-xs text-gray-600 leading-relaxed">
                    By checking this box, I agree that typing my name above constitutes my legal electronic
                    signature on this lease agreement.
                  </span>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex gap-3">
          {step === 1 ? (
            <>
              <button type="button" onClick={onClose}
                className="flex-1 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { if (validateStep1()) setStep(2) }}
                className="flex-1 bg-[#1B3A6B] text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-1.5 hover:opacity-90"
              >
                Review & Sign <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setStep(1)}
                className="flex items-center gap-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-[#1D9E75] text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-50"
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><PenLine className="w-4 h-4" /> Sign &amp; Send to Tenant</>
                }
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ApplicationCard ───────────────────────────────────────────────────────────
function ApplicationCard({ app, onStatusChange, onCreateLease }) {
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)
  const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending

  async function updateStatus(newStatus) {
    setUpdating(true)
    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', app.id)
    if (error) {
      toast.error('Failed to update status.')
    } else {
      toast.success(newStatus === 'approved' ? 'Application approved.' : 'Application declined.')
      onStatusChange(app.id, newStatus)
      const tenantId = app.tenant?.id
      if (tenantId && (newStatus === 'approved' || newStatus === 'rejected')) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({
              type: 'application_status',
              payload: { tenant_id: tenantId, property_address: app.property_address, new_status: newStatus, landlord_note: null },
            }),
          }).catch(() => {})
        }).catch(() => {})
      }
    }
    setUpdating(false)
  }

  const moveIn = app.desired_move_in
    ? new Date(app.desired_move_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  const leaseLabel =
    app.lease_status === 'pending_tenant_signature' ? 'Awaiting Tenant Signature' :
    app.lease_status === 'active'                   ? 'Lease Active'              : null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#EEF5FF] flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-[#1B3A6B]" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{app.tenant_name}</p>
              <p className="text-xs text-gray-500 truncate">{app.property_address}</p>
            </div>
          </div>
          <span className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {app.housing_authority && (
            <span className="text-[11px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full border border-gray-100">{app.housing_authority}</span>
          )}
          {app.voucher_size != null && (
            <span className="text-[11px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full border border-gray-100">
              {app.voucher_size === 0 ? 'Studio' : `${app.voucher_size} BR`} voucher
            </span>
          )}
          {app.household_size && (
            <span className="text-[11px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full border border-gray-100">{app.household_size} in household</span>
          )}
          {moveIn && (
            <span className="text-[11px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full border border-gray-100 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {moveIn}
            </span>
          )}
        </div>

        <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Applied {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {app.message && (
        <div className="border-t border-gray-50">
          <button onClick={() => setExpanded(p => !p)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-gray-500 hover:bg-gray-50 transition-colors">
            <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Message from applicant</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {expanded && (
            <div className="px-4 pb-3">
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">{app.message}</p>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {(app.status === 'pending' || app.status === 'reviewing') && (
        <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
          <button onClick={() => updateStatus('rejected')} disabled={updating}
            className="flex-1 flex items-center justify-center gap-1.5 border border-red-200 text-red-600 rounded-lg py-2 text-xs font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors">
            <XCircle className="w-3.5 h-3.5" /> Decline
          </button>
          <button onClick={() => updateStatus('approved')} disabled={updating}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#1D9E75] text-white rounded-lg py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-colors">
            <CheckCircle className="w-3.5 h-3.5" /> Approve
          </button>
        </div>
      )}

      {app.status === 'approved' && !app.lease_status && (
        <div className="border-t border-gray-100 px-4 py-3">
          <button onClick={() => onCreateLease(app)}
            className="w-full flex items-center justify-center gap-2 bg-[#1B3A6B] text-white rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-colors">
            <FileText className="w-4 h-4" /> Create Lease Agreement
          </button>
          <p className="text-[10px] text-gray-400 text-center mt-1.5">
            Digital or upload your own PDF — tenant signs in the app
          </p>
        </div>
      )}

      {leaseLabel && (
        <div className={`border-t border-gray-100 px-4 py-3 flex items-center justify-center gap-2 text-xs font-semibold ${
          app.lease_status === 'active' ? 'text-[#1D9E75]' : 'text-amber-600'
        }`}>
          {app.lease_status === 'active'
            ? <><CheckCircle className="w-4 h-4" /> Lease Active</>
            : <><Clock className="w-4 h-4" /> Awaiting Tenant Signature</>
          }
        </div>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ApplicationInbox() {
  const { user } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [leaseModal, setLeaseModal] = useState(null)

  const fetchApplications = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('applications')
      .select(`
        id, status, message, desired_move_in, household_size,
        housing_authority, voucher_size, created_at,
        property:property_id(id, neighborhood, street_address, unit_number, rent_amount, deposit_amount),
        tenant:tenant_id(id, full_name, email)
      `)
      .eq('landlord_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load applications.')
    } else {
      // For each approved application, check if a lease exists
      const appData = data || []
      let leaseMap = {}
      const approvedIds = appData.filter(a => a.status === 'approved').map(a => a.tenant?.id).filter(Boolean)
      if (approvedIds.length > 0) {
        const propIds = appData.filter(a => a.status === 'approved').map(a => a.property?.id).filter(Boolean)
        const { data: leases } = await supabase
          .from('leases')
          .select('id, status, tenant_id, property_id')
          .in('tenant_id', approvedIds)
          .in('property_id', propIds)
          .in('status', ['pending_tenant_signature', 'active'])
        ;(leases || []).forEach(l => { leaseMap[`${l.property_id}_${l.tenant_id}`] = l.status })
      }

      setApplications(appData.map(app => {
        const key = `${app.property?.id}_${app.tenant?.id}`
        return {
          ...app,
          tenant_name:     app.tenant?.full_name || app.tenant?.email || 'Applicant',
          property_address: app.property
            ? `${app.property.neighborhood}${app.property.street_address ? ` · ${app.property.street_address}` : ''}`
            : 'Unknown property',
          lease_status: leaseMap[key] || null,
        }
      }))
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetchApplications() }, [fetchApplications])

  function handleStatusChange(appId, newStatus) {
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a))
  }

  const filtered = filter === 'all' ? applications
    : filter === 'pending' ? applications.filter(a => a.status === 'pending' || a.status === 'reviewing')
    : applications.filter(a => a.status === filter)

  const counts = {
    all:      applications.length,
    pending:  applications.filter(a => a.status === 'pending' || a.status === 'reviewing').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-5">
        <h1 className="text-white text-lg font-bold">Applications</h1>
        <p className="text-blue-200 text-xs mt-0.5">
          {counts.pending > 0
            ? `${counts.pending} application${counts.pending === 1 ? '' : 's'} need your review`
            : 'All caught up'}
        </p>
      </div>

      <div className="bg-white border-b border-gray-100 px-4 flex gap-1 overflow-x-auto">
        {[
          { key: 'all',      label: 'All' },
          { key: 'pending',  label: 'To Review' },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Declined' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`shrink-0 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              filter === tab.key ? 'border-[#1B3A6B] text-[#1B3A6B]' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                filter === tab.key ? 'bg-[#1B3A6B] text-white' : 'bg-gray-100 text-gray-500'
              }`}>{counts[tab.key]}</span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                    <div className="h-3 bg-gray-200 rounded w-48" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Home className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium text-sm">No applications here</p>
            <p className="text-gray-400 text-xs mt-1">
              {filter === 'all'
                ? 'Applications appear here when tenants apply to your listings.'
                : `No ${filter} applications yet.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(app => (
              <ApplicationCard
                key={app.id}
                app={app}
                onStatusChange={handleStatusChange}
                onCreateLease={application => setLeaseModal({ application, property: application.property })}
              />
            ))}
          </div>
        )}
      </div>

      {leaseModal && (
        <LeaseBuilderModal
          application={leaseModal.application}
          property={leaseModal.property}
          onClose={() => setLeaseModal(null)}
          onSuccess={() => { setLeaseModal(null); fetchApplications() }}
        />
      )}

      <BottomNav role="landlord" />
    </div>
  )
}
