import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { HOUSING_AUTHORITIES } from '../../lib/paymentStandards'
import toast from 'react-hot-toast'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'

const STEPS = [
  { id: 'housing',      label: 'Current Housing' },
  { id: 'voucher',      label: 'Voucher' },
  { id: 'household',    label: 'Household' },
  { id: 'preferences',  label: 'Preferences' },
  { id: 'property',     label: 'Property Type' },
  { id: 'pets',         label: 'Pets' },
  { id: 'employment',   label: 'Employment' },
  { id: 'screening',    label: 'Screening' },
  { id: 'about',        label: 'About You' },
  { id: 'settings',     label: 'Settings' },
]

const AMENITIES = [
  'Washer/Dryer', 'Washer Hookups', 'Central Air', 'Garage', 'Fenced Yard',
  'Backyard', 'Balcony', 'Elevator', 'First Floor', 'Gated Community',
  'Pool', 'Gym', 'Playground', 'Storage',
]

const ACCESSIBILITY = [
  'Wheelchair Accessible', 'No Stairs', 'Walk-in Shower', 'Grab Bars',
  'Wide Doorways', 'Visual Fire Alarm', 'Service Animal',
]

const PROPERTY_TYPES = [
  { value: 'single_family', label: 'Single Family Home' },
  { value: 'apartment',     label: 'Apartment' },
  { value: 'townhome',      label: 'Townhome' },
  { value: 'duplex',        label: 'Duplex' },
  { value: 'condo',         label: 'Condo' },
]

