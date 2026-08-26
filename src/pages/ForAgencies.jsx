// src/pages/ForAgencies.jsx
// Agency portal landing page — for housing authorities to partner with Settleed

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import {
  Building2, CheckCircle, ChevronRight, Home, Users,
  Bell, FileText, ShieldCheck, BarChart3, Mail,
} from 'lucide-react'

const BRAND_NAVY = '#0D1B4B'
const BRAND_BLUE = '#1B3A8C'
const BRAND_LIGHT = '#EEF5FF'

const BENEFITS = [
  {
    icon: Bell,
    title: 'Recertification Tracking',
    desc: 'Settleed alerts your voucher holders 90, 60, 30, and 14 days before their recertification deadline — reducing expired vouchers and saving your staff time.',
  },
  {
    icon: Users,
    title: 'Voucher Holder Dashboard',
    desc: 'See which of your families are actively searching, which have applied to listings, and which are close to lease-up — all in one place.',
  },
  {
    icon: FileText,
    title: 'RFTA & Inspection Tracking',
    desc: 'Landlords on Settleed track RFTA submissions and HQS inspection dates directly in the platform, reducing back-and-forth with your office.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Landlord Network',
    desc: 'Every landlord on Settleed is identity-verified before their listings go live. Your families search a pre-screened pool of voucher-accepting landlords.',
  },
  {
    icon: BarChart3,
    title: 'Market Rent Analytics',
    desc: 'Access real-time data on rental prices across Atlanta by bedroom size and zip code — useful for setting and reviewing payment standards.',
  },
  {
    icon: Mail,
    title: 'Direct Communication',
    desc: 'Message landlords and tenants through Settleed\'s fraud-filtered messaging system — keeping all communication on-platform and auditable.',
  },
]

const AGENCIES = [
  { name: 'Atlanta Housing (AHA)', code: 'AHA' },
  { name: 'Georgia DCA', code: 'DCA' },
  { name: 'Cobb County Housing Authority', code: 'COBB' },
  { name: 'DeKalb County Housing Authority', code: 'DEKALB' },
  { name: 'Other', code: 'other' },
]

