import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-[#1B3A6B] px-4 py-5 flex items-center gap-3">
        <Link to="/" className="text-white"><ChevronLeft className="w-5 h-5" /></Link>
        <span className="text-white text-2xl font-bold tracking-tight">Settleed</span>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-xs text-gray-400 mb-8">Last updated: June 2026</p>

        <div className="prose prose-sm text-gray-700 space-y-6">
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">1. Information We Collect</h2>
            <p>We collect information you provide directly, including your name, email address, phone number, housing authority, voucher details, and property information. We also collect usage data such as pages visited and actions taken on the Platform.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">2. How We Use Your Information</h2>
            <p>We use your information to operate the Platform, match tenants with available listings, process subscriptions, send transactional notifications, and improve our services. We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">3. Information Sharing</h2>
            <p>When a tenant submits a rental application, the landlord receives the information included in that application. We share data with service providers (Supabase, Stripe, SendGrid, Twilio, Cloudinary) strictly to operate the Platform, under confidentiality agreements.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">4. Data Retention</h2>
            <p>We retain your account data for as long as your account is active. You may request deletion of your account and associated data by contacting us at support@settleed.com.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">5. Security</h2>
            <p>We use industry-standard security practices including encrypted data transmission (HTTPS), row-level security on our database, and access controls. No system is perfectly secure — please use a strong, unique password.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">6. Cookies</h2>
            <p>We use session cookies to keep you logged in. We do not use tracking cookies or third-party advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">7. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. To exercise these rights, email support@settleed.com. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">8. Changes to This Policy</h2>
            <p>We may update this Privacy Policy and will notify registered users of material changes by email.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">9. Contact</h2>
            <p>Privacy questions? Email <a href="mailto:support@settleed.com" className="text-[#1D9E75] underline">support@settleed.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
