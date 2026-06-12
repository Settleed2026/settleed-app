import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { ChevronLeft, CheckCircle2 } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-[#1B3A6B] px-4 py-5 flex items-center gap-3">
        <Link to="/login" className="text-white"><ChevronLeft className="w-5 h-5" /></Link>
        <span className="text-white text-2xl font-bold tracking-tight">Settleed</span>
      </div>

      <div className="flex-1 flex flex-col justify-center px-4 py-10 max-w-sm mx-auto w-full">
        {sent ? (
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 text-[#1D9E75] mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
            <p className="text-gray-500 text-sm mb-6">
              We sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the link.
            </p>
            <Link to="/login" className="text-[#1D9E75] font-medium text-sm">Back to login</Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Reset password</h1>
            <p className="text-gray-500 text-sm mb-8">
              Enter your email and we'll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  placeholder="you@example.com" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-[#1B3A6B] text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50">
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-6">
              Remember your password?{' '}
              <Link to="/login" className="text-[#1D9E75] font-medium">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
