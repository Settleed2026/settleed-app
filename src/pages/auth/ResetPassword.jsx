import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { ChevronLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)
  const [tokenError, setTokenError] = useState(false)
  const resolvedRef = useRef(false)

  useEffect(() => {
    let authSub = null

    function markReady() {
      if (resolvedRef.current) return
      resolvedRef.current = true
      setReady(true)
    }

    function markError() {
      if (resolvedRef.current) return
      resolvedRef.current = true
      setTokenError(true)
    }

    async function init() {
      // ── Path A: PKCE flow ──────────────────────────────────────────────
      // Supabase sends ?code= when flowType is 'pkce' (same-device only)
      const searchParams = new URLSearchParams(window.location.search)
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) markError()
        else markReady()
        return
      }

      // ── Path B: Implicit flow ─────────────────────────────────────────
      // Supabase sends #access_token=...&type=recovery in the URL hash.
      // The Supabase client auto-parses this hash on init and fires
      // PASSWORD_RECOVERY via onAuthStateChange. The event may fire before
      // this component mounts, so we (1) register the listener first,
      // then (2) check if a session already exists.

      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session) markReady()
      })
      authSub = data.subscription

      // Check if Supabase already processed the hash before we got here
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { markReady(); return }

      // If there's no hash and no code, the link has nothing — show expired
      if (!window.location.hash && !window.location.search) {
        markError()
        return
      }

      // Hash is present but session not established yet — wait up to 8 seconds
      setTimeout(markError, 8000)
    }

    init()
    return () => authSub?.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) { toast.error('Passwords do not match.'); return }
    if (password.length < 8) { toast.error('Password must be at least 8 characters.'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { toast.error(error.message); setLoading(false); return }

    setDone(true)
    setLoading(false)
    await supabase.auth.signOut()
    setTimeout(() => navigate('/login'), 2500)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-[#1B3A6B] px-4 py-5 flex items-center gap-3">
        <Link to="/login" className="text-white"><ChevronLeft className="w-5 h-5" /></Link>
        <span className="text-white text-2xl font-bold tracking-tight">Settleed</span>
      </div>

      <div className="flex-1 flex flex-col justify-center px-4 py-10 max-w-sm mx-auto w-full">

        {done && (
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 text-[#1D9E75] mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Password updated!</h1>
            <p className="text-gray-500 text-sm">Redirecting you to sign in…</p>
          </div>
        )}

        {!done && tokenError && (
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Link expired</h1>
            <p className="text-gray-500 text-sm mb-6">
              Reset links expire after 1 hour and can only be used once. Request a fresh one.
            </p>
            <Link to="/forgot-password"
              className="inline-block bg-[#1B3A6B] text-white rounded-lg px-6 py-3 text-sm font-semibold">
              Send a new link
            </Link>
          </div>
        )}

        {!done && !tokenError && !ready && (
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Verifying your reset link…</p>
          </div>
        )}

        {!done && !tokenError && ready && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Create new password</h1>
            <p className="text-gray-500 text-sm mb-8">Must be at least 8 characters.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" tabIndex={-1}>
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                <input type={showPw ? 'text' : 'password'} required value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  placeholder="••••••••" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-[#1B3A6B] text-white rounded-lg py-3 text-sm font-semibold disabled:opacity-50 mt-2">
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
