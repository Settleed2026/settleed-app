import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [role, setRole]     = useState(null)
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

    const metaRole = user.user_metadata?.role
    if (metaRole) {
      setRole(metaRole)
      setLoading(false)
      return
    }

    // Retry once after 1s (handles slow trigger)
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

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
