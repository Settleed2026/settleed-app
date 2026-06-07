import { NavLink } from 'react-router-dom'
import { Home, PlusSquare, Inbox, ClipboardCheck } from 'lucide-react'

const landlordLinks = [
  { to: '/landlord', label: 'Home', icon: Home, end: true },
  { to: '/landlord/listing/new', label: 'Add', icon: PlusSquare },
  { to: '/landlord/applications', label: 'Inbox', icon: Inbox },
  { to: '/landlord/hqs', label: 'HQS', icon: ClipboardCheck },
]

const tenantLinks = [
  { to: '/tenant', label: 'Home', icon: Home, end: true },
  { to: '/tenant/search', label: 'Search', icon: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  )},
]

export default function BottomNav({ role }) {
  const links = role === 'landlord' ? landlordLinks : tenantLinks

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50">
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors ${
              isActive ? 'text-[#1B3A6B]' : 'text-gray-400'
            }`
          }
        >
          <Icon className="w-5 h-5 mb-0.5" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
