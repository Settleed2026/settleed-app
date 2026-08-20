// src/pages/tenant/TenantServices.jsx
// Layer 5 — Tenant Services Page (premium tenants only)
// City-aware resource hub: food, utilities, housing, healthcare, employment, childcare, benefits

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  Utensils, Zap, Home, Heart, Briefcase,
  Baby, HandHeart, ArrowLeft, ExternalLink, Lock,
} from 'lucide-react'

const CITY = 'Atlanta' // Will be dynamic based on profile market in future

const RESOURCES = {
  food: {
    label: 'Food Assistance',
    icon: Utensils,
    color: '#d97706',
    bg: '#fffbeb',
    items: [
      { name: 'Atlanta Community Food Bank', desc: 'Find nearby food pantries and meal programs', url: 'https://www.acfb.org', phone: '(404) 892-9822' },
      { name: 'SNAP Benefits (Georgia)', desc: 'Apply for food stamps online through Georgia Gateway', url: 'https://gateway.ga.gov', phone: '1-877-423-4746' },
      { name: 'Wholesome Wave Georgia', desc: 'Double your SNAP dollars at farmers markets', url: 'https://wholesomewavegeorgia.org', phone: null },
      { name: 'St. Vincent de Paul Atlanta', desc: 'Emergency food assistance and pantry locations', url: 'https://svdpatlanta.org', phone: '(404) 522-8977' },
    ],
  },
  utilities: {
    label: 'Utility Assistance',
    icon: Zap,
    color: '#7c3aed',
    bg: '#f5f3ff',
    items: [
      { name: 'LIHEAP (Georgia)', desc: 'Low Income Home Energy Assistance Program — help with heating and cooling bills', url: 'https://dfcs.georgia.gov/energy-assistance', phone: '1-877-423-4746' },
      { name: 'Atlanta Watershed Management', desc: 'Water bill assistance and payment plans', url: 'https://www.atlantawatershed.org', phone: '(404) 546-0311' },
      { name: 'Georgia Power Budget Billing', desc: 'Spread energy costs evenly across the year', url: 'https://www.georgiapower.com', phone: '1-888-660-5890' },
      { name: 'Salvation Army Atlanta', desc: 'Emergency utility shutoff prevention assistance', url: 'https://salvationarmyatlanta.org', phone: '(404) 523-4273' },
    ],
  },
  housing: {
    label: 'Housing Help',
    icon: Home,
    color: '#1B3A6B',
    bg: '#eff6ff',
    items: [
      { name: 'Atlanta Housing (AHA)', desc: 'Voucher services, recertification, and housing search help', url: 'https://atlantahousing.org', phone: '(404) 892-4700' },
      { name: 'HUD Housing Counseling', desc: 'Free HUD-approved housing counselors in Georgia', url: 'https://www.hud.gov/findacounselor', phone: '1-800-569-4287' },
      { name: 'Georgia Legal Aid', desc: 'Free legal help for housing issues — eviction, landlord disputes', url: 'https://www.georgialegalaid.org', phone: '1-404-524-5811' },
      { name: 'FHLB Atlanta — Housing Counseling', desc: 'Financial coaching and pre-purchase housing counseling', url: 'https://www.fhlbatl.com', phone: '(404) 888-8000' },
    ],
  },
  healthcare: {
    label: 'Healthcare',
    icon: Heart,
    color: '#dc2626',
    bg: '#fef2f2',
    items: [
      { name: 'Grady Health System', desc: 'Sliding-scale primary care for uninsured and underinsured Atlanta residents', url: 'https://www.gradyhealth.org', phone: '(404) 616-1000' },
      { name: 'Georgia Medicaid (DCH)', desc: 'Apply for free or low-cost health insurance', url: 'https://medicaid.georgia.gov', phone: '1-800-869-1150' },
      { name: 'Mercy Care Atlanta', desc: 'Free primary care, dental, and mental health services', url: 'https://mercycareatl.org', phone: '(404) 688-5880' },
      { name: 'NARAL — Mental Health Resources', desc: 'Free and sliding-scale mental health counseling referrals in Atlanta', url: 'https://www.namiga.org', phone: '(770) 723-9673' },
    ],
  },
  employment: {
    label: 'Employment',
    icon: Briefcase,
    color: '#1D9E75',
    bg: '#f0fdf4',
    items: [
      { name: 'WorkSource Atlanta', desc: 'Job training, placement, and career services for Atlanta residents', url: 'https://worksourceatlanta.org', phone: '(404) 546-8209' },
      { name: 'Georgia Department of Labor', desc: 'Unemployment benefits, job listings, and career centers', url: 'https://dol.georgia.gov', phone: '(404) 232-3001' },
      { name: 'Goodwill of North Georgia', desc: 'Free job training programs and placement assistance', url: 'https://www.goodwillng.org', phone: '(404) 420-0449' },
      { name: 'Per Scholas Atlanta', desc: 'Free tech training and job placement for adults', url: 'https://perscholas.org/atlanta', phone: '(404) 937-9000' },
    ],
  },
  childcare: {
    label: 'Childcare',
    icon: Baby,
    color: '#0891b2',
    bg: '#ecfeff',
    items: [
      { name: 'Georgia CAPS Program', desc: 'Childcare and Parent Services — subsidized childcare for working parents', url: 'https://caps.decal.ga.gov', phone: '1-877-423-4746' },
      { name: 'Save the Children Georgia', desc: 'Early learning programs and childcare resources', url: 'https://www.savethechildren.org', phone: '1-800-728-3843' },
      { name: 'Head Start of Greater Atlanta', desc: 'Free early education for children ages 0-5', url: 'https://headstartatlanta.org', phone: '(404) 527-7396' },
      { name: 'Bright from the Start (DECAL)', desc: 'Find licensed childcare providers in Georgia', url: 'https://decal.georgia.gov', phone: '(404) 657-5957' },
    ],
  },
  benefits: {
    label: 'Benefits & Aid',
    icon: HandHeart,
    color: '#475569',
    bg: '#f8fafc',
    items: [
      { name: 'Georgia Gateway', desc: 'One portal for SNAP, Medicaid, TANF, CAPS, and other state benefits', url: 'https://gateway.ga.gov', phone: '1-877-423-4746' },
      { name: 'Social Security Administration', desc: 'SSI, SSDI, and Social Security benefits — Atlanta field office', url: 'https://www.ssa.gov', phone: '1-800-772-1213' },
      { name: 'TANF — Temporary Assistance', desc: 'Cash assistance for families with children through Georgia DFCS', url: 'https://dfcs.georgia.gov/tanf', phone: '1-877-423-4746' },
      { name: '211 Georgia', desc: 'Dial 2-1-1 or search online for any local resource — the fastest way to find help', url: 'https://www.211georgia.org', phone: '2-1-1' },
    ],
  },
}

