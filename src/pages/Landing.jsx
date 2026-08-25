import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  Home, Building2, ChevronRight, Menu, X,
  DollarSign, Shield, User, Search, ClipboardCheck,
  FileText, CheckCircle,
} from 'lucide-react'

const BRAND_NAVY  = '#0D1B4B'
const BRAND_BLUE  = '#1B3A8C'
const BRAND_LIGHT = '#EEF5FF'

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: Search,
    title: 'Search',
    desc: 'Filter by location, bedrooms, and voucher size to find listings that match your needs.',
  },
  {
    step: 2,
    icon: FileText,
    title: 'Connect',
    desc: 'Message landlords directly through Settleed — no cold calls, no runaround.',
  },
  {
    step: 3,
    icon: ClipboardCheck,
    title: 'Apply',
    desc: 'Submit your application online. Upload documents once and reuse across listings.',
  },
  {
    step: 4,
    icon: Home,
    title: 'Move In',
    desc: 'Get approved, sign your lease, and move into your new home with confidence.',
  },
]

const FALLBACK_IMG = 'https://images.pexels.com/photos/6835077/pexels-photo-6835077.jpeg?auto=compress&cs=tinysrgb&w=600'

export default function Landing() {
  const [location, setLocation]         = useState('')
  const [price, setPrice]               = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [menuOpen, setMenuOpen]         = useState(false)
  const navigate = useNavigate()
  const { user, role: userRole } = useAuth()

  function handleSearch(e) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (location) params.set('q', location)
    navigate(`/listings?${params.toString()}`)
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <Home size={16} color="white" />
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ color: BRAND_NAVY }}>
              Settleed
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#how-it-works"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              How It Works
            </a>
            <Link
              to="/for-landlords"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              For Landlords
            </Link>
            {user && userRole === 'tenant' && (
              <Link
                to="/tenant/rent"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Pay Rent
              </Link>
            )}
            {user && userRole ? (
              <Link
                to={userRole === 'landlord' ? '/landlord' : '/tenant'}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                My Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign In
              </Link>
            )}
            <Link
              to={user && userRole ? (userRole === 'landlord' ? '/landlord' : '/tenant') : '/listings'}
              className="text-sm font-semibold text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              {user && userRole ? 'Go to Dashboard' : 'Browse Listings'}
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-4">
            <a
              href="#how-it-works"
              className="text-sm font-medium text-gray-700"
              onClick={() => setMenuOpen(false)}
            >
              How It Works
            </a>
            <Link
              to="/for-landlords"
              className="text-sm font-medium text-gray-700"
              onClick={() => setMenuOpen(false)}
            >
              For Landlords
            </Link>
            {user && userRole === 'tenant' && (
              <Link
                to="/tenant/rent"
                className="text-sm font-medium text-gray-700"
                onClick={() => setMenuOpen(false)}
              >
                Pay Rent
              </Link>
            )}
            <Link
              to={user && userRole ? (userRole === 'landlord' ? '/landlord' : '/tenant') : '/login'}
              className="text-sm font-medium text-gray-700"
              onClick={() => setMenuOpen(false)}
            >
              {user && userRole ? 'My Dashboard' : 'Sign In'}
            </Link>
            <Link
              to="/listings"
              className="text-sm font-semibold text-white text-center px-4 py-3 rounded-xl"
              style={{ backgroundColor: BRAND_BLUE }}
              onClick={() => setMenuOpen(false)}
            >
              Browse Listings
            </Link>
          </div>
        )}
      </header>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="w-full overflow-hidden">
        {/* Mobile: stacked. Desktop: 2-col grid */}
        <div className="md:max-w-6xl md:mx-auto">
          <div className="flex flex-col md:grid md:grid-cols-2 md:min-h-[560px]">

            {/* Image — top on mobile, right on desktop */}
            <div className="relative order-first md:order-last w-full h-60 sm:h-72 md:h-auto overflow-hidden">
              <img
                src="https://images.pexels.com/photos/6994168/pexels-photo-6994168.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="African American family searching for their new home together on a laptop"
                className="w-full h-full object-cover"
                onError={e => { e.target.src = FALLBACK_IMG }}
              />
              {/* 25% dark overlay — keeps image warm while making headline pop */}
              <div className="absolute inset-0 bg-black/25 pointer-events-none" />
            </div>

            {/* Content — below image on mobile, left on desktop */}
            <div className="order-last md:order-first flex flex-col justify-center px-5 py-8 md:px-10 md:py-12 bg-white">
              <span
                className="inline-block self-start text-xs font-semibold uppercase tracking-widest mb-4 px-3 py-1 rounded-full"
                style={{ color: BRAND_BLUE, backgroundColor: BRAND_LIGHT }}
              >
                Atlanta's #1 Section 8 Marketplace
              </span>

              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4"
                style={{ color: BRAND_NAVY }}
              >
                Find Your Next <br />Section 8 Home
              </h1>

              <p className="text-gray-500 text-base leading-relaxed mb-7 max-w-md">
                Verified listings from trusted landlords who accept Housing Choice Vouchers.
              </p>

              {/* Search + CTAs */}
              <div className="flex flex-col gap-3 w-full max-w-sm">
                <form onSubmit={handleSearch} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white focus-within:border-blue-400 transition-colors">
                    <Search size={15} color="#9CA3AF" className="shrink-0" />
                    <input
                      type="text"
                      placeholder="Neighborhood or zip code"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex items-center justify-between w-full text-white font-semibold text-base px-5 py-3.5 rounded-xl hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: BRAND_BLUE }}
                  >
                    <span className="flex items-center gap-2">
                      <Home size={18} />
                      Find Housing
                    </span>
                    <ChevronRight size={18} />
                  </button>
                </form>

                <Link
                  to="/for-landlords"
                  className="flex items-center justify-between w-full font-semibold text-base px-5 py-3.5 rounded-xl border-2 hover:bg-blue-50 transition-colors"
                  style={{ color: BRAND_BLUE, borderColor: BRAND_BLUE, backgroundColor: 'white' }}
                >
                  <span className="flex items-center gap-2">
                    <Building2 size={18} />
                    List My Property
                  </span>
                  <ChevronRight size={18} />
                </Link>

                {/* Directional quick links */}
                <div className="flex items-center gap-4 pt-1">
                  <Link
                    to="/signup?role=tenant"
                    className="text-sm font-medium flex items-center gap-1 hover:underline"
                    style={{ color: BRAND_BLUE }}
                  >
                    I'm a Tenant ↗
                  </Link>
                  <span className="text-gray-300">|</span>
                  <Link
                    to="/signup?role=landlord"
                    className="text-sm font-medium flex items-center gap-1 hover:underline"
                    style={{ color: BRAND_BLUE }}
                  >
                    I'm a Landlord ↗
                  </Link>
                  <span className="text-gray-300">|</span>
                  <a
                    href="mailto:ha@settleed.com"
                    className="text-sm font-medium flex items-center gap-1 hover:underline"
                    style={{ color: BRAND_BLUE }}
                  >
                    I'm an Agency ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BADGES ────────────────────────────────────── */}
      <section className="border-t border-b border-gray-100 py-6 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-3 gap-4 md:gap-12">
            {[
              { icon: DollarSign, title: 'Free to Join',           sub: 'No hidden fees'          },
              { icon: Shield,     title: 'Verified Listings',      sub: 'Trusted & screened'      },
              { icon: User,       title: 'Built for HCV Families', sub: 'We understand your needs' },
            ].map(({ icon: Icon, title, sub }) => (
              <div key={title} className="flex flex-col items-center text-center gap-2">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#DCFCE7' }}
                >
                  <Icon size={18} color="#16A34A" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section id="how-it-works" className="py-16" style={{ backgroundColor: BRAND_LIGHT }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: BRAND_BLUE }}>
              Simple Process
            </p>
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: BRAND_NAVY }}>
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: 'white', boxShadow: '0 2px 14px rgba(27,58,140,0.12)' }}
                  >
                    <Icon size={26} color={BRAND_BLUE} />
                  </div>
                  <span
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
                    style={{ backgroundColor: BRAND_BLUE }}
                  >
                    {step}
                  </span>
                </div>
                <h3 className="text-base font-bold mb-1.5" style={{ color: BRAND_NAVY }}>{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR VOUCHER HOLDERS ──────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:grid md:grid-cols-2 gap-10 md:gap-16 items-center">

            {/* Image — left on desktop */}
            <div className="w-full rounded-2xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <img
                src="https://images.pexels.com/photos/7577378/pexels-photo-7577378.jpeg?auto=compress&cs=tinysrgb&w=700"
                alt="African American family smiling together in front of their home"
                className="w-full h-full object-cover"
                onError={e => { e.target.src = FALLBACK_IMG }}
              />
            </div>

            {/* Text — right on desktop */}
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: BRAND_BLUE }}>
                For Voucher Holders
              </p>
              <h2 className="text-2xl md:text-3xl font-bold leading-tight mb-4" style={{ color: BRAND_NAVY }}>
                Your Voucher.<br />Your Home.
              </h2>
              <p className="text-gray-500 leading-relaxed mb-6">
                Stop wasting time on listings that won't accept Housing Choice Vouchers.
                Every listing on Settleed is pre-verified — landlords have confirmed they
                participate in the HCV program before posting.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Filter by voucher bedroom size',
                  'Apply online — no paper, no hassle',
                  'Get alerts when new listings match your voucher',
                  'Save and compare your favorite listings',
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
                    <CheckCircle size={16} color="#16A34A" className="shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup?role=tenant"
                className="inline-flex items-center gap-2 text-white font-semibold text-sm px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
                style={{ backgroundColor: BRAND_BLUE }}
              >
                Find My Home
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOR LANDLORDS ───────────────────────────────────── */}
      <section id="landlords" className="py-16" style={{ backgroundColor: BRAND_LIGHT }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:grid md:grid-cols-2 gap-10 md:gap-16 items-center">

            {/* Text — left on desktop (DOM first, stays left) */}
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: BRAND_BLUE }}>
                For Landlords
              </p>
              <h2 className="text-2xl md:text-3xl font-bold leading-tight mb-4" style={{ color: BRAND_NAVY }}>
                Reliable Tenants.<br />Guaranteed Income.
              </h2>
              <p className="text-gray-500 leading-relaxed mb-6">
                The Housing Choice Voucher program means your rent is partially or fully
                guaranteed by the government. Settleed makes it easy to list your property
                and connect with qualified, pre-screened tenants.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'List your unit and reach motivated tenants',
                  'Government-backed rental payments',
                  'Streamlined HQS inspection tracking',
                  'Fill vacancies faster with our marketplace',
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
                    <CheckCircle size={16} color="#16A34A" className="shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/for-landlords"
                className="inline-flex items-center gap-2 font-semibold text-sm px-6 py-3 rounded-xl border-2 hover:bg-white transition-colors"
                style={{ color: BRAND_BLUE, borderColor: BRAND_BLUE, backgroundColor: 'transparent' }}
              >
                List My Property
                <ChevronRight size={16} />
              </Link>
            </div>

            {/* Image — right on desktop */}
            <div className="w-full rounded-2xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <img
                src="https://images.pexels.com/photos/7578987/pexels-photo-7578987.jpeg?auto=compress&cs=tinysrgb&w=700"
                alt="Family exploring their new home with a realtor"
                className="w-full h-full object-cover"
                onError={e => { e.target.src = FALLBACK_IMG }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── BROWSE CTA ───────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: BRAND_BLUE }}>
            Browse Listings
          </p>
          <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: BRAND_NAVY }}>
            New Listings Arriving in Atlanta
          </h2>
          <p className="text-gray-500 text-base mb-8 max-w-md mx-auto leading-relaxed">
            Settleed is launching in Atlanta. Every listing is from a verified landlord who accepts Housing Choice Vouchers — no guessing, no wasted calls.
          </p>
          <Link
            to="/listings"
            className="inline-flex items-center gap-2 text-white font-semibold text-base px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity"
            style={{ backgroundColor: BRAND_BLUE }}
          >
            <Search size={18} />
            Browse Available Listings
            <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section className="py-16 md:py-20" style={{ backgroundColor: BRAND_NAVY }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
            Ready to Find Your<br />Next Home?
          </h2>
          <p className="text-blue-200 text-base mb-9 max-w-md mx-auto leading-relaxed">
            Free to join. Every listing accepts Housing Choice Vouchers. Atlanta-first.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-xs sm:max-w-none mx-auto">
            <Link
              to="/signup?role=tenant"
              className="inline-flex items-center justify-center gap-2 text-white font-semibold text-base px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <Home size={18} />
              Find Housing
            </Link>
            <Link
              to="/for-landlords"
              className="inline-flex items-center justify-center gap-2 font-semibold text-base px-8 py-3.5 rounded-xl border-2 border-white text-white hover:bg-white transition-colors"
              style={{ '--hover-color': BRAND_NAVY }}
            >
              <Building2 size={18} />
              List My Property
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">

            {/* Brand blurb */}
            <div className="max-w-xs">
              <Link to="/" className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: BRAND_BLUE }}
                >
                  <Home size={16} color="white" />
                </div>
                <span className="text-lg font-bold" style={{ color: BRAND_NAVY }}>Settleed</span>
              </Link>
              <p className="text-sm text-gray-400 leading-relaxed">
                Atlanta's Section 8 housing marketplace — connecting HCV families with
                verified, welcoming landlords.
              </p>
            </div>

            {/* Link columns */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
              <div>
                <p className="font-semibold text-gray-900 mb-3">For Tenants</p>
                <div className="flex flex-col gap-2.5 text-gray-400">
                  <Link to="/signup?role=tenant"        className="hover:text-gray-700 transition-colors">Find Housing</Link>
                  <a    href="#how-it-works"             className="hover:text-gray-700 transition-colors">How It Works</a>
                  <Link to="/tools/voucher-estimator"   className="hover:text-gray-700 transition-colors">Voucher Estimator</Link>
                  <Link to={user && userRole === 'tenant' ? '/tenant/rent' : '/signup?role=tenant'} className="hover:text-gray-700 transition-colors">Pay Rent</Link>
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-3">For Landlords</p>
                <div className="flex flex-col gap-2.5 text-gray-400">
                  <Link to="/for-landlords"  className="hover:text-gray-700 transition-colors">List Property</Link>
                  <Link to="/tools/rent-analyzer"   className="hover:text-gray-700 transition-colors">Rent Analyzer</Link>
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-3">Company</p>
                <div className="flex flex-col gap-2.5 text-gray-400">
                  <Link to="/login"       className="hover:text-gray-700 transition-colors">Sign In</Link>
                  <Link to="/privacy"     className="hover:text-gray-700 transition-colors">Privacy Policy</Link>
                  <Link to="/terms"       className="hover:text-gray-700 transition-colors">Terms of Service</Link>
                  <Link to="/for-agencies" className="hover:text-gray-700 transition-colors">For Agencies</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-100 space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-xs text-gray-400">© 2026 Settleed · Atlanta, GA. All rights reserved.</p>
              <p className="text-xs text-gray-400">Built for Housing Choice Voucher families.</p>
            </div>
            <p className="text-xs text-gray-400 text-center sm:text-left">
              <span className="font-semibold">Equal Housing Opportunity.</span> Settleed does not discriminate on the basis of race, color, religion, sex, national origin, disability, or familial status in connection with any listing or service on this platform.
            </p>

          </div>
        </div>
      </footer>

    </div>
  )
}