export default function TenantProfileSetup() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stepIndex, setStepIndex] = useState(0)
  const [saving, setSaving] = useState(false)

  const [data, setData] = useState({
    // Step 1 - Housing
    currentCity: '', currentState: '', currentZip: '', currentHousingSituation: '',
    // Step 2 - Voucher
    voucherStatus: '', housingAuthority: '', voucherBedroomSize: '',
    voucherExpirationDate: '', searchRadius: '', porting: false, portInHousingAuthority: '',
    // Step 3 - Household
    numAdults: 1, numChildren: 0, totalHouseholdMembers: 1,
    householdMemberAges: '', requiresAccessibleUnit: false, accessibilityNeeds: [],
    // Step 4 - Preferences
    desiredMoveInDate: '', preferredCities: '', preferredZipCodes: '',
    maxRent: '', neighborhoodPreferences: '', distanceFromWork: '', distanceFromTransit: '',
    // Step 5 - Property
    propertyTypePreferences: [], minBedrooms: '', minBathrooms: '', amenityPreferences: [],
    // Step 6 - Pets
    hasPets: false, petTypes: [], numPets: 1, petBreed: '', petWeight: '',
    // Step 7 - Employment
    employmentStatus: '', employerName: '', currentLandlord: '',
    lengthOfStay: '', reasonForMoving: '', ownsVehicle: false, numVehicles: 0,
    needsPublicTransit: false, parkingRequired: false,
    // Step 8 - Screening
    okBackgroundCheck: null, okCreditCheck: null, previousEviction: '',
    // Step 9 - About
    bio: '', preferredName: '', secondaryPhone: '',
    // Step 10 - Settings
    contactPreferences: ['email'],
    notificationPreferences: {
      new_matches: true, landlord_message: true,
      profile_viewed: true, favorite_available: true, voucher_expiry: true,
    },
    privacySettings: {
      show_full_name: true, show_phone: false, show_email: false,
      show_photo: true, show_voucher_status: true,
      show_household_size: true, show_preferred_areas: true,
    },
  })

  function set(field, value) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  function toggleArray(field, value) {
    setData(prev => {
      const arr = prev[field]
      return { ...prev, [field]: arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value] }
    })
  }

  function toggleNested(parent, key) {
    setData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [key]: !prev[parent][key] }
    }))
  }

  async function saveStep() {
    if (!user) return
    setSaving(true)

    const stepId = STEPS[stepIndex].id
    let payload = {}

    if (stepId === 'housing') {
      payload = {
        current_city: data.currentCity || null,
        current_state: data.currentState || null,
        current_zip: data.currentZip || null,
        current_housing_situation: data.currentHousingSituation || null,
      }
    } else if (stepId === 'voucher') {
      payload = {
        voucher_status: data.voucherStatus || null,
        housing_authority: data.housingAuthority || null,
        voucher_bedroom_size: data.voucherBedroomSize || null,
        voucher_expiration_date: data.voucherExpirationDate || null,
        search_radius: data.searchRadius || null,
        porting: data.porting,
        port_in_housing_authority: data.portInHousingAuthority || null,
      }
    } else if (stepId === 'household') {
      payload = {
        num_adults: parseInt(data.numAdults) || 1,
        num_children: parseInt(data.numChildren) || 0,
        total_household_members: parseInt(data.totalHouseholdMembers) || 1,
        household_member_ages: data.householdMemberAges
          ? data.householdMemberAges.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        requires_accessible_unit: data.requiresAccessibleUnit,
        accessibility_needs: data.accessibilityNeeds,
      }
    } else if (stepId === 'preferences') {
      payload = {
        desired_move_in_date: data.desiredMoveInDate || null,
        preferred_cities: data.preferredCities
          ? data.preferredCities.split(',').map(s => s.trim()).filter(Boolean) : [],
        preferred_zip_codes: data.preferredZipCodes
          ? data.preferredZipCodes.split(',').map(s => s.trim()).filter(Boolean) : [],
        max_rent: data.maxRent ? parseFloat(data.maxRent) : null,
        neighborhood_preferences: data.neighborhoodPreferences || null,
        distance_from_work: data.distanceFromWork || null,
        distance_from_transit: data.distanceFromTransit || null,
      }
    } else if (stepId === 'property') {
      payload = {
        property_type_preferences: data.propertyTypePreferences,
        min_bedrooms: data.minBedrooms ? parseInt(data.minBedrooms) : null,
        min_bathrooms: data.minBathrooms ? parseFloat(data.minBathrooms) : null,
        amenity_preferences: data.amenityPreferences,
      }
    } else if (stepId === 'pets') {
      payload = {
        has_pets: data.hasPets,
        pet_types: data.hasPets ? data.petTypes : [],
        num_pets: data.hasPets ? parseInt(data.numPets) || 1 : 0,
        pet_breed: data.hasPets ? data.petBreed || null : null,
        pet_weight: data.hasPets ? data.petWeight || null : null,
      }
    } else if (stepId === 'employment') {
      payload = {
        employment_status: data.employmentStatus || null,
        employer_name: data.employerName || null,
        current_landlord: data.currentLandlord || null,
        length_of_stay: data.lengthOfStay || null,
        reason_for_moving: data.reasonForMoving || null,
        owns_vehicle: data.ownsVehicle,
        num_vehicles: parseInt(data.numVehicles) || 0,
        needs_public_transit: data.needsPublicTransit,
        parking_required: data.parkingRequired,
      }
    } else if (stepId === 'screening') {
      payload = {
        ok_background_check: data.okBackgroundCheck,
        ok_credit_check: data.okCreditCheck,
        previous_eviction: data.previousEviction || null,
      }
    } else if (stepId === 'about') {
      payload = {
        bio: data.bio || null,
        preferred_name: data.preferredName || null,
        secondary_phone: data.secondaryPhone || null,
      }
    } else if (stepId === 'settings') {
      payload = {
        contact_preferences: data.contactPreferences,
        notification_preferences: data.notificationPreferences,
        privacy_settings: data.privacySettings,
        profile_wizard_completed: true,
      }
    }

    // Track which steps have been completed
    payload.profile_wizard_steps = [...new Set([
      ...(data._completedSteps || []),
      stepId,
    ])]

    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)
    setSaving(false)

    if (error) {
      toast.error('Could not save. Try again.')
      return
    }

    if (stepIndex < STEPS.length - 1) {
      setData(prev => ({ ...prev, _completedSteps: payload.profile_wizard_steps }))
      setStepIndex(i => i + 1)
    } else {
      toast.success('Profile complete!')
      navigate('/tenant')
    }
  }

  async function skip() {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(i => i + 1)
    } else {
      // Mark wizard done even if last step skipped
      await supabase.from('profiles')
        .update({ profile_wizard_completed: true })
        .eq('id', user.id)
      navigate('/tenant')
    }
  }

  const progress = Math.round(((stepIndex) / STEPS.length) * 100)
  const inputClass = 'w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  function Pill({ label, active, onClick }) {
    return (
      <button type="button" onClick={onClick}
        className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
          active ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-300'
        }`}>
        {label}
      </button>
    )
  }

  function Checkbox({ label, checked, onChange }) {
    return (
      <label className="flex items-center gap-3 py-2 cursor-pointer">
        <div onClick={onChange}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            checked ? 'bg-[#1B3A6B] border-[#1B3A6B]' : 'border-gray-300'
          }`}>
          {checked && <Check className="w-3 h-3 text-white" />}
        </div>
        <span className="text-sm text-gray-700">{label}</span>
      </label>
    )
  }

  const stepId = STEPS[stepIndex].id

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-4">
        <p className="text-blue-200 text-xs uppercase tracking-wide mb-1">
          Step {stepIndex + 1} of {STEPS.length}
        </p>
        <h1 className="text-white text-xl font-bold">{STEPS[stepIndex].label}</h1>
        <div className="mt-3 bg-white/20 rounded-full h-1.5">
          <div className="bg-[#1D9E75] h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Step dots */}
      <div className="flex gap-1.5 justify-center px-4 py-3 bg-white border-b border-gray-100">
        {STEPS.map((s, i) => (
          <div key={s.id} className={`h-1.5 flex-1 rounded-full transition-colors ${
            i < stepIndex ? 'bg-[#1D9E75]' : i === stepIndex ? 'bg-[#1B3A6B]' : 'bg-gray-200'
          }`} />
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 px-4 py-6 max-w-sm mx-auto w-full space-y-4">

        {/* ── Step 1: Current Housing ── */}
        {stepId === 'housing' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>City</label>
                <input className={inputClass} placeholder="Atlanta" value={data.currentCity}
                  onChange={e => set('currentCity', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input className={inputClass} placeholder="GA" maxLength={2} value={data.currentState}
                  onChange={e => set('currentState', e.target.value.toUpperCase())} />
              </div>
            </div>
            <div>
              <label className={labelClass}>ZIP Code</label>
              <input className={inputClass} placeholder="30301" value={data.currentZip}
                onChange={e => set('currentZip', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Current housing situation</label>
              <div className="grid grid-cols-2 gap-2">
                {['Renting', 'Staying with Family', 'Homeless', 'Shelter', 'Hotel', 'Transitional Housing', 'Other'].map(opt => (
                  <Pill key={opt} label={opt}
                    active={data.currentHousingSituation === opt.toLowerCase().replace(/ /g, '_')}
                    onClick={() => set('currentHousingSituation', opt.toLowerCase().replace(/ /g, '_'))} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Step 2: Voucher ── */}
        {stepId === 'voucher' && (
          <>
            <div>
              <label className={labelClass}>Do you have a Housing Choice Voucher?</label>
              <div className="flex gap-2">
                {['Yes', 'No', 'Pending'].map(opt => (
                  <Pill key={opt} label={opt} active={data.voucherStatus === opt.toLowerCase()}
                    onClick={() => set('voucherStatus', opt.toLowerCase())} />
                ))}
              </div>
            </div>
            {data.voucherStatus === 'yes' && (
              <>
                <div>
                  <label className={labelClass}>Housing Authority</label>
                  <select className={`${inputClass} bg-white`} value={data.housingAuthority}
                    onChange={e => set('housingAuthority', e.target.value)}>
                    <option value="">Select housing authority</option>
                    {HOUSING_AUTHORITIES.map(ha => (
                      <option key={ha.value} value={ha.value}>{ha.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Voucher bedroom size</label>
                  <div className="flex flex-wrap gap-2">
                    {['Studio', '1 BR', '2 BR', '3 BR', '4 BR', '5+ BR'].map((opt, i) => {
                      const val = i === 0 ? 'studio' : `${i}br`
                      return <Pill key={opt} label={opt} active={data.voucherBedroomSize === val}
                        onClick={() => set('voucherBedroomSize', val)} />
                    })}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Voucher expiration date</label>
                  <input type="date" className={inputClass} value={data.voucherExpirationDate}
                    onChange={e => set('voucherExpirationDate', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Searching within</label>
                  <div className="flex gap-2">
                    {['City', 'County', 'State'].map(opt => (
                      <Pill key={opt} label={opt} active={data.searchRadius === opt.toLowerCase()}
                        onClick={() => set('searchRadius', opt.toLowerCase())} />
                    ))}
                  </div>
                </div>
                <Checkbox label="Porting from another housing authority?"
                  checked={data.porting} onChange={() => set('porting', !data.porting)} />
                {data.porting && (
                  <div>
                    <label className={labelClass}>Port-in housing authority</label>
                    <input className={inputClass} placeholder="Enter name" value={data.portInHousingAuthority}
                      onChange={e => set('portInHousingAuthority', e.target.value)} />
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── Step 3: Household ── */}
        {stepId === 'household' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[['numAdults', 'Adults'], ['numChildren', 'Children'], ['totalHouseholdMembers', 'Total']].map(([field, label]) => (
                <div key={field}>
                  <label className={labelClass}>{label}</label>
                  <input type="number" min="0" className={inputClass} value={data[field]}
                    onChange={e => set(field, e.target.value)} />
                </div>
              ))}
            </div>
            <div>
              <label className={labelClass}>Ages of household members <span className="text-gray-400 font-normal">(optional, comma-separated)</span></label>
              <input className={inputClass} placeholder="35, 32, 8, 5" value={data.householdMemberAges}
                onChange={e => set('householdMemberAges', e.target.value)} />
            </div>
            <Checkbox label="We require an accessible unit"
              checked={data.requiresAccessibleUnit}
              onChange={() => set('requiresAccessibleUnit', !data.requiresAccessibleUnit)} />
            {data.requiresAccessibleUnit && (
              <div>
                <label className={labelClass}>Accessibility needs</label>
                <div className="grid grid-cols-2 gap-1">
                  {ACCESSIBILITY.map(item => (
                    <Checkbox key={item} label={item}
                      checked={data.accessibilityNeeds.includes(item)}
                      onChange={() => toggleArray('accessibilityNeeds', item)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Step 4: Housing Preferences ── */}
        {stepId === 'preferences' && (
          <>
            <div>
              <label className={labelClass}>Desired move-in date</label>
              <input type="date" className={inputClass} value={data.desiredMoveInDate}
                onChange={e => set('desiredMoveInDate', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Preferred cities <span className="text-gray-400 font-normal">(comma-separated)</span></label>
              <input className={inputClass} placeholder="Atlanta, Decatur" value={data.preferredCities}
                onChange={e => set('preferredCities', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Preferred ZIP codes <span className="text-gray-400 font-normal">(comma-separated)</span></label>
              <input className={inputClass} placeholder="30301, 30318" value={data.preferredZipCodes}
                onChange={e => set('preferredZipCodes', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Maximum rent (optional)</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400 text-sm">$</span>
                <input type="number" className={`${inputClass} pl-7`} placeholder="1200" value={data.maxRent}
                  onChange={e => set('maxRent', e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Neighborhood preferences <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className={inputClass} placeholder="Near schools, quiet street..." value={data.neighborhoodPreferences}
                onChange={e => set('neighborhoodPreferences', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>From work</label>
                <select className={`${inputClass} bg-white`} value={data.distanceFromWork}
                  onChange={e => set('distanceFromWork', e.target.value)}>
                  <option value="">Any</option>
                  {['5 min', '10 min', '15 min', '20 min', '30 min', '45 min', '1 hr+'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>From transit</label>
                <select className={`${inputClass} bg-white`} value={data.distanceFromTransit}
                  onChange={e => set('distanceFromTransit', e.target.value)}>
                  <option value="">Any</option>
                  {['Walking', '5 min', '10 min', '15 min', '20 min+'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {/* ── Step 5: Property Type ── */}
        {stepId === 'property' && (
          <>
            <div>
              <label className={labelClass}>Property types (select all that work)</label>
              <div className="grid grid-cols-2 gap-2">
                {PROPERTY_TYPES.map(({ value, label }) => (
                  <Pill key={value} label={label}
                    active={data.propertyTypePreferences.includes(value)}
                    onClick={() => toggleArray('propertyTypePreferences', value)} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Min bedrooms</label>
                <select className={`${inputClass} bg-white`} value={data.minBedrooms}
                  onChange={e => set('minBedrooms', e.target.value)}>
                  <option value="">Any</option>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Min bathrooms</label>
                <select className={`${inputClass} bg-white`} value={data.minBathrooms}
                  onChange={e => set('minBathrooms', e.target.value)}>
                  <option value="">Any</option>
                  {[1, 1.5, 2, 2.5, 3].map(n => <option key={n} value={n}>{n}+</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Amenities I want</label>
              <div className="grid grid-cols-2 gap-1">
                {AMENITIES.map(item => (
                  <Checkbox key={item} label={item}
                    checked={data.amenityPreferences.includes(item)}
                    onChange={() => toggleArray('amenityPreferences', item)} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Step 6: Pets ── */}
        {stepId === 'pets' && (
          <>
            <div>
              <label className={labelClass}>Do you have pets?</label>
              <div className="flex gap-2">
                <Pill label="Yes" active={data.hasPets === true} onClick={() => set('hasPets', true)} />
                <Pill label="No" active={data.hasPets === false && data.hasPets !== ''} onClick={() => set('hasPets', false)} />
              </div>
            </div>
            {data.hasPets === true && (
              <>
                <div>
                  <label className={labelClass}>Type of pet(s)</label>
                  <div className="flex gap-2 flex-wrap">
                    {['Dog', 'Cat', 'Other'].map(p => (
                      <Pill key={p} label={p} active={data.petTypes.includes(p.toLowerCase())}
                        onClick={() => toggleArray('petTypes', p.toLowerCase())} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Number of pets</label>
                  <input type="number" min="1" className={inputClass} value={data.numPets}
                    onChange={e => set('numPets', e.target.value)} />
                </div>
                {data.petTypes.includes('dog') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Breed</label>
                      <input className={inputClass} placeholder="Labrador" value={data.petBreed}
                        onChange={e => set('petBreed', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Weight</label>
                      <input className={inputClass} placeholder="45 lbs" value={data.petWeight}
                        onChange={e => set('petWeight', e.target.value)} />
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── Step 7: Employment & Rental History ── */}
        {stepId === 'employment' && (
          <>
            <div>
              <label className={labelClass}>Employment status</label>
              <div className="grid grid-cols-2 gap-2">
                {['Full-Time', 'Part-Time', 'Self-Employed', 'Disabled', 'Retired', 'Unemployed'].map(s => (
                  <Pill key={s} label={s} active={data.employmentStatus === s.toLowerCase().replace('-', '_').replace(' ', '_')}
                    onClick={() => set('employmentStatus', s.toLowerCase().replace('-', '_').replace(' ', '_'))} />
                ))}
              </div>
            </div>
            {['full_time','part_time','self_employed'].includes(data.employmentStatus) && (
              <div>
                <label className={labelClass}>Employer name <span className="text-gray-400 font-normal">(optional)</span></label>
                <input className={inputClass} placeholder="Company name" value={data.employerName}
                  onChange={e => set('employerName', e.target.value)} />
              </div>
            )}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Rental history</p>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Current landlord <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input className={inputClass} placeholder="Name or company" value={data.currentLandlord}
                    onChange={e => set('currentLandlord', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>How long at current address?</label>
                  <select className={`${inputClass} bg-white`} value={data.lengthOfStay}
                    onChange={e => set('lengthOfStay', e.target.value)}>
                    <option value="">Select</option>
                    {['Less than 6 months','6–12 months','1–2 years','2–5 years','5+ years'].map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Reason for moving</label>
                  <input className={inputClass} placeholder="e.g. Looking for larger unit" value={data.reasonForMoving}
                    onChange={e => set('reasonForMoving', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Transportation</p>
              <div className="space-y-2">
                <Checkbox label="I own a vehicle" checked={data.ownsVehicle} onChange={() => set('ownsVehicle', !data.ownsVehicle)} />
                {data.ownsVehicle && (
                  <div>
                    <label className={labelClass}>Number of vehicles</label>
                    <input type="number" min="1" className={inputClass} value={data.numVehicles}
                      onChange={e => set('numVehicles', e.target.value)} />
                  </div>
                )}
                <Checkbox label="I need MARTA / public transit access" checked={data.needsPublicTransit}
                  onChange={() => set('needsPublicTransit', !data.needsPublicTransit)} />
                <Checkbox label="Parking is required" checked={data.parkingRequired}
                  onChange={() => set('parkingRequired', !data.parkingRequired)} />
              </div>
            </div>
          </>
        )}

        {/* ── Step 8: Screening ── */}
        {stepId === 'screening' && (
          <>
            <p className="text-sm text-gray-500">These help landlords understand your situation upfront — no surprises later.</p>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Comfortable with a background check?</label>
                <div className="flex gap-2">
                  <Pill label="Yes" active={data.okBackgroundCheck === true} onClick={() => set('okBackgroundCheck', true)} />
                  <Pill label="No" active={data.okBackgroundCheck === false} onClick={() => set('okBackgroundCheck', false)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Comfortable with a credit check?</label>
                <div className="flex gap-2">
                  <Pill label="Yes" active={data.okCreditCheck === true} onClick={() => set('okCreditCheck', true)} />
                  <Pill label="No" active={data.okCreditCheck === false} onClick={() => set('okCreditCheck', false)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Previous eviction on record?</label>
                <div className="flex gap-2 flex-wrap">
                  {['Yes', 'No', 'Prefer to Discuss'].map(opt => (
                    <Pill key={opt} label={opt}
                      active={data.previousEviction === opt.toLowerCase().replace(/ /g, '_')}
                      onClick={() => set('previousEviction', opt.toLowerCase().replace(/ /g, '_'))} />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Step 9: About You ── */}
        {stepId === 'about' && (
          <>
            <div>
              <label className={labelClass}>Preferred name <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className={inputClass} placeholder="What should landlords call you?" value={data.preferredName}
                onChange={e => set('preferredName', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Secondary phone <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="tel" className={inputClass} placeholder="(404) 555-0200" value={data.secondaryPhone}
                onChange={e => set('secondaryPhone', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>About me</label>
              <textarea rows={5} className={`${inputClass} resize-none`}
                placeholder="Tell landlords a little about yourself and what you're looking for..."
                value={data.bio} onChange={e => set('bio', e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">{data.bio.length}/500 characters</p>
            </div>
          </>
        )}

        {/* ── Step 10: Settings ── */}
        {stepId === 'settings' && (
          <>
            <div>
              <label className={labelClass}>Contact preferences</label>
              <div className="flex gap-2">
                {['Phone', 'Text', 'Email', 'In-App'].map(m => (
                  <Pill key={m} label={m} active={data.contactPreferences.includes(m.toLowerCase())}
                    onClick={() => toggleArray('contactPreferences', m.toLowerCase())} />
                ))}
              </div>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notify me when</p>
              {[
                ['new_matches',       'New listings match my voucher'],
                ['landlord_message',  'A landlord messages me'],
                ['profile_viewed',    'A landlord views my profile'],
                ['favorite_available','A favorited property becomes available'],
                ['voucher_expiry',    'My voucher expiration is approaching'],
              ].map(([key, label]) => (
                <Checkbox key={key} label={label}
                  checked={data.notificationPreferences[key]}
                  onChange={() => toggleNested('notificationPreferences', key)} />
              ))}
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Landlords can see my</p>
              {[
                ['show_full_name',      'Full name'],
                ['show_phone',          'Phone number'],
                ['show_email',          'Email address'],
                ['show_photo',          'Profile photo'],
                ['show_voucher_status', 'Voucher status'],
                ['show_household_size', 'Household size'],
                ['show_preferred_areas','Preferred areas'],
              ].map(([key, label]) => (
                <Checkbox key={key} label={label}
                  checked={data.privacySettings[key]}
                  onChange={() => toggleNested('privacySettings', key)} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer nav */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-4 flex items-center gap-3">
        {stepIndex > 0 && (
          <button onClick={() => setStepIndex(i => i - 1)}
            className="p-3 rounded-xl border border-gray-200 text-gray-600">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <button onClick={saveStep} disabled={saving}
          className="flex-1 bg-[#1B3A6B] text-white rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? 'Saving...' : stepIndex < STEPS.length - 1 ? <>Save & continue <ChevronRight className="w-4 h-4" /></> : 'Finish profile'}
        </button>
        <button onClick={skip} className="text-sm text-gray-400 whitespace-nowrap">
          Skip
        </button>
      </div>
    </div>
  )
}
