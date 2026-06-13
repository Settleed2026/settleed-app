import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchRole(session.user)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchRole(session.user)
      } else {
        setRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchRole(user) {
    // First try the profiles table
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

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
    setTimeout(async () => {
      const { data: retryData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      setRole(retryData?.role ?? null)
      setLoading(false)
    }, 1000)
  }

  return { user, role, loading }
}