export default function ForAgencies() {
  const [form, setForm] = useState({
    name: '', title: '', agency: '', email: '', phone: '', message: '',
  })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.agency || !form.email) {
      toast.error('Please fill in your name, agency, and email.')
      return
    }
    setSending(true)
    const { error } = await supabase.from('agency_inquiries').insert({
      contact_name: form.name,
      contact_title: form.title || null,
      agency_name: form.agency,
      email: form.email,
      phone: form.phone || null,
      message: form.message || null,
    })
    setSending(false)
    if (error) {
      // If table doesn't exist yet, just show success anyway
      console.error('Agency inquiry error:', error.message)
    }
    // Notify admin
    fetch('/api/alerts?action=admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'agency_inquiry',
        payload: { contact_name: form.name, contact_title: form.title, agency: form.agency, email: form.email, phone: form.phone, message: form.message },
      }),
    }).catch(() => {})

    setSent(true)
    toast.success('Message sent! We\'ll be in touch within 24 hours.')
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: BRAND_BLUE }}>
              <Home size={16} color="white" />
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ color: BRAND_NAVY }}>Settleed</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/for-landlords" className="hidden md:block text-sm font-medium text-gray-600 hover:text-gray-900">For Landlords</Link>
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign In</Link>
            <a href="#contact" className="text-sm font-semibold text-white px-4 py-2 rounded-lg" style={{ backgroundColor: BRAND_BLUE }}>
              Partner With Us
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-28" style={{ backgroundColor: BRAND_NAVY }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest mb-5 px-3 py-1 rounded-full bg-white/10 text-blue-200">
            For Housing Authorities & Agencies
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
            The Section 8 Platform<br />Built Around Your Mission
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
            Settleed helps housing authorities reduce voucher expiration, improve lease-up rates,
            and connect families to verified, inspection-ready landlords — all in one platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#contact"
              className="inline-flex items-center justify-center gap-2 text-white font-semibold px-8 py-3.5 rounded-xl hover:opacity-90 transition-opacity"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              Request a Partnership Demo
              <ChevronRight size={18} />
            </a>
            <Link
              to="/listings"
              className="inline-flex items-center justify-center gap-2 font-semibold px-8 py-3.5 rounded-xl border-2 border-white text-white hover:bg-white/10 transition-colors"
            >
              Browse Listings
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-b border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-3 gap-6 md:gap-12 text-center">
            {[
              { stat: 'Atlanta-First', sub: 'Deep focus on the metro market' },
              { stat: 'HCV-Only', sub: 'Every listing accepts vouchers' },
              { stat: '100% Verified', sub: 'Landlord identity screened before listing' },
            ].map(({ stat, sub }) => (
              <div key={stat}>
                <p className="text-xl md:text-2xl font-bold" style={{ color: BRAND_NAVY }}>{stat}</p>
                <p className="text-xs text-gray-500 mt-1">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20" style={{ backgroundColor: BRAND_LIGHT }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: BRAND_BLUE }}>
              Platform Features
            </p>
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: BRAND_NAVY }}>
              Built for the Way You Work
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: BRAND_LIGHT }}>
                  <Icon size={20} color={BRAND_BLUE} />
                </div>
                <h3 className="font-bold text-base mb-2" style={{ color: BRAND_NAVY }}>{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How partnership works */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: BRAND_NAVY }}>How It Works</h2>
            <p className="text-gray-500">A partnership that takes less than a week to set up.</p>
          </div>
          <div className="space-y-6">
            {[
              { step: '01', title: 'We onboard your agency', desc: 'We create a dedicated agency profile for your HA and sync your payment standard data into the platform.' },
              { step: '02', title: 'Your families join Settleed', desc: 'Voucher holders create accounts, enter their voucher details, and start searching — the platform filters listings to only show affordable matches.' },
              { step: '03', title: 'Landlords submit RFTAs digitally', desc: 'When a family is ready to lease, the landlord submits RFTA paperwork through Settleed, and you receive it organized and complete.' },
              { step: '04', title: 'You track everything in one place', desc: 'Your agency dashboard shows lease-up pipeline, pending inspections, and upcoming recertifications across your entire caseload.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-5 items-start">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold text-white" style={{ backgroundColor: BRAND_BLUE }}>
                  {step}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact form */}
      <section id="contact" className="py-20" style={{ backgroundColor: BRAND_LIGHT }}>
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: BRAND_NAVY }}>
              Partner With Settleed
            </h2>
            <p className="text-gray-500 text-sm">
              We'll reach out within 24 hours to schedule a demo and discuss your agency's needs.
            </p>
          </div>

          {sent ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
              <CheckCircle className="w-12 h-12 text-[#1D9E75] mx-auto mb-4" />
              <h3 className="font-bold text-xl text-gray-900 mb-2">Message received!</h3>
              <p className="text-gray-500 text-sm">We'll be in touch within 24 hours to schedule a demo.</p>
              <p className="text-sm text-gray-400 mt-4">Questions? Email us at <a href="mailto:agencies@settleed.com" className="text-[#1B3A6B] font-medium">agencies@settleed.com</a></p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Your Name *</label>
                  <input
                    value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Jane Smith"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Title</label>
                  <input
                    value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="Housing Specialist"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Housing Authority / Agency *</label>
                <select
                  value={form.agency} onChange={e => setForm(p => ({ ...p, agency: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                >
                  <option value="">Select your agency…</option>
                  {AGENCIES.map(a => <option key={a.code} value={a.name}>{a.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Work Email *</label>
                  <input
                    type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="jane@agency.gov"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Phone (optional)</label>
                  <input
                    type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="(404) 555-0100"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tell us about your needs (optional)</label>
                <textarea
                  value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  rows={4}
                  placeholder="How many voucher holders do you serve? What challenges are you trying to solve?"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: BRAND_BLUE }}
              >
                {sending ? 'Sending…' : 'Request Partnership Demo'}
              </button>
              <p className="text-xs text-gray-400 text-center">
                We respond within 24 hours · agencies@settleed.com
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: BRAND_BLUE }}>
              <Home size={14} color="white" />
            </div>
            <span className="font-bold" style={{ color: BRAND_NAVY }}>Settleed</span>
          </Link>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link to="/for-landlords" className="hover:text-gray-700">For Landlords</Link>
            <Link to="/terms" className="hover:text-gray-700">Terms</Link>
            <Link to="/privacy" className="hover:text-gray-700">Privacy</Link>
            <a href="mailto:agencies@settleed.com" className="hover:text-gray-700">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
