import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useSubscription() {
  const { user } = useAuth()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    async function fetch() {
      const { data } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single()
      setStatus(data?.subscription_status || null)
      setLoading(false)
    }

    fetch()

    // Refresh on focus (e.g. after returning from Stripe Checkout)
    const onFocus = () => fetch()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [user])

  const isActive = status === 'active' || status === 'trialing'

  return { status, isActive, loading }
}
