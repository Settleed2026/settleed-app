import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import BottomNav from '../../components/BottomNav'
import { DollarSign, TrendingUp, Calendar } from 'lucide-react'

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  paid:    { label: 'Paid',    color: 'bg-green-100 text-green-700' },
  late:    { label: 'Late',    color: 'bg-red-100 text-red-700' },
  failed:  { label: 'Failed',  color: 'bg-red-100 text-red-700' },
}

export default function LandlordRentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (user) fetchPayments()
  }, [user])

  async function fetchPayments() {
    setLoading(true)
    const { data } = await supabase
      .from('rent_payments')
      .select('*, property:property_id(street_address, unit_number), tenant:tenant_id(full_name)')
      .eq('landlord_id', user.id)
      .order('due_date', { ascending: false })
      .limit(50)
    setPayments(data || [])
    setLoading(false)
  }

  const filtered = filter === 'all'
    ? payments
    : payments.filter(p => p.status === filter)

  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.landlord_payout_cents || 0), 0)

  const pendingCount = payments.filter(p => p.status === 'pending').length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-[#1B3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-6">
        <button onClick={() => navigate('/landlord')} className="text-blue-200 text-sm mb-3">← Dashboard</button>
        <h1 className="text-white text-2xl font-bold">Rent Payments</h1>
        <p className="text-blue-200 text-sm mt-0.5">{pendingCount} pending</p>
      </div>

      {/* Summary cards */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-[#1D9E75]" />
            <span className="text-xs text-gray-500">Total received</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            ${(totalPaid / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-gray-500">Pending</span>
          </div>
          <div className="text-xl font-bold text-gray-900">{pendingCount}</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-4 pt-4 overflow-x-auto pb-1">
        {['all', 'pending', 'paid', 'late'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-colors capitalize ${
              filter === f ? 'bg-[#1B3A6B] text-white' : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            {f === 'all' ? `All (${payments.length})` : f}
          </button>
        ))}
      </div>

      <div className="px-4 pt-3 space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center">
            <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No payments yet.</p>
          </div>
        ) : (
          filtered.map(pmt => {
            const cfg = STATUS_CONFIG[pmt.status] || STATUS_CONFIG.pending
            const property = pmt.property
            const address = property
              ? `${property.street_address}${property.unit_number ? ` #${property.unit_number}` : ''}`
              : 'Property'

            return (
              <div key={pmt.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-gray-900 text-base">
                      ${(pmt.landlord_payout_cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-gray-400">
                      (tenant paid ${(pmt.amount_cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} · 2% fee)
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  Due {new Date(pmt.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {pmt.tenant?.full_name || 'Tenant'} · {address}
                </div>
                {pmt.paid_at && (
                  <div className="text-xs text-[#1D9E75] mt-0.5">
                    Paid {new Date(pmt.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
      <BottomNav role="landlord" />
    </div>
  )
}
