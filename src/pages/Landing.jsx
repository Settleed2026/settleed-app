import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const CATEGORIES = [
  {
    label: 'Freshly Renovated',
    tag: 'Freshly Renovated',
    img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80',
  },
  {
    label: 'New on Market',
    tag: 'New on Market',
    img: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=400&q=80',
  },
  {
    label: 'Move-in Ready',
    tag: 'Move-in Ready',
    img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80',
  },
  {
    label: 'Pets Allowed',
    tag: 'Pets Allowed',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  },
  {
    label: 'Large Families',
    tag: 'Large Families',
    img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&q=80',
  },
  {
    label: 'Near Transit',
    tag: 'Near Transit',
    img: 'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?w=400&q=80',
  },
]

export default function Landing() {
  const [location, setLocation] = useState('')
  const [price, setPrice] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const navigate = useNavigate()

  function handleSearch(e) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (location) params.set('q', location)
    if (price) params.set('price', price)
    if (propertyType) params.set('type', propertyType)
    params.set('role', 'tenant')
    navigate(`/signup?${params.toString()}`)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f7f3ee' }}>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 3L3 12h3v12h6v-7h4v7h6V12h3L14 3z" fill="#c96a2b"/>
          </svg>
          <span className="text-xl font-bold text-gray-900 tracking-tight">Settleed</span>
        </Link>
        <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
          Sign in
        </Link>
      </nav>

      {/* Hero banner */}
      <div className="bg-[#1B3A6B] px-6 py-8 text-center">
        <p className="text-blue-200 text-xs font-semibold tracking-widest uppercase mb-2">Built for Atlanta</p>
        <h1 className="text-white text-3xl font-bold leading-tight mb-2">
          Your voucher.<br />Your home. Your community.
        </h1>
        <p className="text-blue-200 text-sm leading-relaxed max-w-sm mx-auto">
          Settleed connects Section 8 families with landlords who welcome them — no runaround, no discrimination.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white px-4 py-5 flex justify-center border-b border-gray-100">
        <form
          onSubmit={handleSearch}
          className="flex items-center gap-0 w-full max-w-2xl rounded-full border border-gray-300 bg-white shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-2 flex-1 px-4 py-3">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400 shrink-0">
              <path d="M8 1.5C5.51 1.5 3.5 3.51 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.49-2.01-4.5-4.5-4.5zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor"/>
            </svg>
            <input
              type="text"
              placeholder="Atlanta neighborhood or zip code"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
            />
          </div>
          <div className="w-px h-6 bg-gray-200 shrink-0" />
          <select
            value={price}
            onChange={e => setPrice(e.target.value)}
            className="px-4 py-3 text-sm text-gray-600 bg-transparent outline-none cursor-pointer"
          >
            <option value="">Price</option>
            <option value="0-800">Up to $800</option>
            <option value="0-1000">Up to $1,000</option>
            <option value="0-1200">Up to $1,200</option>
            <option value="0-1500">Up to $1,500</option>
            <option value="0-2000">Up to $2,000</option>
          </select>
          <div className="w-px h-6 bg-gray-200 shrink-0" />
          <select
            value={propertyType}
            onChange={e => setPropertyType(e.target.value)}
            className="px-4 py-3 text-sm text-gray-600 bg-transparent outline-none cursor-pointer"
          >
            <option value="">Property type</option>
            <option value="Apartment">Apartment</option>
            <option value="Single Family Home">Single Family</option>
            <option value="Townhome">Townhome</option>
            <option value="Duplex">Duplex</option>
          </select>
          <button
            type="submit"
            className="m-1 rounded-full p-3 flex items-center justify-center"
            style={{ backgroundColor: '#c96a2b' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="white" strokeWidth="1.5"/>
              <path d="M10 10l3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </form>
      </div>

      {/* Category Cards */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => (
            <Link
              key={cat.label}
              to="/signup?role=tenant"
              className="flex-shrink-0 flex flex-col items-start"
              style={{ width: 160 }}
            >
              <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: 130 }}>
                <img
                  src={cat.img}
                  alt={cat.label}
                  className="w-full h-full object-cover"
                  onError={e => { e.target.src = 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&q=80' }}
                />
                <span
                  className="absolute top-2 left-2 text-xs font-semibold px-2 py-1 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.88)', color: '#222' }}
                >
                  {cat.tag}
                </span>
              </div>
              <span className="mt-2 text-sm font-medium text-gray-800">{cat.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Community trust strip */}
      <div className="mx-4 my-6 bg-[#1B3A6B] rounded-2xl px-5 py-5">
        <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-3">Why families choose Settleed</p>
        <div className="grid grid-cols-1 gap-3">
          {[
            { icon: '🏠', text: 'Every listing is confirmed to accept Housing Choice Vouchers — no more wasted calls.' },
            { icon: '⚡', text: 'Get alerted the moment a unit matching your voucher size posts. First come, first served.' },
            { icon: '🤝', text: 'Black-owned and built right here in Atlanta, for Atlanta families.' },
          ].map(item => (
            <div key={item.icon} className="flex items-start gap-3">
              <span className="text-xl shrink-0">{item.icon}</span>
              <p className="text-sm text-blue-100 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How are you using Settleed? */}
      <div className="px-4 pb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-5">How are you using Settleed?</h2>
        <div className="flex flex-col gap-4 sm:flex-row">

          {/* Tenants */}
          <div className="flex-1 rounded-2xl overflow-hidden flex flex-col sm:flex-row" style={{ backgroundColor: '#ede8e0' }}>
            <div className="p-5 flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-3">I have a voucher</h3>
              <ul className="space-y-1.5 mb-5">
                {[
                  'Browse verified Section 8 listings',
                  'Filter by your voucher bedroom size',
                  'Apply online — no paper, no hassle',
                  'Get matched to new listings instantly',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/signup?role=tenant"
                className="inline-block text-sm font-semibold text-white px-5 py-2.5 rounded-full"
                style={{ backgroundColor: '#c96a2b' }}
              >
                Find My Home
              </Link>
            </div>
            <div className="sm:w-44 h-44 sm:h-auto overflow-hidden">
              {/* Black woman/family — Unsplash photo by eye for ebony */}
              <img
                src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80"
                alt="Tenant"
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>

          {/* Landlord */}
          <div className="flex-1 rounded-2xl overflow-hidden flex flex-col sm:flex-row" style={{ backgroundColor: '#ede8e0' }}>
            <div className="p-5 flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-3">I'm a landlord</h3>
              <ul className="space-y-1.5 mb-5">
                {[
                  'List your property and reach qualified tenants',
                  'Guaranteed rent through the voucher program',
                  'Streamlined HQS inspection tracking',
                  'Fill vacancies faster — guaranteed income',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/signup?role=landlord"
                className="inline-block text-sm font-semibold text-white px-5 py-2.5 rounded-full"
                style={{ backgroundColor: '#c96a2b' }}
              >
                List Your Unit ($49/mo)
              </Link>
            </div>
            <div className="sm:w-44 h-44 sm:h-auto overflow-hidden">
              {/* Black professional landlord */}
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80"
                alt="Landlord"
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Testimonial */}
      <div className="mx-4 mb-8 bg-white rounded-2xl px-5 py-6 border border-gray-100">
        <p className="text-xs font-semibold text-[#c96a2b] uppercase tracking-wider mb-3">From our community</p>
        <blockquote className="text-gray-800 text-sm leading-relaxed italic mb-3">
          "I had my voucher for 5 months and couldn't find a place that would accept it. Settleed had me in a home in 3 weeks. I didn't have to beg anyone."
        </blockquote>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#1B3A6B] flex items-center justify-center text-white text-xs font-bold">T</div>
          <span className="text-xs text-gray-500">Tenant, Southwest Atlanta</span>
        </div>
      </div>

      {/* Features strip */}
      <div className="px-4 pb-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: '✓', title: 'Vouchers welcome', desc: 'Every listing accepts HCV' },
            { icon: '🔔', title: 'Instant alerts', desc: 'Know the moment a match drops' },
            { icon: '📋', title: 'HQS tracking', desc: 'Never miss an inspection date' },
            { icon: '📅', title: 'Recert reminders', desc: '90-day advance notice' },
          ].map(f => (
            <div key={f.title} className="bg-white rounded-2xl p-4">
              <div className="text-xl mb-1">{f.icon}</div>
              <div className="text-sm font-semibold text-gray-900">{f.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-between text-xs text-gray-400">
        <span>© 2026 Settleed · Atlanta, GA</span>
        <div className="flex gap-4">
          <Link to="/privacy" className="hover:text-gray-600">Privacy</Link>
          <Link to="/terms" className="hover:text-gray-600">Terms</Link>
        </div>
      </div>

    </div>
  )
}
