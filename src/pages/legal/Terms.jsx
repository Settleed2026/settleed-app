import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export default function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-[#1B3A6B] px-4 py-5 flex items-center gap-3">
        <Link to="/" className="text-white"><ChevronLeft className="w-5 h-5" /></Link>
        <span className="text-white text-2xl font-bold tracking-tight">Settleed</span>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-xs text-gray-400 mb-8">Last updated: June 2026</p>

        <div className="prose prose-sm text-gray-700 space-y-6">
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p>By creating an account or using Settleed ("the Platform"), you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the Platform.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">2. Platform Description</h2>
            <p>Settleed is a marketplace that connects Section 8 voucher holders with landlords who accept Housing Choice Vouchers. We do not own or manage any properties listed on the Platform, nor do we act as a housing authority.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">3. User Accounts</h2>
            <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. Settleed is not liable for any loss resulting from unauthorized account access.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">4. Landlord Responsibilities</h2>
            <p>Landlords represent that all listed properties are legally available for rent, compliant with applicable housing codes, and eligible for Housing Choice Voucher tenancy. Landlords agree not to discriminate against applicants based on source of income, race, color, religion, sex, national origin, disability, or familial status.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">5. Tenant Responsibilities</h2>
            <p>Tenants represent that information provided during the application process, including voucher details, is accurate and current. Tenants agree not to use the Platform for fraudulent applications.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">6. Subscriptions and Payments</h2>
            <p>Landlord and tenant subscriptions are billed through Stripe. Subscriptions auto-renew unless canceled. Settleed does not process rental payments — all rent transactions occur directly between landlord and tenant.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">7. Limitation of Liability</h2>
            <p>Settleed is not liable for any damages arising from the use of the Platform, including but not limited to failed applications, tenancy disputes, or property conditions. Use the Platform at your own risk.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">8. Changes to Terms</h2>
            <p>We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">9. Contact</h2>
            <p>Questions? Email us at <a href="mailto:support@settleed.com" className="text-[#1D9E75] underline">support@settleed.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
