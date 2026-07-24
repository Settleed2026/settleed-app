import { Link, useNavigate } from 'react-router-dom'
import { Home, Users, FileCheck, CalendarCheck, CreditCard, ShieldCheck, ChevronRight } from 'lucide-react'

const FEATURES = [
  {
    icon: Users,
    title: 'Pre-screened tenant matches',
    desc: 'Voucher-holding tenants in your ZIP code are notified the moment you list.',
  },
  {
    icon: FileCheck,
    title: 'Online applications and background checks',
    desc: 'Manage everything in one place — no paperwork, no back-and-forth.',
  },
  {
    icon: CalendarCheck,
    title: 'HQS inspection tracker',
    desc: 'Stay ahead of housing authority inspections with built-in checklists and reminders.',
  },
  {
    icon: CreditCard,
    title: 'Guaranteed rent payments',
    desc: 'HA portion paid by direct deposit, every month, on time.',
  },
]

const TESTIMONIAL = {
  quote: "As a landlord I was skeptical about the voucher program. Settleed made the whole process easy — my units stay full and rent is guaranteed.",
  name: 'Marcus D.',
  location: 'East Atlanta',
}

export default function ForLandlords() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Hero */}
      <div className="bg-[#1B3A6B] px-5 pt-10 pb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-white/60 hover:text-white text-sm mb-6"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back
        </button>

        <p className="text-[#1D9E75] text-xs font-semibold tracking-widest uppercase mb-2">
          For Landlords
        </p>
        <h1 className="text-white text-2xl font-bold leading-snug mb-3">
          Fill vacancies faster with Section&nbsp;8 tenants
        </h1>
        <p className="text-white/70 text-sm leading-relaxed mb-6">
          Connect with pre-screened voucher holders in Atlanta. No cold calls, no flyers — just qualified tenants delivered to your inbox.
        </p>

        <Link
          to="/signup?role=landlord"
          className="block w-full bg-[#1D9E75] text-white text-sm font-semibold py-3.5 rounded-xl text-center"
        >
          Start your 7-day free trial
        </Link>
        <p className="text-white/40 text-xs text-center mt-2">
          $49/month after trial · Card required · Cancel anytime
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 border-b border-gray-100">
        <div className="py-4 text-center border-r border-gray-100">
          <p className="text-xl font-bold text-[#1B3A6B]">340+</p>
          <p className="text-[10px] text-gray-400 mt-0.5">active tenants</p>
        </div>
        <div className="py-4 text-center border-r border-gray-100">
          <p className="text-xl font-bold text-[#1B3A6B]">11 days</p>
          <p className="text-[10px] text-gray-400 mt-0.5">avg. to fill</p>
        </div>
        <div className="py-4 text-center">
          <p className="text-xl font-bold text-[#1B3A6B]">$49</p>
          <p className="text-[10px] text-gray-400 mt-0.5">flat/month</p>
        </div>
      </div>

      {/* Demo listing preview */}
      <div className="px-5 pt-6 pb-2">
        <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-3">
          Your listing preview
        </p>
        <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
          <div className="h-36 bg-blue-100 flex items-center justify-center relative">
            <Home className="w-10 h-10 text-blue-300" />
            <span className="absolute top-2 left-2 bg-[#1D9E75] text-white text-[10px] font-semibold px-2 py-1 rounded-full">
              Vouchers OK
            </span>
          </div>
          <div className="p-3 bg-white">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-lg font-bold text-gray-900">$1,450</span>
                <span className="text-xs text-gray-400">/mo</span>
              </div>
              <span className="text-[10px] bg-green-50 text-green-700 font-semibold px-2 py-0.5 rounded">
                ✓ DCA OK
              </span>
            </div>
            <p className="text-xs text-[#1D9E75] font-medium mt-0.5">Available Now</p>
            <p className="text-xs text-gray-500 mt-1">3 bd · 2 ba · 1,050 sqft</p>
            <p className="text-xs text-gray-700 font-medium mt-1">Vine City · 30314</p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-4">
          What you get
        </p>
        <div className="flex flex-col gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#EBF9F4] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#1D9E75]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-snug">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonial */}
      <div className="mx-5 mt-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
        <p className="text-sm text-gray-700 leading-relaxed italic">"{TESTIMONIAL.quote}"</p>
        <p className="text-xs font-semibold text-gray-900 mt-3">{TESTIMONIAL.name}</p>
        <p className="text-xs text-gray-400">{TESTIMONIAL.location}</p>
      </div>

      {/* Pricing card */}
      <div className="mx-5 mt-5 bg-gray-50 rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-900">Founding member pricing</p>
          <div>
            <span className="text-xl font-bold text-[#1B3A6B]">$49</span>
            <span className="text-xs text-gray-400">/mo</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Unlimited listings · Rent collection · Applications · HQS tracker
        </p>
        <div className="bg-[#EBF9F4] rounded-lg p-3">
          <p className="text-xs font-semibold text-[#085041] mb-0.5">7-day free trial included</p>
          <p className="text-xs text-[#0F6E56] leading-relaxed">
            Card required at signup. Cancel before day 7 and you won't be charged.
          </p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-5 pt-6 pb-10">
        <Link
          to="/signup?role=landlord"
          className="block w-full bg-[#1B3A6B] text-white text-sm font-semibold py-3.5 rounded-xl text-center mb-3"
        >
          Start your 7-day free trial
        </Link>
        <p className="text-center text-xs text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-[#1B3A6B] font-semibold">
            Sign in
          </Link>
        </p>
      </div>

    </div>
  )
}
