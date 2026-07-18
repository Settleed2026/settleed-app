import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const CATEGORIES = [
  {
    label: 'Freshly Renovated',
    tag: 'Freshly Renovated',
    img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80',
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
    img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80',
  },
  {
    label: 'Large Families',
    tag: 'Large Families',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  },
  {
    label: 'Near Transit',
    tag: 'Near Transit',
    img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&q=80',
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

      {/* Search Bar */}
      <div className="bg-white px-4 py-6 flex justify-center border-b border-gray-100">
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
              placeholder="Location, location"
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
              to="/signup"
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

      {/* How are you using Settleed? */}
      <div className="px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-5">How are you using Settleed?</h2>
        <div className="flex flex-col gap-4 sm:flex-row">

          {/* Tenants */}
          <div className="flex-1 rounded-2xl overflow-hidden flex flex-col sm:flex-row" style={{ backgroundColor: '#ede8e0' }}>
            <div className="p-5 flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Tenants</h3>
              <ul className="space-y-1.5 mb-5">
                {[
                  'Browse verified Section 8 listings',
                  'Filter by voucher bedroom size',
                  'Apply online securely',
                  'Get matched to new listings instantly',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-0.5 shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className="inline-block text-sm font-semibold text-white px-5 py-2.5 rounded-full"
                style={{ backgroundColor: '#c96a2b' }}
              >
                Explore Rentals
              </Link>
            </div>
            <div className="sm:w-44 h-40 sm:h-auto overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80"
                alt="Tenants"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Landlord */}
          <div className="flex-1 rounded-2xl overflow-hidden flex flex-col sm:flex-row" style={{ backgroundColor: '#ede8e0' }}>
            <div className="p-5 flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Landlord</h3>
              <ul className="space-y-1.5 mb-5">
                {[
                  'Effortlessly create and manage listings',
                  'Set distinct property highlights',
                  'Reach qualified tenants instantly',
                  'Access landlord tools and support',
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
            <div className="sm:w-44 h-40 sm:h-auto overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80"
                alt="Landlord"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Features strip */}
      <div className="px-4 pb-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: '✓', title: 'Verified listings', desc: 'Every property accepts vouchers' },
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
        <span>© 2026 Settleed</span>
        <div className="flex gap-4">
          <Link to="/privacy" className="hover:text-gray-600">Privacy</Link>
          <Link to="/terms" className="hover:text-gray-600">Terms</Link>
        </div>
      </div>

    </div>
  )
}
