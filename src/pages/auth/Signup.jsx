import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function Signup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // step 1: role, step 2: details
  const [role, setRole] = useState('')
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    ha: '',
  })
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)

    // Create auth user
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName, role }
      }
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    const userId = data.user.id

    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      role,
      full_name: form.fullName,
      email: form.email,
      phone: form.phone,
      ha: form.ha || null,
      market: 'atlanta',
    })

    if (profileError) {
      toast.error('Account created but profile setup failed. Please contact support.')
      setLoading(false)
      return
    }

    // Create role-specific profile
    if (role === 'landlord') {
      await supabase.from('landlord_profiles').insert({ id: userId })
    } else {
      await supabase.from('tenant_profiles').insert({ id: userId })
    }

    toast.success('Account created! Welcome to Settleed.')
    navigate(role === 'landlord' ? '/landlord' : '/tenant')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 py-5">
        <Link to="/" className="text-white text-2xl font-bold tracking-tight">
          Settleed
        </Link>
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
            <button
              onClick={() => setStep(1)}
              className="text-sm text-gray-500 mb-6 flex items-center gap-1"
            >
              ← Back
            </button>

            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {role === 'landlord' ? 'Landlord account' : 'Voucher holder account'}
            </h1>
            <p className="text-gray-500 text-sm mb-8">Create your account</p>

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                <input
                  name="fullName"
                  type="text"
                  required
                  value={form.fullName}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  placeholder="(404) 555-0100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Housing Authority</label>
                <select
                  name="ha"
                  value={form.ha}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] bg-white"
                >
                  <option value="">Select your housing authority</option>
                  <option value="AHA">Atlanta Housing Authority (AHA)</option>
                  <option value="DCA">Georgia DCA</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  placeholder="At least 8 characters"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1B3A6B] text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50 mt-2"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                By signing up you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