const CATEGORIES = Object.keys(RESOURCES)

export default function TenantServices() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('food')

  // TODO: check profile.subscription_status === 'active' for premium gate
  // For now, show all content (remove gate once subscription system is confirmed)
  const isPremium = true

  const category = RESOURCES[activeCategory]
  const Icon = category.icon

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-gray-50 pb-28">
        <div className="bg-[#1B3A6B] px-4 pt-10 pb-8">
          <button onClick={() => navigate(-1)} className="text-blue-200 flex items-center gap-1.5 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-white text-2xl font-bold">Tenant Services</h1>
          <p className="text-blue-200 text-sm mt-1">Resources for Atlanta Section 8 voucher holders</p>
        </div>
        <div className="px-4 pt-8 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Lock className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Premium feature</h2>
          <p className="text-gray-500 text-sm max-w-xs">
            The Tenant Services resource hub is available to Settleed Premium members for $4.99/month.
          </p>
          <button
            onClick={() => navigate('/tenant/subscribe')}
            className="mt-2 bg-[#1B3A6B] text-white px-8 py-3 rounded-xl font-semibold text-sm"
          >
            Upgrade to Premium
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-[#1B3A6B] px-4 pt-10 pb-6">
        <button onClick={() => navigate(-1)} className="text-blue-200 flex items-center gap-1.5 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-white text-2xl font-bold">Tenant Services</h1>
        <p className="text-blue-200 text-sm mt-1">{CITY} area resources for voucher holders</p>
      </div>

      {/* Category tabs */}
      <div className="overflow-x-auto px-4 pt-4 pb-2">
        <div className="flex gap-2" style={{ width: 'max-content' }}>
          {CATEGORIES.map(key => {
            const cat = RESOURCES[key]
            const CatIcon = cat.icon
            const isActive = activeCategory === key
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
                style={isActive ? { background: cat.color, borderColor: cat.color } : {}}
              >
                <CatIcon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Resources list */}
      <div className="px-4 pt-2 space-y-3">
        <div className="flex items-center gap-2 py-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: category.bg }}>
            <Icon className="w-4 h-4" style={{ color: category.color }} />
          </div>
          <h2 className="text-base font-semibold text-gray-900">{category.label} — {CITY}</h2>
        </div>

        {category.items.map((item, i) => (
          <div key={i} className="bg-white rounded-xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{item.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap pt-1">
              {item.phone && (
                <a
                  href={`tel:${item.phone.replace(/\D/g, '')}`}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700"
                >
                  📞 {item.phone}
                </a>
              )}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white"
                  style={{ background: category.color }}
                >
                  <ExternalLink className="w-3 h-3" />
                  Visit website
                </a>
              )}
            </div>
          </div>
        ))}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-xs text-blue-600">
            Need something not listed here? <strong>Dial 2-1-1</strong> — Georgia's free social services hotline connects you to hundreds of local resources instantly.
          </p>
        </div>
      </div>
    </div>
  )
}
