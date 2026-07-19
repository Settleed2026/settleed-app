// Re-export from AuthContext so all components share one auth state instance.
// Previously each useAuth() call created its own Supabase listener, causing
// ProtectedRoute to start at loading:true and show a blank page on every navigation.
export { useAuth } from '../contexts/AuthContext'
