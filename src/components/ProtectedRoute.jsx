import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import BottomNav from './BottomNav'

export default function ProtectedRoute({ role }) {
  const { user, role: userRole, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  // Still fetching role — wait before redirecting
  if (!userRole) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (role && userRole !== role) {
    return <Navigate to={userRole === 'landlord' ? '/landlord' : '/tenant'} replace />
  }

  return (
    <>
      <Outlet />
      <BottomNav role={userRole} />
    </>
  )
}
