import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [fromSignup, setFromSignup] = useState(false)

  useEffect(() => {
    const paramEmail = searchParams.get('email')
    if (paramEmail) {
      setEmail(decodeURIComponent(paramEmail))
      setFromSignup(true)
    }
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    // Fetch role and redirect — fall back to user_metadata if profile query fails
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    const role = profile?.role || data.user.user_metadata?.role || 'tenant'
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

      {/* Form */}
      <div className="flex-1 flex flex-col justify-center px-4 py-10 max-w-sm mx-auto w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
        {fromSignup ? (
          <p className="text-sm mb-8 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800">
            An account with that email already exists. Sign in below.
          </p>
        ) : (
          <p className="text-gray-500 text-sm mb-8">Sign in to your account</p>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
              placeholder="••••••••"
            />
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-[#1D9E75] hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1B3A6B] text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#1D9E75] font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
