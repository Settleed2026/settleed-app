import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ role }) {
  const { user, role: userRole, loading } = useAuth()

  if (loading) return null

  if (!user) return <Navigate to="/login" replace />

  if (role && userRole !== role) {
    return <Navigate to={userRole === 'landlord' ? '/landlord' : '/tenant'} replace />
  }

  return <Outlet />
}
