import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { HOUSING_AUTHORITIES } from '../../lib/paymentStandards'
import toast from 'react-hot-toast'
import { ChevronLeft, Check } from 'lucide-react'

const STEPS = [
  { id: 'housing',     label: 'Current Address',    subtitle: 'Where do you live now?' },
  { id: 'voucher',     label: 'Voucher Info',        subtitle: 'Tell us about your housing voucher' },
  { id: 'household',   label: 'Your Household',      subtitle: 'Who will be living with you?' },
  { id: 'preferences', label: 'Move-In Preferences', subtitle: 'What are you looking for?' },
  { id: 'property',    label: 'Property Type',       subtitle: 'What kind of home do you want?' },
  { id: 'pets',        label: 'Pets',                subtitle: 'Do you have any pets?' },
  { id: 'employment',  label: 'Employment',          subtitle: 'Your work & rental history' },
  { id: 'screening',   label: 'Screening',           subtitle: 'Background & credit check readiness' },
  { id: 'about',       label: 'About You',           subtitle: 'Introduce yourself to landlords' },
  { id: 'settings',    label: 'Preferences',         subtitle: 'Notifications & privacy' },
]

const AMENITIES = [
  'Washer/Dryer','Washer Hookups','Central Air','Garage','Fenced Yard',
  'Backyard','Balcony','Elevator','First Floor','Gated Community',
  'Pool','Gym','Playground','Storage',
]

const ACCESSIBILITY = [
  'Wheelchair Accessible','No Stairs','Walk-in Shower','Grab Bars',
  'Wide Doorways','Visual Fire Alarm','Service Animal',
]

