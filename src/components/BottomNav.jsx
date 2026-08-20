import { NavLink } from 'react-router-dom'
import { Home, Inbox, User, Wrench, DollarSign, ShieldCheck, MessageSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const landlordLinks = [
  { to: '/landlord',              label: 'Home',     icon: Home,          end: true },
  { to: '/landlord/applications', label: 'Inbox',    icon: Inbox },
  { to: '/messages',              label: 'Messages', icon: MessageSquare },
  { to: '/landlord/rent',         label: 'Rent',     icon: DollarSign },
  { to: '/landlord/profile',      label: 'Account',  icon: User },
]

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" strokeWidth="2"/><path d="m21 21-4.35-4.35" strokeWidth="2"/>
  </svg>
)

const tenantLinks = [
  { to: '/tenant',             label: 'Home',     icon: Home,          end: true },
  { to: '/tenant/search',      label: 'Search',   icon: SearchIcon },
  { to: '/messages',           label: 'Messages', icon: MessageSquare },
  { to: '/tenant/rent',        label: 'Rent',     icon: DollarSign },
  { to: '/tenant/profile',     label: 'Account',  icon: User },
]

export default function BottomNav({ role }) {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setIsAdmin(!!data?.is_admin))
  }, [user])

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
              isActive ? 'text-[#1B3A6B]' : 'text-gray-500'
            }`
          }
        >
          <Icon className="w-5 h-5 mb-0.5" />
          {label}
        </NavLink>
      ))}
      {isAdmin && (
        <NavLink
          to="/admin/queue"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors ${
              isActive ? 'text-[#1D9E75]' : 'text-[#1D9E75] opacity-70'
            }`
          }
        >
          <ShieldCheck className="w-5 h-5 mb-0.5" />
          Admin
        </NavLink>
      )}
    </nav>
  )
}
