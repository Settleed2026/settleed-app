import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="bg-[#1B3A6B] px-4 py-4 flex items-center justify-between">
        <span className="text-white text-2xl font-bold tracking-tight">Settleed</span>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-white text-sm font-medium">Sign in</Link>
          <Link to="/signup" className="bg-[#1D9E75] text-white text-sm font-semibold px-4 py-2 rounded-lg">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-[#1B3A6B] px-4 pt-12 pb-16 text-center">
        <h1 className="text-3xl font-bold text-white leading-tight mb-3">
          Section 8 housing,<br />done right.
        </h1>
        <p className="text-blue-200 text-sm mb-8 max-w-xs mx-auto">
          The marketplace that connects voucher holders with landlords who actually accept them — and handles everything the housing authority does not.
        </p>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Link
            to="/signup"
            className="bg-[#1D9E75] text-white font-semibold py-3 rounded-lg text-sm"
          >
            Find housing with my voucher
          </Link>
          <Link
            to="/signup"
            className="bg-white text-[#1B3A6B] font-semibold py-3 rounded-lg text-sm"
          >
            List my Section 8 property
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="px-4 py-10">
        <h2 className="text-lg font-bold text-gray-900 mb-6 text-center">Built for how Section 8 actually works</h2>
        <div className="space-y-4">
          {[
            {
              title: 'Verified listings only',
              desc: 'Every property is listed by a real landlord who accepts vouchers. No expired listings, no wasted calls.',
              color: 'bg-blue-50',
            },
            {
              title: 'HQS inspection tracking',
              desc: 'Landlords get automatic reminders before inspections are due. No more missed dates, no more suspended payments.',
              color: 'bg-green-50',
            },
            {
              title: 'Instant match alerts',
              desc: 'Get notified the moment a matching property is listed or a qualified tenant joins.',
              color: 'bg-blue-50',
            },
            {
              title: 'Recertification reminders',
              desc: 'Never miss an annual recertification deadline. Alerts go out 90 days in advance.',
              color: 'bg-green-50',
            },
          ].map(f => (
            <div key={f.title} className={`${f.color} rounded-xl p-4`}>
              <div className="font-semibold text-gray-900 text-sm mb-1">{f.title}</div>
              <div className="text-gray-600 text-xs">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing preview */}
      <div className="px-4 pb-10">
        <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">Simple pricing</h2>
        <div className="space-y-3">
          <div className="border border-[#1B3A6B] rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-gray-900 text-sm">Landlords</span>
              <span className="font-bold text-[#1B3A6B]">$49/mo</span>
            </div>
            <p className="text-gray-500 text-xs">Unlimited listings, inspection tracking, instant match alerts, application inbox</p>
          </div>
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-gray-900 text-sm">Tenants</span>
              <span className="font-bold text-gray-700">Free / $4.99/mo</span>
            </div>
            <p className="text-gray-500 text-xs">Free to search. Upgrade for unlimited applications, SMS alerts, and verified voucher badge.</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-12 text-center">
        <Link
          to="/signup"
          className="inline-block bg-[#1B3A6B] text-white font-semibold py-3 px-8 rounded-lg text-sm"
        >
          Get started free
        </Link>
        <p className="text-gray-400 text-xs mt-2">7-day free trial. No credit card required to browse.</p>
      </div>
    </div>
  )
}
