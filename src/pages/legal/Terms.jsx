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
        <p className="text-xs text-gray-400 mb-8">Last updated: July 2026</p>

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
            <h2 className="text-base font-semibold text-gray-900 mb-2">6. Fair Housing</h2>
            <p>Settleed is committed to equal housing opportunity. All users agree to comply with the Fair Housing Act (42 U.S.C. § 3601 et seq.) and all applicable state and local fair housing laws. Landlords must not discriminate against any applicant on the basis of race, color, national origin, religion, sex, familial status, disability, source of income, or any other protected characteristic. Tenants who believe they have experienced housing discrimination may contact us at <a href="mailto:support@settleed.com" className="text-[#1D9E75] underline">support@settleed.com</a> or file a complaint with HUD at <a href="https://www.hud.gov/fairhousing" target="_blank" rel="noopener noreferrer" className="text-[#1D9E75] underline">hud.gov/fairhousing</a>.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">7. Subscriptions, Payments, and Cancellations</h2>
            <p>Landlord subscriptions are billed monthly through Stripe and auto-renew unless canceled. You may cancel your subscription at any time from your Account settings; cancellation takes effect at the end of the current billing period and no partial refunds are issued. If you believe a charge was made in error, contact us at <a href="mailto:support@settleed.com" className="text-[#1D9E75] underline">support@settleed.com</a> within 30 days of the charge. Settleed also facilitates tenant rent payments through the Platform, charging a 2% platform fee on each transaction. Settleed collects the tenant's portion of rent and transfers the net amount to the landlord's connected Stripe account. You agree to Stripe's Terms of Service by using payment features.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">8. Limitation of Liability</h2>
            <p>Settleed is not liable for any damages arising from the use of the Platform, including but not limited to failed applications, tenancy disputes, or property conditions. Use the Platform at your own risk.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">9. Governing Law</h2>
            <p>These Terms are governed by the laws of the State of Georgia, without regard to conflict-of-law principles. Any dispute arising from your use of the Platform shall be resolved exclusively in the state or federal courts located in Fulton County, Georgia, and you consent to personal jurisdiction in those courts.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">10. Changes to Terms</h2>
            <p>We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">11. Contact</h2>
            <p>Questions? Email us at <a href="mailto:support@settleed.com" className="text-[#1D9E75] underline">support@settleed.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
