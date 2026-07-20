import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { HOUSING_AUTHORITIES } from '../../lib/paymentStandards'
import toast from 'react-hot-toast'

export default function Signup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(1) // 1 = role picker, 2 = details
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, role: userRole, loading: authLoading } = useAuth()

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    mobilePhone: '',
    officePhone: '',
    preferredContact: 'email',
    bestTimeToContact: '',
    ha: '',
    dateOfBirth: '',
    password: '',
  })

  // (logged-in users are handled by an early return below — no silent redirect)

  // Pre-select role from URL param (?role=landlord or ?role=tenant)
  useEffect(() => {
    const paramRole = searchParams.get('role')
    if (paramRole === 'landlord' || paramRole === 'tenant') {
      setRole(paramRole)
      setStep(2)
    }
  }, [])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)

    const fullName = `${form.firstName} ${form.lastName}`.trim()

    // 18+ age check for tenants
    if (role === 'tenant' && form.dateOfBirth) {
      const dob = new Date(form.dateOfBirth)
      const age = Math.floor((Date.now() - dob) / (365.25 * 24 * 60 * 60 * 1000))
      if (age < 18) {
        toast.error('You must be 18 or older to create an account.')
        setLoading(false)
        return
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: fullName,
          first_name: form.firstName,
          last_name: form.lastName,
          role,
          phone: form.mobilePhone,
          company_name: form.companyName || null,
          housing_authority: form.ha || null,
        }
      }
    })

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        toast.error('An account with this email already exists.')
        setLoading(false)
        navigate(`/login?email=${encodeURIComponent(form.email)}`)
        return
      }
      toast.error(error.message)
      setLoading(false)
      return
    }

    // Fire-and-forget profile update — trigger already created the row
    const profileUpdate = {
      full_name: fullName,
      first_name: form.firstName,
      last_name: form.lastName,
      phone: form.mobilePhone || null,
      housing_authority: form.ha || null,
    }
    if (role === 'landlord') {
      Object.assign(profileUpdate, {
        office_phone: form.officePhone || null,
        company_name: form.companyName || null,
        preferred_contact: form.preferredContact || null,
        best_time_to_contact: form.bestTimeToContact || null,
      })
    }
    if (role === 'tenant' && form.dateOfBirth) {
      profileUpdate.date_of_birth = form.dateOfBirth
    }

    supabase.from('profiles').update(profileUpdate)
      .eq('id', data.user.id)
      .then(({ error }) => { if (error) console.warn('Profile update:', error.message) })

    toast.success('Account created! Welcome to Settleed.')
    navigate(role === 'landlord' ? '/landlord/listing/new' : '/tenant/profile/setup')
  }

  const inputClass = 'w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  // Already logged in — show options instead of silently redirecting
  if (!authLoading && user && userRole) {
    const dashPath = userRole === 'landlord' ? '/landlord' : '/tenant'
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="bg-[#1B3A6B] px-4 py-5">
          <Link to="/" className="text-white text-2xl font-bold tracking-tight">Settleed</Link>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center px-4 py-16 text-center max-w-sm mx-auto w-full">
          <div className="w-16 h-16 rounded-full bg-[#EEF5FF] flex items-center justify-center mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1B3A6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You're already signed in</h2>
          <p className="text-gray-500 text-sm mb-8">
            You're logged in as <span className="font-medium text-gray-700">{user.email}</span>.
            Go to your dashboard or sign out to create a new account.
          </p>
          <Link
            to={dashPath}
            className="w-full bg-[#1B3A6B] text-white rounded-lg py-3 text-sm font-semibold mb-3 block text-center"
          >
            Go to My Dashboard
          </Link>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate('/signup') }}
            className="w-full border border-gray-300 text-gray-700 rounded-lg py-3 text-sm font-semibold hover:bg-gray-50"
          >
            Sign out &amp; create new account
          </button>
          <Link to="/" className="mt-6 text-xs text-gray-400 hover:text-gray-600">← Back to home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 py-5">
        <Link to="/" className="text-white text-2xl font-bold tracking-tight">Settleed</Link>
      </div>

      <div className="flex-1 flex flex-col justify-center px-4 py-10 max-w-sm mx-auto w-full">

        {/* Step 1: Choose role */}
        {step === 1 && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Join Settleed</h1>
            <p className="text-gray-500 text-sm mb-8">Who are you signing up as?</p>
            <div className="space-y-3">
              <button
                onClick={() => { setRole('landlord'); setStep(2) }}
                className="w-full border-2 border-gray-200 rounded-xl p-4 text-left hover:border-[#1B3A6B] transition-colors"
              >
                <div className="font-semibold text-gray-900 text-sm">I'm a Landlord</div>
                <div className="text-gray-500 text-xs mt-0.5">List properties and find verified Section 8 tenants</div>
              </button>
              <button
                onClick={() => { setRole('tenant'); setStep(2) }}
                className="w-full border-2 border-gray-200 rounded-xl p-4 text-left hover:border-[#1D9E75] transition-colors"
              >
                <div className="font-semibold text-gray-900 text-sm">I'm a Voucher Holder</div>
                <div className="text-gray-500 text-xs mt-0.5">Search verified listings and apply with your voucher</div>
              </button>
            </div>
            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-[#1D9E75] font-medium">Sign in</Link>
            </p>
          </>
        )}

        {/* Step 2: Account details */}
        {step === 2 && (
          <>
            <button onClick={() => setStep(1)} className="text-sm text-gray-500 mb-6 flex items-center gap-1">
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {role === 'landlord' ? 'Landlord account' : 'Voucher holder account'}
            </h1>
            <p className="text-gray-500 text-sm mb-6">Create your free account</p>

            <form onSubmit={handleSignup} className="space-y-4" autoComplete="off">

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>First name *</label>
                  <input name="firstName" type="text" required value={form.firstName} onChange={handleChange}
                    className={inputClass} placeholder="John" />
                </div>
                <div>
                  <label className={labelClass}>Last name *</label>
                  <input name="lastName" type="text" required value={form.lastName} onChange={handleChange}
                    className={inputClass} placeholder="Smith" />
                </div>
              </div>

              {/* Company (landlords only) */}
              {role === 'landlord' && (
                <div>
                  <label className={labelClass}>Company name <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input name="companyName" type="text" value={form.companyName} onChange={handleChange}
                    className={inputClass} placeholder="Smith Properties LLC" />
                </div>
              )}

              {/* Email */}
              <div>
                <label className={labelClass}>Email address *</label>
                <input name="email" type="email" required value={form.email} onChange={handleChange}
                  className={inputClass} placeholder="you@example.com" autoComplete="username" />
              </div>

              {/* Mobile Phone */}
              <div>
                <label className={labelClass}>Mobile phone *</label>
                <input name="mobilePhone" type="tel" required value={form.mobilePhone} onChange={handleChange}
                  className={inputClass} placeholder="(404) 555-0100" />
              </div>

              {/* Office Phone (landlords only) */}
              {role === 'landlord' && (
                <div>
                  <label className={labelClass}>Office phone <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input name="officePhone" type="tel" value={form.officePhone} onChange={handleChange}
                    className={inputClass} placeholder="(404) 555-0200" />
                </div>
              )}

              {/* Preferred Contact Method (landlords only) */}
              {role === 'landlord' && (
                <div>
                  <label className={labelClass}>Preferred contact method</label>
                  <div className="flex gap-2">
                    {['phone', 'text', 'email'].map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, preferredContact: method }))}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors capitalize ${
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
              )}

              {/* Best Time to Contact (landlords only) */}
              {role === 'landlord' && (
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
              )}

              {/* Tenant-only fields */}
              {role === 'tenant' && (
                <>
                  <div>
                    <label className={labelClass}>Date of birth * <span className="text-gray-400 font-normal">(must be 18+)</span></label>
                    <input name="dateOfBirth" type="date" required value={form.dateOfBirth} onChange={handleChange}
                      className={inputClass} max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <label className={labelClass}>Housing Authority <span className="text-gray-400 font-normal">(optional)</span></label>
                    <select name="ha" value={form.ha} onChange={handleChange}
                      className={`${inputClass} bg-white`}>
                      <option value="">Select your housing authority</option>
                      {HOUSING_AUTHORITIES.map(ha => (
                        <option key={ha.value} value={ha.value}>{ha.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Password */}
              <div>
                <label className={labelClass}>Password *</label>
                <input name="password" type="password" required minLength={8} value={form.password}
                  onChange={handleChange} className={inputClass} placeholder="At least 8 characters" autoComplete="new-password" />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1B3A6B] text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50 mt-2"
              >
                {loading ? 'Creating account...' : role === 'landlord' ? 'Create account & list property' : 'Create account →'}
              </button>

              {role === 'landlord' && (
                <p className="text-xs text-gray-500 text-center">
                  You can list your property now or save a draft and return later.
                </p>
              )}

              <p className="text-xs text-gray-400 text-center">
                By signing up you agree to our{' '}
                <Link to="/terms" className="underline hover:text-gray-600">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
              </p>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="text-[#1D9E75] font-medium">Sign in</Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
