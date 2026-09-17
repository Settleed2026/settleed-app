/**
 * Settleed — iOS App Store Payment Surface Audit
 *
 * This file documents every Stripe payment surface and its
 * Apple App Store IAP compliance status. It also exports a
 * guard utility for conditionally hiding iOS-problematic flows.
 *
 * IMPORTANT: No payment behavior has been changed.
 * This file is documentation + a guard helper for future use.
 *
 * ============================================================
 * PAYMENT SURFACE ANALYSIS
 * ============================================================
 *
 * 1. RENT PAYMENT  ✅ EXEMPT — SAFE
 *    File: src/pages/tenant/RentPayment.jsx
 *    Route: /tenant/rent
 *    What: Tenant pays rent to landlord via Stripe PaymentElement
 *    Type: Real-world financial transaction (physical housing)
 *    Apple Rule: §3.1.3(b) — Real-world services are exempt from IAP
 *    Action: No change needed
 *
 * 2. LANDLORD STRIPE CONNECT  ✅ EXEMPT — SAFE
 *    File: src/pages/landlord/ConnectOnboarding.jsx
 *    Route: /landlord/connect-onboarding
 *    What: Landlords set up Stripe Connect to receive rent payments
 *    Type: Financial infrastructure setup for real-world transactions
 *    Apple Rule: Exempt (supports real-world rent, not a digital product)
 *    Action: No change needed
 *
 * 3. RENT DASHBOARD  ✅ EXEMPT — SAFE
 *    File: src/pages/landlord/RentDashboard.jsx
 *    Route: /landlord/rent
 *    What: Landlord views rent history and Stripe payout status
 *    Type: Dashboard for real-world transactions
 *    Apple Rule: Exempt
 *    Action: No change needed
 *
 * 4. CONSULTATION SERVICES  ⚠️ GRAY AREA — DOCUMENT AND MONITOR
 *    File: src/pages/Services.jsx
 *    Route: /services
 *    What: Users purchase 1-on-1 virtual sessions ($85–$149)
 *          delivered by a Settleed housing specialist (human)
 *    Type: Professional services (human-delivered, not a digital good)
 *    Apple Rule: Professional/personal services (like tutoring, coaching,
 *                therapy) delivered by a real person are generally exempt
 *                under §3.1.3(b). Apple has not rejected similar flows
 *                from TaskRabbit, Rover, UrbanSitter, etc.
 *    Risk: LOW — but monitor App Store review feedback
 *    Action if Apple flags it: Hide the "Book" button on iOS using isIOS
 *                              and direct users to settleed.com/services
 *    How to hide if needed:
 *      import { isIOS } from './platform'
 *      {!isIOS && <BookButton />}
 *
 * 5. SUBSCRIPTION PAGE  ✅ NOT ROUTED — NO IMMEDIATE RISK
 *    File: src/pages/Subscribe.jsx
 *    Route: NOT connected in App.jsx (orphaned component)
 *    What: Was $49/mo landlord + $4.99/mo tenant subscription
 *    Status: Subscriptions were removed per business decision (Aug 2026)
 *    Apple Rule: Digital subscriptions MUST go through Apple IAP on iOS
 *    Action: If subscriptions are ever reintroduced, use Apple IAP on iOS
 *            using this guard:
 *              import { isIOS } from './platform'
 *              {isIOS ? <AppleIAPSubscribe /> : <StripeSubscribe />}
 *
 * ============================================================
 * GUARD UTILITY
 * ============================================================
 */

import { isIOS } from './platform'

/**
 * Returns true if this payment flow is safe to show on iOS
 * without risking App Store rejection.
 *
 * Usage:
 *   import { isPaymentSafeForIOS } from '../lib/iosPaymentGuard'
 *
 *   // Real-world payment — always safe
 *   isPaymentSafeForIOS('rent')          // true
 *   isPaymentSafeForIOS('connect')       // true
 *
 *   // Digital subscription — NOT safe, use Apple IAP instead
 *   isPaymentSafeForIOS('subscription')  // false on iOS
 *
 * @param {'rent' | 'consultation' | 'subscription' | 'connect'} flowType
 * @returns {boolean}
 */
export function isPaymentSafeForIOS(flowType) {
  switch (flowType) {
    case 'rent':
    case 'connect':
      return true // Real-world transactions, always exempt

    case 'consultation':
      return true // Human-delivered professional services, generally exempt

    case 'subscription':
      // Digital subscription — requires Apple IAP on iOS
      // Currently not routed, but guard this if reintroduced
      return !isIOS

    default:
      // Unknown flow — be conservative
      return !isIOS
  }
}
