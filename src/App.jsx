import { Routes, Route } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

// Auth pages
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import ForgotPassword from './pages/auth/ForgotPassword'

// Legal pages
import Terms from './pages/legal/Terms'
import Privacy from './pages/legal/Privacy'

// Landlord pages
import LandlordDashboard from './pages/landlord/Dashboard'
import ListingForm from './pages/landlord/ListingForm'
import ApplicationInbox from './pages/landlord/ApplicationInbox'
import HQSTracker from './pages/landlord/HQSTracker'
import LandlordProfile from './pages/landlord/Profile'

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
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />

      {/* Landlord routes */}
      <Route path="/landlord" element={<ProtectedRoute role="landlord" />}>
        <Route index element={<LandlordDashboard />} />
        <Route path="listing/new" element={<ListingForm />} />
        <Route path="listing/:id/edit" element={<ListingForm />} />
        <Route path="applications" element={<ApplicationInbox />} />
        <Route path="hqs" element={<HQSTracker />} />
        <Route path="profile" element={<LandlordProfile />} />
      </Route>

      {/* Tenant routes */}
      <Route path="/tenant" element={<ProtectedRoute role="tenant" />}>
        <Route index element={<TenantDashboard />} />
        <Route path="search" element={<SearchListings />} />
        <Route path="listing/:id" element={<ListingDetail />} />
        <Route path="apply/:id" element={<ApplicationForm />} />
        <Route path="applications"