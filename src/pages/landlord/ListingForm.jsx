import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { checkRentEligibility } from '../../lib/paymentStandards'
import toast from 'react-hot-toast'
import { ChevronLeft, Upload, X, Check, Home, Zap } from 'lucide-react'

const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const TOTAL_STEPS = 9

const PROPERTY_TYPES = [
  'Single Family Home','Apartment','Duplex','Triplex',
  'Townhome','Condo','Manufactured Home','Other',
]
const UTILITY_LIST  = ['Water','Sewer','Trash','Electric','Gas','Internet']
const APPLIANCE_LIST = [
  'Refrigerator','Stove','Oven','Microwave','Dishwasher',
  'Washer','Dryer','Washer/Dryer Hookups','Garbage Disposal',
]
const AMENITY_LIST = [
  'Central Air','Heating','Ceiling Fans','Hardwood Floors','Carpet',
  'Walk-in Closet','Balcony','Patio','Fenced Yard','Garage',
  'Driveway Parking','Street Parking','Community Pool','Fitness Center',
  'Playground','Gated Community','Storage Unit',
]
const ACCESSIBILITY_LIST = [
  'Wheelchair Accessible','No-Step Entry','Grab Bars','Wider Doorways',
]
const VOUCHER_SIZES = ['Studio','1BR','2BR','3BR','4BR+']
const NEARBY_LIST   = ['Schools','Grocery Stores','Bus Stop','MARTA Station','Hospitals','Parks']

const STEP_LABELS = [
  'Location','Unit Details','Monthly Costs',
  'Utilities & Appliances','Amenities & Pets',
  'HCV & Requirements','Description & Media',
  'Availability & Contact','Documents & Agreement',
]

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]'
const labelClass = 'text-xs text-gray-500 mb-1 block'
const sectionClass = 'bg-white rounded-xl p-4 space-y-3'
const sectionHead  = 'font-semibold text-sm text-gray-900'

