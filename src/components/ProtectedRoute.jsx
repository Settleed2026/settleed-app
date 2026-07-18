import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import BottomNav from './BottomNav'

const NO_NAV_PATHS = ['/tenant/profile/setup']

export default function ProtectedRoute({ role }) {
  const { user, role: userRole, loading } = useAuth()
  const location = useLocation()
  const hideNav = NO_NAV_PATHS.some(p => location.pathname.startsWith(p))

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

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
      {!hideNav && <BottomNav role={userRole} />}
    </>
  )
}
