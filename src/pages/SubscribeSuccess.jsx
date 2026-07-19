import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function SubscribeSuccess() {
  const { role } = useAuth()
  const navigate = useNavigate()

  // Auto-redirect after 5 seconds
  useEffect(() => {
    const t = setTimeout(() => {
      navigate(role === 'landlord' ? '/landlord?subscribed=true' : '/tenant?subscribed=true')
    }, 5000)
    return () => clearTimeout(t)
  }, [role])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full shadow-sm border border-gray-100">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-[#1D9E75]" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">You're all set!</h1>
        <p className="text-gray-500 text-sm mb-2">
          Your 7-day free trial has started. No charge until day 8.
        </p>
        <p className="text-gray-400 text-xs mb-6">
          You'll be redirected automatically in a few seconds.
        </p>
        <Link
          to={role === 'landlord' ? '/landlord?subscribed=true' : '/tenant?subscribed=true'}
          className="block w-full bg-[#1B3A6B] text-white rounded-xl py-3 text-sm font-semibold text-center"
        >
          {role === 'landlord' ? 'Go to your dashboard →' : 'Browse listings →'}
        </Link>
      </div>
    </div>
  )
}