function CheckPill({ label, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
        checked ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200'
      }`}
    >
      {label}
    </button>
  )
}

function Toggle({ label, sublabel, checked, onChange }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div
        onClick={onChange}
        className={`mt-0.5 w-10 h-6 rounded-full transition-colors flex items-center shrink-0 ${
          checked ? 'bg-[#1D9E75]' : 'bg-gray-200'
        }`}
      >
        <span className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
      <div>
        <div className="text-sm text-gray-900 font-medium">{label}</div>
        {sublabel && <div className="text-xs text-gray-400">{sublabel}</div>}
      </div>
    </label>
  )
}

export default function ListingForm() {
  const { user } = useAuth()
  const [subscriptionStatus, setSubscriptionStatus] = useState(null)
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [step, setStep]     = useState(1)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [listingId, setListingId] = useState(id || null)

  const emptyForm = {
    // Step 1 — Location
    street_address: '', unit_number: '', city: 'Atlanta', state: 'GA',
    zip_code: '', neighborhood: '', property_type: '',
    // Step 2 — Unit details
    bedrooms: '', bathrooms: '', square_feet: '', floor_level: '',
    year_built: '', available_date: '',
    // Step 3 — Costs
    rent_amount: '', deposit_amount: '', application_fee: '',
    pet_deposit: '', monthly_pet_rent: '', holding_fee: '', move_in_fee: '',
    // Step 4 — Utilities & appliances
    utilities: { Water:'tenant', Sewer:'tenant', Trash:'landlord', Electric:'tenant', Gas:'tenant', Internet:'tenant' },
    appliances: [],
    // Step 5 — Amenities & pets
    amenities: [], accessibility: [],
    pets_allowed: false, pet_types: [], breed_restrictions: '', weight_limit: '',
    // Step 6 — HCV & requirements
    hcv_accepted: true, voucher_sizes_accepted: [],
    ha_accepted: ['AHA','DCA','other'],
    previously_inspected: false, currently_occupied: false, move_in_ready: true,
    min_credit_score: '', income_requirement: '',
    criminal_background_policy: 'standard',
    eviction_policy: 'case-by-case',
    rental_history_required: false, cosigner_accepted: false,
    smoking_allowed: false, credit_friendly: false,
    // Step 7 — Description & media
    description: '', photos: [], video_url: '', move_in_special: '',
    // Step 8 — Availability & contact
    contact_preferences: ['email'],
    lease_type: 'fixed', min_lease_months: 12, month_to_month: false,
    nearby_attractions: [],
    // Step 9 — Documents & agreement
    documents: [],
    agree_accurate: false, agree_terms: false,
    agree_publish: false, agree_no_false_info: false,
    // Meta
    status: 'draft',
  }

  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (isEditing) fetchListing()
  }, [id])

  useEffect(() => {
    if (!user?.id) return
    supabase.from('profiles').select('subscription_status').eq('id', user.id).single()
      .then(({ data }) => setSubscriptionStatus(data?.subscription_status ?? 'inactive'))
  }, [user?.id])

  async function fetchListing() {
    const { data, error } = await supabase.from('properties').select('*').eq('id', id).single()
    if (error) { console.error('ListingForm fetch error:', error.message); return }
    if (data) setForm(prev => ({ ...prev, ...data,
      utilities: data.utilities || prev.utilities,
      appliances: data.appliances || [],
      amenities: data.amenities || [],
      pet_types: data.pet_types || [],
      voucher_sizes_accepted: data.voucher_sizes_accepted || [],
      ha_accepted: data.ha_accepted || ['AHA','DCA','other'],
      contact_preferences: data.contact_preferences || ['email'],
      nearby_attractions: data.nearby_attractions || [],
      documents: data.documents || [],
      photos: data.photos || [],
    }))
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  function toggleArr(field, val) {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(val)
        ? prev[field].filter(v => v !== val)
        : [...prev[field], val],
    }))
  }

  function setUtility(util, who) {
    setForm(prev => ({ ...prev, utilities: { ...prev.utilities, [util]: who } }))
  }

  // ── Photo upload ──
  async function uploadPhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('upload_preset', 'settleed_listings')
    try {
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method:'POST', body:fd })
      const data = await res.json()
      if (data.secure_url) setForm(prev => ({ ...prev, photos: [...prev.photos, data.secure_url] }))
    } catch { toast.error('Photo upload failed') }
    setUploading(false)
  }

  function removePhoto(url) {
    setForm(prev => ({ ...prev, photos: prev.photos.filter(p => p !== url) }))
  }

  // ── Save to Supabase ──
  async function save(status = 'draft') {
    setSaving(true)
    const payload = {
      ...form,
      status,
      landlord_id: user.id,
      market: 'atlanta',
      bedrooms: form.bedrooms !== '' ? parseInt(form.bedrooms) : null,
      bathrooms: form.bathrooms !== '' ? parseFloat(form.bathrooms) : null,
      square_feet: form.square_feet ? parseInt(form.square_feet) : null,
      year_built: form.year_built ? parseInt(form.year_built) : null,
      rent_amount: form.rent_amount ? parseFloat(form.rent_amount) : null,
      deposit_amount: form.deposit_amount ? parseFloat(form.deposit_amount) : null,
      application_fee: form.application_fee ? parseFloat(form.application_fee) : null,
      pet_deposit: form.pet_deposit ? parseFloat(form.pet_deposit) : null,
      monthly_pet_rent: form.monthly_pet_rent ? parseFloat(form.monthly_pet_rent) : null,
      holding_fee: form.holding_fee ? parseFloat(form.holding_fee) : null,
      move_in_fee: form.move_in_fee ? parseFloat(form.move_in_fee) : null,
      min_lease_months: form.min_lease_months ? parseInt(form.min_lease_months) : null,
      // Remove agreement fields — not stored in DB
      agree_accurate: undefined, agree_terms: undefined,
      agree_publish: undefined, agree_no_false_info: undefined,
    }
    delete payload.agree_accurate
    delete payload.agree_terms
    delete payload.agree_publish
    delete payload.agree_no_false_info

    let error
    if (listingId) {
      ;({ error } = await supabase.from('properties').update(payload).eq('id', listingId))
    } else {
      const { data, error: e } = await supabase.from('properties').insert(payload).select('id').single()
      error = e
      if (data) setListingId(data.id)
    }

    if (error) console.error('Listing save error:', error.message, error.details, error.hint)
    setSaving(false)
    return !error
  }

  async function handleSaveDraft() {
    const ok = await save('draft')
    if (ok) { toast.success('Draft saved — you can return anytime.'); navigate('/landlord') }
    else      toast.error('Could not save draft')
  }

  async function handleNext() {
    await save('draft') // auto-save progress
    setStep(s => s + 1)
    window.scrollTo(0, 0)
  }

  async function handlePublish() {
    if (!form.agree_accurate || !form.agree_terms || !form.agree_publish || !form.agree_no_false_info) {
      toast.error('Please check all agreement boxes before publishing.')
      return
    }
    const ok = await save('active')
    if (ok) { toast.success('Listing published! 🎉'); navigate('/landlord') }
    else      toast.error('Could not publish listing')
  }

  // ── Render helpers ──
  const ps = form.zip_code?.length === 5 && form.bedrooms !== '' && form.rent_amount
    ? checkRentEligibility(form.zip_code, parseInt(form.bedrooms), parseFloat(form.rent_amount))
    : null

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => step > 1 ? setStep(s => s-1) : navigate(-1)} className="text-white">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-white text-base font-bold">{isEditing ? 'Edit listing' : 'New listing'}</h1>
          <p className="text-blue-200 text-xs">Step {step} of {TOTAL_STEPS}: {STEP_LABELS[step-1]}</p>
        </div>
        <button onClick={handleSaveDraft} disabled={saving}
          className="text-blue-200 text-xs border border-blue-300 px-3 py-1.5 rounded-lg">
          Save draft
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-blue-900">
        <div className="h-1 bg-[#1D9E75] transition-all" style={{ width: `${(step/TOTAL_STEPS)*100}%` }} />
      </div>

      {/* Step pills */}
      <div className="flex overflow-x-auto gap-1 px-4 py-2 bg-[#1B3A6B] pb-3 scrollbar-hide">
        {STEP_LABELS.map((label, i) => (
          <button key={i}
            onClick={() => i+1 < step ? setStep(i+1) : null}
            className={`shrink-0 text-xs px-2.5 py-1 rounded-full transition-colors ${
              i+1 === step ? 'bg-[#1D9E75] text-white' :
              i+1 < step   ? 'bg-blue-700 text-blue-100 cursor-pointer' :
              'bg-blue-900 text-blue-400'
            }`}
          >
            {i+1 < step ? '✓ ' : ''}{label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* ────── STEP 1: LOCATION ────── */}
        {step === 1 && (
          <>
            <div className={sectionClass}>
              <h2 className={sectionHead}>Property Address</h2>
              <div>
                <label className={labelClass}>Street address *</label>
                <input name="street_address" required value={form.street_address} onChange={handleChange}
                  placeholder="123 Peachtree St NE" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Unit / Apt #</label>
                  <input name="unit_number" value={form.unit_number} onChange={handleChange}
                    placeholder="Apt 4B" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>ZIP code *</label>
                  <input name="zip_code" required value={form.zip_code} onChange={handleChange}
                    placeholder="30316" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>City *</label>
                  <input name="city" required value={form.city} onChange={handleChange}
                    placeholder="Atlanta" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>State *</label>
                  <input name="state" required value={form.state} onChange={handleChange}
                    placeholder="GA" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Neighborhood / Area name (shown to tenants)</label>
                <input name="neighborhood" value={form.neighborhood} onChange={handleChange}
                  placeholder="East Atlanta, Kirkwood, Decatur…" className={inputClass} />
              </div>
            </div>

            <div className={sectionClass}>
              <h2 className={sectionHead}>Property Type *</h2>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPES.map(t => (
                  <CheckPill key={t} label={t} checked={form.property_type === t}
                    onToggle={() => setForm(prev => ({ ...prev, property_type: t }))} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* ────── STEP 2: UNIT DETAILS ────── */}
        {step === 2 && (
          <div className={sectionClass}>
            <h2 className={sectionHead}>Unit Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Bedrooms *</label>
                <select name="bedrooms" required value={form.bedrooms} onChange={handleChange}
                  className={`${inputClass} bg-white`}>
                  <option value="">Select</option>
                  {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n === 0 ? 'Studio' : `${n} BR`}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Bathrooms *</label>
                <select name="bathrooms" required value={form.bathrooms} onChange={handleChange}
                  className={`${inputClass} bg-white`}>
                  <option value="">Select</option>
                  {[1,1.5,2,2.5,3,3.5,4].map(n => <option key={n} value={n}>{n} BA</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Square feet</label>
                <input name="square_feet" type="number" value={form.square_feet} onChange={handleChange}
                  placeholder="850" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Floor level</label>
                <select name="floor_level" value={form.floor_level} onChange={handleChange}
                  className={`${inputClass} bg-white`}>
                  <option value="">Select</option>
                  {['Ground','1st','2nd','3rd','4th+','Top Floor'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Year built</label>
                <input name="year_built" type="number" value={form.year_built} onChange={handleChange}
                  placeholder="1995" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Available date</label>
                <input name="available_date" type="date" value={form.available_date} onChange={handleChange}
                  className={inputClass} />
              </div>
            </div>
          </div>
        )}

        {/* ────── STEP 3: MONTHLY COSTS ────── */}
        {step === 3 && (
          <>
            <div className={sectionClass}>
              <h2 className={sectionHead}>Required Costs</h2>
              <div>
                <label className={labelClass}>Monthly rent ($) *</label>
                <input name="rent_amount" type="number" required value={form.rent_amount} onChange={handleChange}
                  placeholder="1200" className={inputClass} />
              </div>
              {ps && (
                <div className={`rounded-lg px-3 py-2 text-xs ${ps.withinStandard ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {ps.withinStandard
                    ? `✓ Within ${ps.regionLabel} payment standard — max $${ps.maxRent.toLocaleString()}`
                    : `⚠ Above ${ps.regionLabel} standard by $${ps.overBy} — voucher max is $${ps.maxRent.toLocaleString()}`
                  }
                  <span className="ml-1 text-gray-400">({ps.county} County)</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Security deposit ($)</label>
                  <input name="deposit_amount" type="number" value={form.deposit_amount} onChange={handleChange}
                    placeholder="1200" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Application fee ($)</label>
                  <input name="application_fee" type="number" value={form.application_fee} onChange={handleChange}
                    placeholder="50" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Pet deposit ($)</label>
                  <input name="pet_deposit" type="number" value={form.pet_deposit} onChange={handleChange}
                    placeholder="300" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Monthly pet rent ($)</label>
                  <input name="monthly_pet_rent" type="number" value={form.monthly_pet_rent} onChange={handleChange}
                    placeholder="50" className={inputClass} />
                </div>
              </div>
            </div>
            <div className={sectionClass}>
              <h2 className={sectionHead}>Optional Fees</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Holding fee ($)</label>
                  <input name="holding_fee" type="number" value={form.holding_fee} onChange={handleChange}
                    placeholder="200" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Move-in fee ($)</label>
                  <input name="move_in_fee" type="number" value={form.move_in_fee} onChange={handleChange}
                    placeholder="100" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Move-in special / promo</label>
                <input name="move_in_special" value={form.move_in_special} onChange={handleChange}
                  placeholder="e.g. First month free, No application fee" className={inputClass} />
              </div>
            </div>
          </>
        )}

        {/* ────── STEP 4: UTILITIES & APPLIANCES ────── */}
        {step === 4 && (
          <>
            <div className={sectionClass}>
              <h2 className={sectionHead}>Utilities — Who Pays?</h2>
              <p className="text-xs text-gray-400">Select who is responsible for each utility.</p>
              {UTILITY_LIST.map(util => (
                <div key={util}>
                  <label className={labelClass}>{util}</label>
                  <div className="flex gap-2">
                    {['Tenant','Landlord','Included'].map(who => (
                      <button key={who} type="button"
                        onClick={() => setUtility(util, who.toLowerCase())}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                          form.utilities[util] === who.toLowerCase()
                            ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                            : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        {who}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className={sectionClass}>
              <h2 className={sectionHead}>Appliances Included</h2>
              <div className="flex flex-wrap gap-2">
                {APPLIANCE_LIST.map(a => (
                  <CheckPill key={a} label={a} checked={form.appliances.includes(a)}
                    onToggle={() => toggleArr('appliances', a)} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* ────── STEP 5: AMENITIES & PETS ────── */}
        {step === 5 && (
          <>
            <div className={sectionClass}>
              <h2 className={sectionHead}>Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {AMENITY_LIST.map(a => (
                  <CheckPill key={a} label={a} checked={form.amenities.includes(a)}
                    onToggle={() => toggleArr('amenities', a)} />
                ))}
              </div>
            </div>

            <div className={sectionClass}>
              <h2 className={sectionHead}>Accessibility Features</h2>
              <div className="flex flex-wrap gap-2">
                {ACCESSIBILITY_LIST.map(a => (
                  <CheckPill key={a} label={a} checked={(form.accessibility||[]).includes(a)}
                    onToggle={() => toggleArr('accessibility', a)} />
                ))}
              </div>
            </div>

            <div className={sectionClass}>
              <h2 className={sectionHead}>Pet Policy</h2>
              <Toggle label="Pets allowed" checked={form.pets_allowed}
                onChange={() => setForm(prev => ({ ...prev, pets_allowed: !prev.pets_allowed }))} />
              {form.pets_allowed && (
                <>
                  <div>
                    <label className={labelClass}>Pet types accepted</label>
                    <div className="flex gap-2 flex-wrap">
                      {['Dogs','Cats','Small Animals','Birds'].map(t => (
                        <CheckPill key={t} label={t} checked={form.pet_types.includes(t)}
                          onToggle={() => toggleArr('pet_types', t)} />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Breed restrictions</label>
                      <input name="breed_restrictions" value={form.breed_restrictions} onChange={handleChange}
                        placeholder="e.g. No Pit Bulls" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Weight limit</label>
                      <input name="weight_limit" value={form.weight_limit} onChange={handleChange}
                        placeholder="e.g. Under 25 lbs" className={inputClass} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ────── STEP 6: HCV & REQUIREMENTS ────── */}
        {step === 6 && (
          <>
            <div className={sectionClass}>
              <h2 className={sectionHead}>Housing Choice Voucher (Section 8)</h2>
              <Toggle label="Accepting HCV tenants"
                sublabel="Is this property available for voucher holders?"
                checked={form.hcv_accepted}
                onChange={() => setForm(prev => ({ ...prev, hcv_accepted: !prev.hcv_accepted }))} />

              {form.hcv_accepted && (
                <>
                  <div>
                    <label className={labelClass}>Voucher bedroom sizes accepted</label>
                    <div className="flex gap-2 flex-wrap">
                      {VOUCHER_SIZES.map(s => (
                        <CheckPill key={s} label={s} checked={form.voucher_sizes_accepted.includes(s)}
                          onToggle={() => toggleArr('voucher_sizes_accepted', s)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Housing authorities accepted</label>
                    <div className="flex gap-2">
                      {['AHA','DCA','Other'].map(ha => (
                        <CheckPill key={ha} label={ha} checked={form.ha_accepted.includes(ha.toLowerCase() === 'other' ? 'other' : ha)}
                          onToggle={() => toggleArr('ha_accepted', ha.toLowerCase() === 'other' ? 'other' : ha)} />
                      ))}
                    </div>
                  </div>
                  <Toggle label="Unit has previously passed housing inspection"
                    checked={form.previously_inspected}
                    onChange={() => setForm(prev => ({ ...prev, previously_inspected: !prev.previously_inspected }))} />
                  <Toggle label="Property is move-in ready"
                    sublabel="Inspection-ready, no outstanding repairs"
                    checked={form.move_in_ready}
                    onChange={() => setForm(prev => ({ ...prev, move_in_ready: !prev.move_in_ready }))} />
                  <Toggle label="Unit is currently occupied"
                    checked={form.currently_occupied}
                    onChange={() => setForm(prev => ({ ...prev, currently_occupied: !prev.currently_occupied }))} />
                </>
              )}
            </div>

            <div className={sectionClass}>
              <h2 className={sectionHead}>Rental Requirements</h2>
              <div>
                <label className={labelClass}>Minimum credit score</label>
                <select name="min_credit_score" value={form.min_credit_score} onChange={handleChange}
                  className={`${inputClass} bg-white`}>
                  <option value="">No minimum / flexible</option>
                  <option value="500">500+</option>
                  <option value="550">550+</option>
                  <option value="600">600+</option>
                  <option value="620">620+</option>
                  <option value="650">650+</option>
                  <option value="680">680+</option>
                  <option value="700">700+</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Income requirement</label>
                <select name="income_requirement" value={form.income_requirement} onChange={handleChange}
                  className={`${inputClass} bg-white`}>
                  <option value="">No minimum</option>
                  <option value="2x">2× monthly rent</option>
                  <option value="2.5x">2.5× monthly rent</option>
                  <option value="3x">3× monthly rent</option>
                  <option value="voucher-only">Voucher income only accepted</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Criminal background policy</label>
                <select name="criminal_background_policy" value={form.criminal_background_policy} onChange={handleChange}
                  className={`${inputClass} bg-white`}>
                  <option value="standard">Standard check</option>
                  <option value="case-by-case">Case-by-case basis</option>
                  <option value="no-check">No check required</option>
                  <option value="none">No felonies</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Eviction history policy</label>
                <select name="eviction_policy" value={form.eviction_policy} onChange={handleChange}
                  className={`${inputClass} bg-white`}>
                  <option value="case-by-case">Case-by-case</option>
                  <option value="none">No prior evictions</option>
                  <option value="5-years">None in past 5 years</option>
                  <option value="flexible">Flexible / will consider</option>
                </select>
              </div>
              <div className="space-y-3 pt-1">
                <Toggle label="Rental history required" checked={form.rental_history_required}
                  onChange={() => setForm(prev => ({ ...prev, rental_history_required: !prev.rental_history_required }))} />
                <Toggle label="Cosigner accepted" checked={form.cosigner_accepted}
                  onChange={() => setForm(prev => ({ ...prev, cosigner_accepted: !prev.cosigner_accepted }))} />
                <Toggle label="Credit friendly" sublabel="Willing to work with limited or poor credit"
                  checked={form.credit_friendly}
                  onChange={() => setForm(prev => ({ ...prev, credit_friendly: !prev.credit_friendly }))} />
                <Toggle label="Smoking allowed" checked={form.smoking_allowed}
                  onChange={() => setForm(prev => ({ ...prev, smoking_allowed: !prev.smoking_allowed }))} />
              </div>
            </div>
          </>
        )}

        {/* ────── STEP 7: DESCRIPTION & MEDIA ────── */}
        {step === 7 && (
          <>
            <div className={sectionClass}>
              <h2 className={sectionHead}>Property Description</h2>
              <textarea name="description" value={form.description} onChange={handleChange} rows={6}
                placeholder="Tell prospective tenants about your property — highlights, neighborhood, what makes it a great home…"
                className={`${inputClass} resize-none`} />
            </div>

            <div className={sectionClass}>
              <h2 className={sectionHead}>Photos</h2>
              <p className="text-xs text-gray-400">Include: exterior, living room, kitchen, every bedroom, bathroom. More photos = more applications.</p>
              <div className="flex gap-2 flex-wrap">
                {form.photos.map(url => (
                  <div key={url} className="relative w-24 h-24">
                    <img src={url} alt="" className="w-24 h-24 object-cover rounded-lg" />
                    <button type="button" onClick={() => removePhoto(url)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:border-[#1B3A6B] transition-colors">
                  {uploading
                    ? <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    : <><Upload className="w-5 h-5 mb-1" /><span className="text-xs">Add photo</span></>
                  }
                  <input type="file" accept="image/*" onChange={uploadPhoto} className="hidden" />
                </label>
              </div>
            </div>

            <div className={sectionClass}>
              <h2 className={sectionHead}>Video (optional)</h2>
              <div>
                <label className={labelClass}>YouTube or Vimeo link</label>
                <input name="video_url" type="url" value={form.video_url} onChange={handleChange}
                  placeholder="https://youtube.com/watch?v=..." className={inputClass} />
              </div>
            </div>
          </>
        )}

        {/* ────── STEP 8: AVAILABILITY & CONTACT ────── */}
        {step === 8 && (
          <>
            <div className={sectionClass}>
              <h2 className={sectionHead}>Lease & Availability</h2>
              <div>
                <label className={labelClass}>Lease type</label>
                <div className="flex gap-2">
                  {[['fixed','Fixed Term'],['month-to-month','Month-to-Month'],['either','Either']].map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => setForm(prev => ({ ...prev, lease_type: val }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        form.lease_type === val ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Minimum lease length (months)</label>
                <select name="min_lease_months" value={form.min_lease_months} onChange={handleChange}
                  className={`${inputClass} bg-white`}>
                  {[1,3,6,12,18,24].map(m => (
                    <option key={m} value={m}>{m} {m === 1 ? 'month' : 'months'}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={sectionClass}>
              <h2 className={sectionHead}>How should tenants contact you?</h2>
              <div className="flex flex-wrap gap-2">
                {['Call','Text','Email','Apply Online'].map(c => (
                  <CheckPill key={c} label={c} checked={form.contact_preferences.includes(c.toLowerCase())}
                    onToggle={() => toggleArr('contact_preferences', c.toLowerCase())} />
                ))}
              </div>
            </div>

            <div className={sectionClass}>
              <h2 className={sectionHead}>Nearby Attractions</h2>
              <p className="text-xs text-gray-400">Check all that are close to this property.</p>
              <div className="flex flex-wrap gap-2">
                {NEARBY_LIST.map(n => (
                  <CheckPill key={n} label={n} checked={form.nearby_attractions.includes(n)}
                    onToggle={() => toggleArr('nearby_attractions', n)} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* ────── STEP 9: DOCUMENTS & AGREEMENT ────── */}
        {step === 9 && (
          <>
            <div className={sectionClass}>
              <h2 className={sectionHead}>Documents (optional)</h2>
              <p className="text-xs text-gray-400 mb-2">
                Upload ownership verification, W-9, or lead paint disclosure. These are stored securely and not shown publicly.
              </p>
              {[
                'Ownership Verification',
                'W-9',
                'Lead-Based Paint Disclosure',
                'Property Management Agreement',
                'Business License',
                'Rental License',
              ].map(doc => (
                <div key={doc} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-700">{doc}</span>
                  <label className="text-xs text-[#1B3A6B] font-medium cursor-pointer flex items-center gap-1">
                    <Upload className="w-3 h-3" /> Upload
                    <input type="file" accept=".pdf,.doc,.docx,.jpg,.png" className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files[0]
                        if (!file) return
                        const fd = new FormData()
                        fd.append('file', file)
                        fd.append('upload_preset', 'settleed_listings')
                        try {
                          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/raw/upload`, { method:'POST', body:fd })
                          const data = await res.json()
                          if (data.secure_url) {
                            setForm(prev => ({ ...prev, documents: [...prev.documents, { name: doc, url: data.secure_url }] }))
                            toast.success(`${doc} uploaded`)
                          }
                        } catch { toast.error('Upload failed') }
                      }}
                    />
                  </label>
                </div>
              ))}
              {form.documents.length > 0 && (
                <div className="pt-2 space-y-1">
                  {form.documents.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-green-700">
                      <Check className="w-3 h-3" /> {d.name} uploaded
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={sectionClass}>
              <h2 className={sectionHead}>Agreement</h2>
              <p className="text-xs text-gray-500 mb-3">
                Please review and check all boxes to publish your listing.
              </p>
              {[
                ['agree_accurate',      'I certify that all information in this listing is accurate and true.'],
                ['agree_terms',         'I agree to the Settleed Terms of Service and Listing Policy.'],
                ['agree_publish',       'I authorize Settleed to publish this listing to prospective tenants.'],
                ['agree_no_false_info', 'I understand that false or misleading information may result in removal of my listing and account suspension.'],
              ].map(([field, text]) => (
                <label key={field} className="flex items-start gap-3 cursor-pointer py-2 border-b border-gray-100 last:border-0">
                  <input type="checkbox" checked={form[field]}
                    onChange={e => setForm(prev => ({ ...prev, [field]: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-[#1B3A6B] shrink-0" />
                  <span className="text-sm text-gray-700">{text}</span>
                </label>
              ))}
            </div>

            {['trialing', 'active'].includes(subscriptionStatus) ? (
              <button
                type="button"
                onClick={handlePublish}
                disabled={saving || !form.agree_accurate || !form.agree_terms || !form.agree_publish || !form.agree_no_false_info}
                className="w-full bg-[#1D9E75] text-white rounded-xl py-4 font-semibold text-sm disabled:opacity-40"
              >
                {saving ? 'Publishing…' : '🎉 Publish Listing'}
              </button>
            ) : (
              <Link
                to="/subscribe"
                className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-4"
              >
                <div>
                  <div className="font-semibold text-sm text-amber-900 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    Subscribe to publish this listing
                  </div>
                  <div className="text-amber-700 text-xs mt-0.5">Start your free 7-day trial — $49/mo after</div>
                </div>
                <span className="text-xs font-bold text-amber-900 bg-amber-200 px-2.5 py-1 rounded-full">Get started →</span>
              </Link>
            )}

            <button type="button" onClick={handleSaveDraft} disabled={saving}
              className="w-full border border-gray-300 text-gray-600 rounded-xl py-3 font-medium text-sm">
              Save draft & finish later
            </button>
          </>
        )}

        {/* Nav buttons (steps 1–8) */}
        {step < TOTAL_STEPS && (
          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <button type="button" onClick={() => { setStep(s => s-1); window.scrollTo(0,0) }}
                className="flex-1 border border-gray-300 text-gray-600 rounded-xl py-3 font-medium text-sm">
                ← Back
              </button>
            )}
            <button type="button" onClick={handleNext} disabled={saving}
              className="flex-1 bg-[#1B3A6B] text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50">
              {saving ? 'Saving…' : 'Continue →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