const PROPERTY_TYPES = [
  { value: 'single_family', label: 'Single Family Home' },
  { value: 'apartment',     label: 'Apartment' },
  { value: 'townhome',      label: 'Townhome' },
  { value: 'duplex',        label: 'Duplex' },
  { value: 'condo',         label: 'Condo' },
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

export default function TenantProfileSetup() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stepIndex, setStepIndex] = useState(0)
  const [saving, setSaving] = useState(false)

  const [data, setData] = useState({
    currentStreetAddress: '', currentAptUnit: '',
    currentCity: '', currentState: 'GA', currentZip: '',
    currentHousingSituation: '',
    voucherStatus: '', housingAuthority: '', voucherBedroomSize: '',
    voucherExpirationDate: '', searchRadius: '', porting: false, portInHousingAuthority: '',
    numAdults: 1, numChildren: 0, totalHouseholdMembers: 1,
    householdMemberAges: '', requiresAccessibleUnit: false, accessibilityNeeds: [],
    desiredMoveInDate: '', preferredCities: '', preferredZipCodes: '',
    maxRent: '', neighborhoodPreferences: '', distanceFromWork: '', distanceFromTransit: '',
    propertyTypePreferences: [], minBedrooms: '', minBathrooms: '', amenityPreferences: [],
    hasPets: null, petTypes: [], numPets: 1, petBreed: '', petWeight: '',
    employmentStatus: '', employerName: '', currentLandlord: '',
    lengthOfStay: '', reasonForMoving: '', ownsVehicle: false, numVehicles: 0,
    needsPublicTransit: false, parkingRequired: false,
    okBackgroundCheck: null, okCreditCheck: null, previousEviction: '',
    bio: '', preferredName: '', secondaryPhone: '',
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

  function set(field, value) { setData(prev => ({ ...prev, [field]: value })) }

  function toggleArray(field, value) {
    setData(prev => {
      const arr = prev[field]
      return { ...prev, [field]: arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value] }
    })
  }

  function toggleNested(parent, key) {
    setData(prev => ({ ...prev, [parent]: { ...prev[parent], [key]: !prev[parent][key] } }))
  }

  function buildFullPayload() {
    return {
      current_street_address: data.currentStreetAddress || null,
      current_apt_unit: data.currentAptUnit || null,
      current_city: data.currentCity || null,
      current_state: data.currentState || null,
      current_zip: data.currentZip || null,
      current_housing_situation: data.currentHousingSituation || null,
      voucher_status: data.voucherStatus || null,
      housing_authority: data.housingAuthority || null,
      voucher_bedroom_size: data.voucherBedroomSize || null,
      voucher_expiration_date: data.voucherExpirationDate || null,
      search_radius: data.searchRadius || null,
      porting: data.porting,
      port_in_housing_authority: data.portInHousingAuthority || null,
      num_adults: parseInt(data.numAdults) || 1,
      num_children: parseInt(data.numChildren) || 0,
      total_household_members: parseInt(data.totalHouseholdMembers) || 1,
      household_member_ages: data.householdMemberAges ? data.householdMemberAges.split(',').map(s => s.trim()).filter(Boolean) : [],
      requires_accessible_unit: data.requiresAccessibleUnit,
      accessibility_needs: data.accessibilityNeeds,
      desired_move_in_date: data.desiredMoveInDate || null,
      preferred_cities: data.preferredCities ? data.preferredCities.split(',').map(s => s.trim()).filter(Boolean) : [],
      preferred_zip_codes: data.preferredZipCodes ? data.preferredZipCodes.split(',').map(s => s.trim()).filter(Boolean) : [],
      max_rent: data.maxRent ? parseFloat(data.maxRent) : null,
      neighborhood_preferences: data.neighborhoodPreferences || null,
      distance_from_work: data.distanceFromWork || null,
      distance_from_transit: data.distanceFromTransit || null,
      property_type_preferences: data.propertyTypePreferences,
      min_bedrooms: data.minBedrooms ? parseInt(data.minBedrooms) : null,
      min_bathrooms: data.minBathrooms ? parseFloat(data.minBathrooms) : null,
      amenity_preferences: data.amenityPreferences,
      has_pets: data.hasPets ?? false,
      pet_types: data.hasPets ? data.petTypes : [],
      num_pets: data.hasPets ? parseInt(data.numPets) || 1 : 0,
      pet_breed: data.hasPets ? data.petBreed || null : null,
      pet_weight: data.hasPets ? data.petWeight || null : null,
      employment_status: data.employmentStatus || null,
      employer_name: data.employerName || null,
      current_landlord: data.currentLandlord || null,
      length_of_stay: data.lengthOfStay || null,
      reason_for_moving: data.reasonForMoving || null,
      owns_vehicle: data.ownsVehicle,
      num_vehicles: parseInt(data.numVehicles) || 0,
      needs_public_transit: data.needsPublicTransit,
      parking_required: data.parkingRequired,
      ok_background_check: data.okBackgroundCheck,
      ok_credit_check: data.okCreditCheck,
      previous_eviction: data.previousEviction || null,
      bio: data.bio || null,
      preferred_name: data.preferredName || null,
      secondary_phone: data.secondaryPhone || null,
      contact_preferences: data.contactPreferences,
      notification_preferences: data.notificationPreferences,
      privacy_settings: data.privacySettings,
      profile_wizard_completed: true,
      profile_wizard_steps: STEPS.map(s => s.id),
    }
  }

  function goNext() {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(i => i + 1)
      if (user) {
        supabase.from('profiles').update({ current_city: data.currentCity || null }).eq('id', user.id).then(() => {})
      }
    } else {
      finishWizard()
    }
  }

  async function finishWizard() {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update(buildFullPayload()).eq('id', user.id)
    setSaving(false)
    if (error) { toast.error('Could not save profile. Try again.'); return }
    toast.success('Profile saved!')
    navigate('/tenant')
  }

  async function skip() {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(i => i + 1)
    } else {
      if (user) await supabase.from('profiles').update({ profile_wizard_completed: true }).eq('id', user.id)
      navigate('/tenant')
    }
  }

  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100)
  const stepId = STEPS[stepIndex].id
  const isLastStep = stepIndex === STEPS.length - 1

  const inputClass = 'w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] bg-white'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5'

  function Pill({ label, active, onClick }) {
    return (
      <button type="button" onClick={onClick}
        className={`px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
          active ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B3A6B]'
        }`}>
        {label}
      </button>
    )
  }

  function Toggle({ label, description, checked, onChange }) {
    return (
      <button type="button" onClick={onChange}
        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition-all text-left ${
          checked ? 'border-[#1B3A6B] bg-blue-50' : 'border-gray-200 bg-white'
        }`}>
        <div>
          <p className={`text-sm font-medium ${checked ? 'text-[#1B3A6B]' : 'text-gray-700'}`}>{label}</p>
          {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-3 ${
          checked ? 'bg-[#1B3A6B] border-[#1B3A6B]' : 'border-gray-300'
        }`}>
          {checked && <Check className="w-3 h-3 text-white" />}
        </div>
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-5">
        <div className="flex items-center gap-3 mb-3">
          {stepIndex > 0 && (
            <button onClick={() => setStepIndex(i => i - 1)} className="text-white/70 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">
            Step {stepIndex + 1} of {STEPS.length}
          </p>
        </div>
        <h1 className="text-white text-2xl font-bold">{STEPS[stepIndex].label}</h1>
        <p className="text-blue-200 text-sm mt-1">{STEPS[stepIndex].subtitle}</p>
        <div className="mt-4 bg-white/20 rounded-full h-1.5">
          <div className="bg-[#1D9E75] h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex gap-1 mt-2">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
              i < stepIndex ? 'bg-[#1D9E75]' : i === stepIndex ? 'bg-white' : 'bg-white/20'
            }`} />
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 py-6 pb-32 max-w-lg mx-auto w-full space-y-4">

        {stepId === 'housing' && (
          <>
            <div>
              <label className={labelClass}>Street address *</label>
              <input className={inputClass} placeholder="123 Main Street" value={data.currentStreetAddress}
                onChange={e => set('currentStreetAddress', e.target.value)} autoComplete="street-address" />
            </div>
            <div>
              <label className={labelClass}>Apt / Unit <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className={inputClass} placeholder="Apt 4B" value={data.currentAptUnit}
                onChange={e => set('currentAptUnit', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>City *</label>
              <input className={inputClass} placeholder="Atlanta" value={data.currentCity}
                onChange={e => set('currentCity', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>State</label>
                <select className={inputClass} value={data.currentState} onChange={e => set('currentState', e.target.value)}>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>ZIP Code *</label>
                <input className={inputClass} placeholder="30301" value={data.currentZip}
                  onChange={e => set('currentZip', e.target.value)} maxLength={5} inputMode="numeric" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Current housing situation</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Renting',             value: 'renting' },
                  { label: 'Staying with Family', value: 'staying_with_family' },
                  { label: 'Homeless',             value: 'homeless' },
                  { label: 'Shelter',              value: 'shelter' },
                  { label: 'Hotel / Motel',        value: 'hotel' },
                  { label: 'Transitional Housing', value: 'transitional' },
                  { label: 'Other',                value: 'other' },
                ].map(opt => (
                  <Pill key={opt.value} label={opt.label} active={data.currentHousingSituation === opt.value}
                    onClick={() => set('currentHousingSituation', opt.value)} />
                ))}
              </div>
            </div>
          </>
        )}

        {stepId === 'voucher' && (
          <>
            <div>
              <label className={labelClass}>Do you have a Housing Choice Voucher (Section 8)?</label>
              <div className="flex gap-2">
                {[['Yes','yes'],['No','no'],['Pending','pending']].map(([label,val]) => (
                  <Pill key={val} label={label} active={data.voucherStatus === val} onClick={() => set('voucherStatus', val)} />
                ))}
              </div>
            </div>
            {data.voucherStatus === 'yes' && (
              <>
                <div>
                  <label className={labelClass}>Housing Authority</label>
                  <select className={inputClass} value={data.housingAuthority} onChange={e => set('housingAuthority', e.target.value)}>
                    <option value="">Select your housing authority</option>
                    {HOUSING_AUTHORITIES.map(ha => <option key={ha.value} value={ha.value}>{ha.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Voucher bedroom size</label>
                  <div className="flex flex-wrap gap-2">
                    {[['Studio','studio'],['1 BR','1br'],['2 BR','2br'],['3 BR','3br'],['4 BR','4br'],['5+ BR','5br+']].map(([label,val]) => (
                      <Pill key={val} label={label} active={data.voucherBedroomSize === val} onClick={() => set('voucherBedroomSize', val)} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Voucher expiration date</label>
                  <input type="date" className={inputClass} value={data.voucherExpirationDate}
                    onChange={e => set('voucherExpirationDate', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Search area</label>
                  <div className="flex gap-2">
                    {[['City','city'],['County','county'],['Statewide','state']].map(([label,val]) => (
                      <Pill key={val} label={label} active={data.searchRadius === val} onClick={() => set('searchRadius', val)} />
                    ))}
                  </div>
                </div>
                <Toggle label="I am porting from another housing authority" checked={data.porting} onChange={() => set('porting', !data.porting)} />
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

        {stepId === 'household' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[['numAdults','Adults','0'],['numChildren','Children','0'],['totalHouseholdMembers','Total','1']].map(([field,label,min]) => (
                <div key={field}>
                  <label className={labelClass}>{label}</label>
                  <input type="number" min={min} className={inputClass} value={data[field]} onChange={e => set(field, e.target.value)} />
                </div>
              ))}
            </div>
            <div>
              <label className={labelClass}>Ages of household members <span className="text-gray-400 font-normal">(comma-separated, optional)</span></label>
              <input className={inputClass} placeholder="35, 32, 8, 5" value={data.householdMemberAges}
                onChange={e => set('householdMemberAges', e.target.value)} />
            </div>
            <Toggle label="We require an accessible unit" description="Wheelchair ramp, elevator, etc."
              checked={data.requiresAccessibleUnit} onChange={() => set('requiresAccessibleUnit', !data.requiresAccessibleUnit)} />
            {data.requiresAccessibleUnit && (
              <div>
                <label className={labelClass}>Accessibility needs</label>
                <div className="grid grid-cols-2 gap-2">
                  {ACCESSIBILITY.map(item => (
                    <Toggle key={item} label={item} checked={data.accessibilityNeeds.includes(item)}
                      onChange={() => toggleArray('accessibilityNeeds', item)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {stepId === 'preferences' && (
          <>
            <div>
              <label className={labelClass}>Desired move-in date</label>
              <input type="date" className={inputClass} value={data.desiredMoveInDate}
                min={new Date().toISOString().split('T')[0]} onChange={e => set('desiredMoveInDate', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Preferred cities <span className="text-gray-400 font-normal">(comma-separated)</span></label>
              <input className={inputClass} placeholder="Atlanta, Decatur, College Park"
                value={data.preferredCities} onChange={e => set('preferredCities', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Preferred ZIP codes <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className={inputClass} placeholder="30301, 30318, 30349"
                value={data.preferredZipCodes} onChange={e => set('preferredZipCodes', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Maximum rent <span className="text-gray-400 font-normal">(optional)</span></label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-400 text-sm">$</span>
                <input type="number" className={`${inputClass} pl-8`} placeholder="1400"
                  value={data.maxRent} onChange={e => set('maxRent', e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Neighborhood preferences <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className={inputClass} placeholder="Near schools, quiet area, close to transit..."
                value={data.neighborhoodPreferences} onChange={e => set('neighborhoodPreferences', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Max from work</label>
                <select className={inputClass} value={data.distanceFromWork} onChange={e => set('distanceFromWork', e.target.value)}>
                  <option value="">Any</option>
                  {['5 min','10 min','15 min','20 min','30 min','45 min','1 hr+'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Max from transit</label>
                <select className={inputClass} value={data.distanceFromTransit} onChange={e => set('distanceFromTransit', e.target.value)}>
                  <option value="">Any</option>
                  {['Walking','5 min','10 min','15 min','20 min+'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          </>
        )}

        {stepId === 'property' && (
          <>
            <div>
              <label className={labelClass}>Property types <span className="text-gray-400 font-normal">(select all that work)</span></label>
              <div className="grid grid-cols-2 gap-2">
                {PROPERTY_TYPES.map(({ value, label }) => (
                  <Pill key={value} label={label} active={data.propertyTypePreferences.includes(value)}
                    onClick={() => toggleArray('propertyTypePreferences', value)} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Min bedrooms</label>
                <select className={inputClass} value={data.minBedrooms} onChange={e => set('minBedrooms', e.target.value)}>
                  <option value="">Any</option>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Min bathrooms</label>
                <select className={inputClass} value={data.minBathrooms} onChange={e => set('minBathrooms', e.target.value)}>
                  <option value="">Any</option>
                  {[1,1.5,2,2.5,3].map(n => <option key={n} value={n}>{n}+</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Amenities I want</label>
              <div className="grid grid-cols-2 gap-2">
                {AMENITIES.map(item => (
                  <Toggle key={item} label={item} checked={data.amenityPreferences.includes(item)}
                    onChange={() => toggleArray('amenityPreferences', item)} />
                ))}
              </div>
            </div>
          </>
        )}

        {stepId === 'pets' && (
          <>
            <div>
              <label className={labelClass}>Do you have pets?</label>
              <div className="flex gap-2">
                <Pill label="Yes, I have pets" active={data.hasPets === true} onClick={() => set('hasPets', true)} />
                <Pill label="No pets" active={data.hasPets === false} onClick={() => set('hasPets', false)} />
              </div>
            </div>
            {data.hasPets === true && (
              <>
                <div>
                  <label className={labelClass}>Type of pet(s)</label>
                  <div className="flex gap-2 flex-wrap">
                    {[['Dog','dog'],['Cat','cat'],['Other','other']].map(([label,val]) => (
                      <Pill key={val} label={label} active={data.petTypes.includes(val)} onClick={() => toggleArray('petTypes', val)} />
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
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-amber-800 font-medium">Always disclose pets honestly. Misrepresenting pets on an application can jeopardize your voucher.</p>
                </div>
              </>
            )}
          </>
        )}

        {stepId === 'employment' && (
          <>
            <div>
              <label className={labelClass}>Employment status</label>
              <div className="grid grid-cols-2 gap-2">
                {[['Full-Time','full_time'],['Part-Time','part_time'],['Self-Employed','self_employed'],['Disabled','disabled'],['Retired','retired'],['Unemployed','unemployed']].map(([label,val]) => (
                  <Pill key={val} label={label} active={data.employmentStatus === val} onClick={() => set('employmentStatus', val)} />
                ))}
              </div>
            </div>
            {['full_time','part_time','self_employed'].includes(data.employmentStatus) && (
              <div>
                <label className={labelClass}>Employer <span className="text-gray-400 font-normal">(optional)</span></label>
                <input className={inputClass} placeholder="Company name" value={data.employerName}
                  onChange={e => set('employerName', e.target.value)} />
              </div>
            )}
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Rental History</p>
              <div>
                <label className={labelClass}>Current landlord <span className="text-gray-400 font-normal">(optional)</span></label>
                <input className={inputClass} placeholder="Name or company" value={data.currentLandlord}
                  onChange={e => set('currentLandlord', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>How long at current address?</label>
                <select className={inputClass} value={data.lengthOfStay} onChange={e => set('lengthOfStay', e.target.value)}>
                  <option value="">Select</option>
                  {['Less than 6 months','6-12 months','1-2 years','2-5 years','5+ years'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Reason for moving</label>
                <input className={inputClass} placeholder="e.g. Looking for a larger unit" value={data.reasonForMoving}
                  onChange={e => set('reasonForMoving', e.target.value)} />
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Transportation</p>
              <Toggle label="I own a vehicle" checked={data.ownsVehicle} onChange={() => set('ownsVehicle', !data.ownsVehicle)} />
              {data.ownsVehicle && (
                <div>
                  <label className={labelClass}>Number of vehicles</label>
                  <input type="number" min="1" className={inputClass} value={data.numVehicles}
                    onChange={e => set('numVehicles', e.target.value)} />
                </div>
              )}
              <Toggle label="I need MARTA / public transit access" checked={data.needsPublicTransit}
                onChange={() => set('needsPublicTransit', !data.needsPublicTransit)} />
              <Toggle label="Parking is required" checked={data.parkingRequired}
                onChange={() => set('parkingRequired', !data.parkingRequired)} />
            </div>
          </>
        )}

        {stepId === 'screening' && (
          <>
            <p className="text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              Answering these questions upfront helps you match with landlords who are the right fit.
            </p>
            <div>
              <label className={labelClass}>Are you comfortable with a background check?</label>
              <div className="flex gap-2">
                <Pill label="Yes" active={data.okBackgroundCheck === true} onClick={() => set('okBackgroundCheck', true)} />
                <Pill label="No" active={data.okBackgroundCheck === false} onClick={() => set('okBackgroundCheck', false)} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Are you comfortable with a credit check?</label>
              <div className="flex gap-2">
                <Pill label="Yes" active={data.okCreditCheck === true} onClick={() => set('okCreditCheck', true)} />
                <Pill label="No" active={data.okCreditCheck === false} onClick={() => set('okCreditCheck', false)} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Do you have a previous eviction on record?</label>
              <div className="flex flex-wrap gap-2">
                {[['Yes','yes'],['No','no'],['Prefer to Discuss','prefer_to_discuss']].map(([label,val]) => (
                  <Pill key={val} label={label} active={data.previousEviction === val} onClick={() => set('previousEviction', val)} />
                ))}
              </div>
            </div>
          </>
        )}

        {stepId === 'about' && (
          <>
            <div>
              <label className={labelClass}>Preferred name <span className="text-gray-400 font-normal">(what should landlords call you?)</span></label>
              <input className={inputClass} placeholder="e.g. Mike or Ms. Johnson" value={data.preferredName}
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
                placeholder="Introduce yourself. Tell landlords about your household, rental history, and what you are looking for in a home..."
                value={data.bio} onChange={e => set('bio', e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">{data.bio.length}/500 characters</p>
            </div>
          </>
        )}

        {stepId === 'settings' && (
          <>
            <div>
              <label className={labelClass}>How should landlords contact you?</label>
              <div className="flex flex-wrap gap-2">
                {[['Phone','phone'],['Text','text'],['Email','email'],['In-App','in-app']].map(([label,val]) => (
                  <Pill key={val} label={label} active={data.contactPreferences.includes(val)}
                    onClick={() => toggleArray('contactPreferences', val)} />
                ))}
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Notify me when</p>
              <div className="space-y-2">
                {[
                  ['new_matches','New listings match my voucher'],
                  ['landlord_message','A landlord messages me'],
                  ['profile_viewed','A landlord views my profile'],
                  ['favorite_available','A favorited property becomes available'],
                  ['voucher_expiry','My voucher expiration is approaching'],
                ].map(([key,label]) => (
                  <Toggle key={key} label={label} checked={data.notificationPreferences[key]}
                    onChange={() => toggleNested('notificationPreferences', key)} />
                ))}
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Landlords can see my</p>
              <div className="space-y-2">
                {[
                  ['show_full_name','Full name'],
                  ['show_phone','Phone number'],
                  ['show_email','Email address'],
                  ['show_photo','Profile photo'],
                  ['show_voucher_status','Voucher status'],
                  ['show_household_size','Household size'],
                  ['show_preferred_areas','Preferred neighborhoods'],
                ].map(([key,label]) => (
                  <Toggle key={key} label={label} checked={data.privacySettings[key]}
                    onChange={() => toggleNested('privacySettings', key)} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 z-50">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={goNext} disabled={saving}
            className="flex-1 bg-[#1D9E75] text-white rounded-xl py-4 text-base font-bold disabled:opacity-50 shadow-lg shadow-[#1D9E75]/20 active:scale-[0.98] transition-transform">
            {saving ? 'Saving...' : isLastStep ? 'Finish & Save Profile' : 'Next ->'}
          </button>
          <button onClick={skip} className="text-sm text-gray-400 whitespace-nowrap px-2">Skip</button>
        </div>
      </div>
    </div>
  )
}
