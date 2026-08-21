import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { supabase } from './lib/supabase'

function PageViewLogger({ userId }) {
  const location = useLocation()
  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return
    let sid = sessionStorage.getItem('_settleed_sid')
    if (!sid) {
      sid = crypto.randomUUID()
      sessionStorage.setItem('_settleed_sid', sid)
    }
    const ua = navigator.userAgent
    const device = /Mobi|Android/i.test(ua) ? 'mobile' : /Tablet|iPad/i.test(ua) ? 'tablet' : 'desktop'
    const browser = /Edg/i.test(ua) ? 'edge'
      : /Chrome/i.test(ua) ? 'chrome'
      : /Firefox/i.test(ua) ? 'firefox'
      : /Safari/i.test(ua) ? 'safari'
      : 'other'
    supabase.from('page_views').insert({
      session_id: sid,
      page:       location.pathname,
      referrer:   document.referrer || null,
      user_agent: ua,
      device,
      browser,
      user_id:    userId || null,
    }).then(() => {})
  }, [location.pathname])
  return null
}

// Auth pages
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

// Legal pages
import Terms from './pages/legal/Terms'
import Privacy from './pages/legal/Privacy'

// Landlord pages
import LandlordDashboard from './pages/landlord/Dashboard'
import ListingForm from './pages/landlord/ListingForm'
import ApplicationInbox from './pages/landlord/ApplicationInbox'
import HQSTracker from './pages/landlord/HQSTracker'
import LandlordProfile from './pages/landlord/Profile'
import ConnectOnboarding from './pages/landlord/ConnectOnboarding'
import LandlordMaintenance from './pages/landlord/Maintenance'
import LandlordRentDashboard from './pages/landlord/RentDashboard'
import LandlordBackgroundChecks from './pages/landlord/BackgroundChecks'
import RFTATracker from './pages/landlord/RFTATracker'

// Tenant pages
import TenantDashboard from './pages/tenant/Dashboard'
import SearchListings from './pages/tenant/SearchListings'
import ListingDetail from './pages/tenant/ListingDetail'
import ApplicationForm from './pages/tenant/ApplicationForm'
import TenantProfileSetup from './pages/tenant/ProfileSetup'
import ApplicationsList from './pages/tenant/ApplicationsList'
import TenantMaintenance from './pages/tenant/Maintenance'
import TenantRentPayment from './pages/tenant/RentPayment'
import TenantProfile from './pages/tenant/Profile'
import TenantLeaseDetails from './pages/tenant/LeaseDetails'

// Tools (public)
import RentAnalyzer from './pages/tools/RentAnalyzer'
import VoucherEstimator from './pages/tools/VoucherEstimator'

// Layer 2-5 pages
import Services from './pages/Services'
import AITools from './pages/AITools'
import TenantServices from './pages/tenant/TenantServices'
import Messages from './pages/Messages'

// Admin pages
import AdminQueue from './pages/admin/AdminQueue'

// Shared
import Landing from './pages/Landing'
import PublicListings from './pages/PublicListings'
import ForLandlords from './pages/ForLandlords'
import ForAgencies from './pages/ForAgencies'
import Subscribe from './pages/Subscribe'
import SubscribeSuccess from './pages/SubscribeSuccess'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  const { loading, user } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <PageViewLogger userId={user?.id} />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-[#1B3A6B] focus:font-semibold focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        Skip to content
      </a>
      <main id="main-content">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/subscribe" element={<Subscribe />} />
          <Route path="/subscribe/success" element={<SubscribeSuccess />} />
          <Route path="/tools/rent-analyzer" element={<RentAnalyzer />} />
          <Route path="/tools/voucher-estimator" element={<VoucherEstimator />} />
          <Route path="/listings" element={<PublicListings />} />
          <Route path="/for-landlords" element={<ForLandlords />} />
          <Route path="/for-agencies" element={<ForAgencies />} />
          <Route path="/services" element={<Services />} />
          <Route path="/ai" element={<AITools />} />
          <Route path="/tenant/services" element={<TenantServices />} />
          <Route path="/messages" element={<Messages />} />

          {/* Admin routes — AdminQueue does its own is_admin check */}
          <Route path="/admin/queue" element={<AdminQueue />} />

          {/* Landlord routes */}
          <Route path="/landlord" element={<ProtectedRoute role="landlord" />}>
            <Route index element={<LandlordDashboard />} />
            <Route path="listing/new" element={<ListingForm />} />
            <Route path="listing/:id/edit" element={<ListingForm />} />
            <Route path="applications" element={<ApplicationInbox />} />
            <Route path="hqs" element={<HQSTracker />} />
            <Route path="profile" element={<LandlordProfile />} />
            <Route path="connect" element={<ConnectOnboarding />} />
            <Route path="maintenance" element={<LandlordMaintenance />} />
            <Route path="rent" element={<LandlordRentDashboard />} />
            <Route path="background-checks" element={<LandlordBackgroundChecks />} />
            <Route path="rfta" element={<RFTATracker />} />
          </Route>

          {/* Tenant routes */}
          <Route path="/tenant" element={<ProtectedRoute role="tenant" />}>
            <Route index element={<TenantDashboard />} />
            <Route path="profile/setup" element={<TenantProfileSetup />} />
            <Route path="search" element={<SearchListings />} />
            <Route path="listing/:id" element={<ListingDetail />} />
            <Route path="apply/:id" element={<ApplicationForm />} />
            <Route path="applications" element={<ApplicationsList />} />
            <Route path="maintenance" element={<TenantMaintenance />} />
            <Route path="rent" element={<TenantRentPayment />} />
            <Route path="profile" element={<TenantProfile />} />
            <Route path="lease" element={<TenantLeaseDetails />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  )
}
