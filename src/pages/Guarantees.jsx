import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  ShieldCheck, DollarSign, Clock, Ban, Star, Home,
} from 'lucide-react'

const BRAND_NAVY = '#0D1B4B'
const BRAND_BLUE = '#1B3A6B'
const BRAND_ORG  = '#c96a2b'

const GUARANTEES = [
  {
    icon: ShieldCheck,
    color: 'bg-green-50',
    iconColor: 'text-green-600',
    title: 'Voucher Verified Guarantee',
    tagline: 'Every applicant holds a real, active housing voucher.',
    body:
      'Before any tenant can apply to your listing, Settleed requires them to complete a profile with their voucher issuing authority, voucher size, and bedroom eligibility. You will never receive an application from a non-voucher tenant — only housing-ready applicants who can actually move in.',
  },
  {
    icon: DollarSign,
    color: 'bg-blue-50',
    iconColor: 'text-blue-600',
    title: 'On-Time Payment Guarantee',
    tagline: 'HUD pays directly to you, every month, on time.',
    body:
      'Section 8 Housing Assistance Payments (HAP) come from the housing authority, not the tenant. That means your government-backed portion arrives by the 1st of every month regardless of whether your tenant is late. Settleed helps you set up direct deposit so your HAP payment clears on schedule — every time.',
  },
  {
    icon: Clock,
    color: 'bg-amber-50',
    iconColor: 'text-amber-600',
    title: 'Fast Match Guarantee',
    tagline: 'Your first qualified inquiry within 30 days or we promote for free.',
    body:
      'Publish a complete listing and we guarantee you will receive at least one inquiry from a qualified voucher holder within 30 calendar days. If you do not, we will feature your listing at no additional charge until you do. You deserve visibility, not just a slot in a database.',
  },
  {
    icon: Star,
    color: 'bg-purple-50',
    iconColor: 'text-purple-600',
    title: 'Simple Pricing Guarantee',
    tagline: 'One plan. No hidden per-listing or per-tenant fees.',
    body:
      'Settleed charges a single flat subscription. There are no setup fees, no per-listing fees, no success fees, and no charges when a tenant signs a lease. What you see on our pricing page is what you pay — nothing more.',
  },
  {
    icon: Ban,
    color: 'bg-red-50',
    iconColor: 'text-red-600',
    title: 'Cancel Anytime Guarantee',
    tagline: 'Leave whenever you want. No lock-ins, no penalties.',
    body:
      'We earn your business every month. Cancel your Settleed subscription any time with 30 days notice — no early termination fees, no penalties, and no awkward phone calls. Your listings, applications, and lease records are available to export at any time.',
  },
  {
    icon: Home,
    color: 'bg-orange-50',
    iconColor: 'text-orange-600',
    title: 'Maintenance Transparency Guarantee',
    tagline: 'You approve every repair before work begins.',
    body:
      'When a tenant submits a maintenance request, Settleed notifies you immediately with their description and photos. For non-emergency repairs, your landlord can send a cost estimate for your approval before authorizing any work. You stay in control of your property and your budget — always.',
  },
]

export default function Guarantees() {
  const { user, role: userRole } = useAuth()

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: BRAND_BLUE }}>
              <Home size={16} color="white" />
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ color: BRAND_NAVY }}>Settleed</span>
          </Link>
          <Link
            to={user ? (userRole === 'landlord' ? '/landlord' : '/tenant') : '/signup?role=landlord'}
            className="text-sm font-semibold text-white px-4 py-2 rounded-lg"
            style={{ backgroundColor: BRAND_BLUE }}
          >
            {user ? 'Dashboard' : 'Get Started Free'}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="py-14 px-4 text-center" style={{ backgroundColor: BRAND_BLUE }}>
        <p className="text-blue-200 text-xs font-semibold tracking-widest uppercase mb-3">Our Promises to You</p>
        <h1 className="text-white text-4xl font-bold leading-tight mb-4">The Settleed Guarantees</h1>
        <p className="text-blue-100 text-base leading-relaxed max-w-xl mx-auto">
          Accepting Section 8 for the first time takes trust. Here is exactly what we commit to every landlord and tenant on our platform.
        </p>
      </div>

      {/* Guarantees grid */}
      <div className="max-w-4xl mx-auto px-4 py-12 w-full">
        <div className="grid gap-6 sm:grid-cols-2">
          {GUARANTEES.map((g, i) => {
            const Icon = g.icon
            return (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${g.color}`}>
                  <Icon className={`w-5 h-5 ${g.iconColor}`} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">{g.title}</h2>
                  <p className="text-sm font-semibold mb-3" style={{ color: BRAND_ORG }}>{g.tagline}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{g.body}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* EHO + BBB-style trust bar */}
        <div className="mt-12 bg-gray-50 rounded-2xl p-6 text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Our Commitments</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
            {[
              'Equal Housing Opportunity',
              'HUD-Compliant Platform',
              'No Discrimination Policy',
              'Section 8 Specialist',
            ].map(label => (
              <span key={label} className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 rounded-2xl p-8 text-center" style={{ backgroundColor: BRAND_BLUE }}>
          <h2 className="text-white text-2xl font-bold mb-2">Ready to list your property?</h2>
          <p className="text-blue-200 text-sm mb-6 leading-relaxed max-w-md mx-auto">
            Join landlords across Georgia who are filling vacancies faster with housing-ready Section 8 tenants.
          </p>
          <Link
            to={user && userRole === 'landlord' ? '/landlord' : '/signup?role=landlord'}
            className="inline-block text-sm font-semibold text-white px-7 py-3 rounded-full"
            style={{ backgroundColor: BRAND_ORG }}
          >
            {user && userRole === 'landlord' ? 'Go to Dashboard →' : 'Create Free Landlord Account →'}
          </Link>
          <p className="text-blue-300 text-xs mt-3">No credit card required · Cancel anytime</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-100 bg-white px-6 py-5">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <span>© 2026 Settleed · Atlanta, GA · Equal Housing Opportunity</span>
          <div className="flex gap-5">
            <Link to="/for-landlords" className="hover:text-gray-600">For Landlords</Link>
            <Link to="/privacy" className="hover:text-gray-600">Privacy</Link>
            <Link to="/terms" className="hover:text-gray-600">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
