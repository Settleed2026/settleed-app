import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Building2, CheckCircle, AlertCircle, ArrowRight, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ConnectOnboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returned = searchParams.get('returned') // set when Stripe redirects back
  const refresh = searchParams.get('refresh')   // set when user needs to restart

  const [status, setStatus] = useState(null) // null | 'not_started' | 'pending' | 'complete'
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    loadStatus()
  }, [user?.id])

  // When Stripe redirects back, re-check status via the edge function
  useEffect(() => {
    if (returned && user?.id) {
      verifyOnboarding()
    }
  }, [returned, user?.id])

  async function loadStatus() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('connect_onboarding_status')
      .eq('id', user.id)
      .single()
    setStatus(data?.connect_onboarding_status ?? 'not_started')
    setLoading(false)
  }

  async function verifyOnboarding() {
    // Re-call the edge function — it checks details_submitted and updates DB
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-connect-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            return_url: `${window.location.origin}/landlord/connect?returned=1`,
            refresh_url: `${window.location.origin}/landlord/connect?refresh=1`,
          }),
        }
      )
      const data = await res.json()
      if (data.alreadyComplete) {
        setStatus('complete')
        toast.success('Bank account connected!')
      } else {
        await loadStatus()
      }
    } catch {
      await loadStatus()
    }
  }

  async function handleConnect() {
    if (!user) return
    setConnecting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-connect-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            return_url: `${window.location.origin}/landlord/connect?returned=1`,
            refresh_url: `${window.location.origin}/landlord/connect?refresh=1`,
          }),
        }
      )
      const { url, error, alreadyComplete } = await res.json()
      if (error) throw new Error(error)
      if (alreadyComplete) { setStatus('complete'); return }
      window.location.href = url
    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.')
      setConnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/landlord')}
          className="text-sm text-gray-500 flex items-center gap-1 mb-8"
        >
          ← Back to dashboard
        </button>

        {status === 'complete' ? (
          // Success state
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-[#1D9E75]" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">You're all set to get paid</h1>
            <p className="text-gray-500 text-sm mb-6">
              Your bank account is connected. Once tenants pay rent through Settleed, funds will be deposited directly to your account.
            </p>
            <button
              onClick={() => navigate('/landlord')}
              className="w-full bg-[#1B3A6B] text-white rounded-xl py-3 text-sm font-semibold"
            >
              Go to dashboard
            </button>
          </div>
        ) : (
          // Connect state
          <div>
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-[#1B3A6B]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-7 h-7 text-[#1B3A6B]" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Connect your bank account</h1>
              <p className="text-gray-500 text-sm">
                Set up payouts so Settleed can deposit rent payments directly to your bank.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-4">
              {[
                { icon: '🏦', title: 'Direct deposits', desc: 'Rent payments go straight to your bank account' },
                { icon: '🔒', title: 'Bank-level security', desc: 'Powered by Stripe — used by millions of businesses' },
                { icon: '⚡', title: 'Fast payouts', desc: 'Typically 2 business days after tenant payment' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{item.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                    <div className="text-xs text-gray-500">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {status === 'pending' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start gap-3">
                <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  Your bank account setup is incomplete. Click below to finish connecting.
                </p>
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full bg-[#1B3A6B] text-white rounded-xl py-4 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {connecting ? (
                <><Loader size={16} className="animate-spin" /> Connecting...</>
              ) : (
                <>{status === 'pending' ? 'Finish setup' : 'Connect bank account'} <ArrowRight size={16} /></>
              )}
            </button>

            <p className="text-center text-xs text-gray-400 mt-4">
              You'll be redirected to Stripe's secure onboarding — takes about 2 minutes.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
