import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold text-[#1B3A6B] mb-2">404</h1>
      <p className="text-gray-500 mb-6">This page does not exist.</p>
      <Link to="/" className="bg-[#1B3A6B] text-white px-6 py-3 rounded-lg text-sm font-semibold">
        Go home
      </Link>
    </div>
  )
}
