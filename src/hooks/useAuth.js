import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const retryTimerRef = useRef(null)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchRole(session.user, mounted)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchRole(session.user, mounted)
      } else {
        setRole(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      subscription.unsubscribe()
    }
  }, [])

  async function fetchRole(user, mounted = true) {
    // First try the profiles table
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!mounted) return

    if (data?.role) {
      setRole(data.role)
      setLoading(false)
      return
    }

    // Profile trigger may not have fired yet — fall back to auth metadata
    const metaRole = user.user_metadata?.role
    if (metaRole) {
      setRole(metaRole)
      setLoading(false)
      return
    }

    // Last resort: retry once after 1s (handles slow trigger)
    retryTimerRef.current = setTimeout(async () => {
      if (!mounted) return
      const { data: retryData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (!mounted) return
      setRole(retryData?.role ?? null)
      setLoading(false)
    }, 1000)
  }

  return { user, role, loading }
}
