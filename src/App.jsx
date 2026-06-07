import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

// Auth pages
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'

// Landlord pages
import LandlordDashboard from './pages/landlord/Dashboard'
import ListingForm from './pages/landlord/ListingForm'
import ApplicationInbox from './pages/landlord/ApplicationInbox'
import HQSTracker from './pages/landlord/HQSTracker'

// Tenant pages
import TenantDashboard from './pages/tenant/Dashboard'
import SearchListings from './pages/tenant/SearchListings'
import ListingDetail from './pages/tenant/ListingDetail'
import ApplicationForm from './pages/tenant/ApplicationForm'

// Shared
import Landing from './pages/Landing'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-navy-DEFAULT border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Landlord routes */}
      <Route path="/landlord" element={<ProtectedRoute role="landlord" />}>
        <Route index element={<LandlordDashboard />} />
        <Route path="listing/new" element={<ListingForm />} />
        <Route path="listing/:id/edit" element={<ListingForm />} />
        <Route path="applications" element={<ApplicationInbox />} />
        <Route path="hqs" element={<HQSTracker />} />
      </Route>

      {/* Tenant routes */}
      <Route path="/tenant" element={<ProtectedRoute role="tenant" />}>
        <Route index element={<TenantDashboard />} />
        <Route path="search" element={<SearchListings />} />
        <Route path="listing/:id" element={<ListingDetail />} />
        <Route path="apply/:id" element={<ApplicationForm />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
