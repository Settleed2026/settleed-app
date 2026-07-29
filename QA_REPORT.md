# Settleed QA Report
**Date:** July 28, 2026  
**Tester:** Claude (Senior QA Engineer, UX Researcher, Accessibility Specialist, Security Tester)  
**Site:** https://www.settleed.com/  
**Product:** Two-sided Section 8 Housing Marketplace (Atlanta-first)

---

## Executive Summary

**Launch-Readiness Score: 52 / 100**

**Recommendation: Launch After Critical Fixes**

Settleed has a working product skeleton — auth, listings, applications, and email notifications function end-to-end. However, three issues block launch entirely: the Stripe publishable key is missing (breaking all subscription flows), some listings render `null` field values in production (data integrity), and there is no Equal Housing Opportunity statement anywhere on the site (Fair Housing compliance risk). Additionally, the absence of account deletion, weak form validation feedback, and a duplicated bottom navigation element create real user trust and UX problems. Fix the critical items below and the product is viable for a limited beta.

---

## Critical Issues

### C-01 — Stripe Publishable Key Missing (`VITE_STRIPE_PUBLISHABLE_KEY`)
- **Affected pages:** Homepage, `/landlord/subscribe`, any page that loads `js.stripe.com/v3`
- **Console error:** `IntegrationError: Please call Stripe() with your publishable key. You used an empty string.` (fires twice on every page load)
- **Impact:** Every landlord subscription attempt fails. Stripe is initialised with an empty string, meaning the Subscribe page, payment forms, and Stripe Connect onboarding are all broken. No landlord can pay for a subscription in production.
- **Fix:** Add `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...` to Vercel environment variables and redeploy.

### C-02 — Null Data Rendering on Live Listing Card
- **Affected page:** `/tenant/search`
- **Evidence:** One listing card displays `$/mo`, `null bd · null ba`, and an empty address — raw null values rendered in the UI.
- **Impact:** Looks broken to every tenant who sees it. Indicates a listing was saved to the database with missing required fields, and the front end has no null guard.
- **Fix:** Add null guards to the listing card component (`rent ?? 'TBD'`, `bedrooms ?? '?'`). Also enforce server-side NOT NULL constraints or required fields before a listing can go active.

### C-03 — No Equal Housing Opportunity (EHO) Statement
- **Affected pages:** Homepage, footer, Terms of Service
- **Impact:** Operating a housing marketplace without EHO/Fair Housing language is a Fair Housing Act compliance risk. Competitors and HUD partners will flag this immediately. The footer has Privacy Policy and Terms links but no EHO logo or statement.
- **Fix:** Add "Equal Housing Opportunity" text and the EHO logo to the footer. Add a Fair Housing compliance section to the Terms of Service.

### C-04 — No Account Deletion for Users
- **Affected page:** `/tenant/profile`
- **Impact:** GDPR (and growing U.S. state privacy laws) require users to be able to delete their accounts and data. The tenant profile page has Sign Out and Change Password but no Delete Account option. This is a legal compliance gap that could prevent operating in certain markets.
- **Fix:** Add a "Delete my account" option with a confirmation dialog that hard-deletes or anonymises the Supabase user record and associated PII.

---

## High-Priority Issues

### H-01 — No Inline Form Validation Errors on Signup or Application Forms
- **Pages:** `/signup`, `/tenant/apply/[id]`
- **Evidence:** Submitting the signup form with blank fields, an invalid email, or a 7-character password produces no visible error messages. The form relies entirely on the HTML5 `required` attribute (which fires the browser native tooltip) but shows zero React-rendered error feedback.
- **Impact:** Users on mobile Chrome often miss the native browser validation bubble. Users with assistive technologies may never discover what went wrong. Conversion rate for signups will suffer.
- **Fix:** Add client-side validation with inline error messages per field (e.g., red text beneath the field). Use `aria-describedby` to associate errors with their fields.

### H-02 — Application Form Fields Have No `<label>` Elements
- **Pages:** `/tenant/apply/[id]`, `/tools/voucher-estimator`, `/tools/rent-analyzer`, `/tenant/search`
- **Evidence:** All 6 fields on the application form and all inputs on both tool pages have `id=""` (no ID) and no `<label for="">`, no `aria-label`, no `aria-labelledby`. Screen readers will announce these inputs as unlabelled.
- **Impact:** WCAG 2.2 AA failure (1.3.1 Info and Relationships, 4.1.2 Name, Role, Value). Blind and low-vision users cannot use the application form.
- **Fix:** Add `<label>` elements with explicit `for` attributes matching an `id` on each input, or add `aria-label` attributes.

### H-03 — Missing `<main>` Landmark and Skip Navigation Link
- **Affected pages:** All pages
- **Evidence:** No `<main>` element or `[role="main"]` exists anywhere in the DOM. No skip-to-content link at the top of the page.
- **Impact:** WCAG 2.2 AA failures (1.3.6 Identify Purpose, 2.4.1 Bypass Blocks). Keyboard-only and screen-reader users must tab through the entire navigation on every page.
- **Fix:** Wrap page content in `<main>`. Add a visually-hidden but focusable "Skip to main content" link as the first focusable element.

### H-04 — Bottom Navigation Renders Twice on Maintenance Page
- **Affected page:** `/tenant/maintenance` (new-request state)
- **Evidence:** The bottom navigation bar text "HomeSearchRepairsRentAccount" appears twice in the DOM when the new-maintenance-request form is open.
- **Impact:** Screen readers will read the navigation twice. This may also cause visual duplication on some devices.
- **Fix:** Check the maintenance page component for a duplicate `<BottomNav />` render — likely the form overlay and the parent page both render it.

### H-05 — Landlord Subscription Routes Return 404 for Tenant Role Instead of Redirect
- **Affected routes:** `/landlord/listings/new`, `/landlord/subscribe`
- **Evidence:** When a logged-in tenant navigates to these routes, they see a generic "404 — This page does not exist" rather than being redirected to `/tenant` or shown an appropriate message.
- **Impact:** Confusing UX. Tenants who land here (e.g., via a shared link) think the page is broken.
- **Fix:** In the React Router configuration, add role-based redirect logic that sends tenants from all `/landlord/*` routes to `/tenant` rather than rendering 404.

### H-06 — Maintenance Request Submittable Without an Active Lease (No Pre-Check)
- **Affected page:** `/tenant/maintenance` new request form
- **Evidence:** The full maintenance form is shown and filled before the user is told they don't have an active lease. The error "You don't have an active lease on file" only appears after submit.
- **Impact:** A tenant who just moved in and doesn't yet have their lease linked will fill out the entire form before hitting a wall.
- **Fix:** Show the "no active lease" warning immediately when the user opens the new request form, before any fields are filled.

### H-07 — No Character Limit on Maintenance Description or Application Message
- **Affected pages:** `/tenant/maintenance`, `/tenant/apply/[id]`
- **Evidence:** A 5,000-character string was accepted in the message field with no truncation, counter warning, or error.
- **Impact:** Potential database storage abuse; extremely long messages render poorly in the landlord inbox.
- **Fix:** Add `maxlength` attribute and a character counter (e.g., `420/500 characters`).

### H-08 — Search Filter State Gets Stuck / Requires Full Page Reload to Reset
- **Affected page:** `/tenant/search`
- **Evidence:** After applying ZIP and bedroom filters via JavaScript (simulating user interaction), resetting the select values programmatically didn't restore the full listing set; a full navigation reload was required to see all 7 listings again.
- **Impact:** Users who filter and then want to clear filters may feel stuck or confused.
- **Fix:** Add a visible "Clear filters" or "Reset" button that resets all filter state at once.

### H-09 — "Go to Dashboard" Nav Link Has Near-Zero Color Contrast
- **Affected pages:** All pages where the user is logged in (nav bar)
- **Evidence:** The "Go to Dashboard" link in the nav has `color: rgb(0, 0, 238)` (browser-default blue) against `background: rgb(27, 58, 140)` (navy). Estimated contrast ratio ≈ 1.0:1.
- **Impact:** WCAG 2.2 AA failure (1.4.3 Contrast Minimum — requires 4.5:1 for normal text). The link is essentially invisible to low-vision users.
- **Fix:** Apply an explicit white or light-coloured style to nav links on the dark background.

---

## Medium-Priority Issues

### M-01 — Voucher Estimator Tool: No Result Displayed After Submission
- **Page:** `/tools/voucher-estimator`
- **Evidence:** Filling in ZIP 30310, selecting 1 BR, entering $24,000 income, and clicking "Estimate My Voucher" produced no visible result. The page content did not change.
- **Likely cause:** React state not picking up programmatic value changes; or the result renders below the fold and requires scrolling. Could not confirm either without a visual screenshot in the test environment.
- **Recommendation:** Verify the tool produces a result with a real user interaction in the browser and ensure the result scrolls into view.

### M-02 — Terms of Service Missing Governing Law / Jurisdiction
- **Page:** `/terms`
- **Evidence:** No governing law clause or state/jurisdiction is specified.
- **Impact:** Unenforceable in disputes.
- **Fix:** Add a "Governing Law" section specifying Georgia law and Fulton County courts.

### M-03 — Terms of Service Has No Refund Policy
- **Page:** `/terms`
- **Evidence:** Section 6 describes a 2% rent fee but the Terms contain no refund, cancellation, or chargeback policy for subscriptions.
- **Impact:** Potential chargebacks; FTC guidance on subscription transparency requires clear cancellation terms.
- **Fix:** Add a Refund & Cancellation section specifying subscription terms, trial conversion, and refund eligibility.

### M-04 — Privacy Policy References Twilio and Cloudinary as Service Providers
- **Page:** `/privacy`
- **Evidence:** Privacy Policy lists "Supabase, Stripe, SendGrid, Twilio, Cloudinary" as data processors. Twilio (SMS) and Cloudinary (image CDN) are not currently implemented in the codebase.
- **Impact:** Misleading privacy disclosure. Users are told their data is shared with services that don't process it.
- **Fix:** Remove Twilio and Cloudinary from the Privacy Policy until those integrations are live. Re-add them when implemented.

### M-05 — Homepage H1 Concatenates Without Space ("Find Your NextSection 8 Home")
- **Page:** `/`
- **Evidence:** `document.querySelector('h1').textContent` returns `"Find Your NextSection 8 Home"` — "Next" and "Section" are joined with no space.
- **Impact:** Screen readers read it as one word. Looks broken in SEO previews.
- **Fix:** Add a space or `&nbsp;` between the line-break span elements in the H1.

### M-06 — "Featured Homes" Listing Cards Link to Signup, Not Actual Listings
- **Page:** `/`
- **Evidence:** All 3 featured listing cards on the homepage (`href="https://www.settleed.com/signup?role=tenant"`) navigate to signup rather than to the actual listing detail page.
- **Impact:** Users who want to learn more before signing up cannot preview listings. Creates distrust.
- **Fix:** Either link to a public listing detail page (no auth required) or to the browse page. Alternatively, add a preview modal.

### M-07 — Listing Detail Page Shows No Property Description, Amenities, Map, or Photos
- **Page:** `/tenant/listing/[id]`
- **Evidence:** The listing detail page for the smoke listing (456 Auburn Ave NE) showed only: price, availability, DCA payment standard check, neighbourhood/ZIP, bed/bath/sqft, security deposit, accepted HAs, and an Apply button. No description, amenities, pet policy, utilities, parking, photos (gallery showed "1/1" but no visible image), or map were present.
- **Impact:** Tenants cannot make an informed housing decision. Very high bounce rate on detail pages.
- **Fix:** Ensure listing detail page renders all fields stored in the `properties` table. Add a placeholder/empty state for fields that are not filled in.

### M-08 — Save and Share Listing Buttons Have No Visual Feedback
- **Page:** `/tenant/listing/[id]`
- **Evidence:** The Save (heart) and Share buttons have correct `aria-label` attributes but clicking Save showed no visual state change (filled vs. unfilled heart, confirmation toast, or loading indicator).
- **Impact:** Users don't know if the save worked. May click repeatedly.
- **Fix:** Toggle the heart icon fill state on click. Show a brief toast: "Listing saved." Consider persisting saved state to the server (currently localStorage only — lost on new device or browser).

### M-09 — Maintenance Errors Display at Page Bottom, Not Near Relevant Fields
- **Page:** `/tenant/maintenance` (new request)
- **Evidence:** "You don't have an active lease on file" and "Please select a category" errors appeared at the bottom of the page body text, far from the relevant form fields.
- **Fix:** Render validation errors inline, near the top of the form or next to the relevant input.

### M-10 — Tenant Dashboard H1 Shows First Name Only ("QA"), Not a Greeting
- **Page:** `/tenant`
- **Evidence:** The dashboard H1 is literally `"QA"` (the first name of the QA test account). No greeting text, no surname.
- **Fix:** Change to `"Welcome, QA"` or `"Hi, QA Tester"` to make the greeting readable as a sentence.

### M-11 — No Duplicate Application Prevention
- **Page:** `/tenant/apply/[id]`
- **Evidence:** The application form does not warn if the tenant has already applied to this listing. A tenant can navigate back and submit again.
- **Fix:** Check for existing applications on page load. If one exists, show "You already applied on [date]" and disable the form or redirect to the application status page.

### M-12 — No Feedback After Successful Application Submission
- **Page:** `/tenant/apply/[id]`
- **Evidence:** (Based on code review of `ApplicationForm.jsx`) After successful submit, the form navigates. There is no confirmation screen, toast, or email confirmation shown.
- **Fix:** Show a clear "Application submitted!" confirmation with next steps.

### M-13 — Nav Links Are 17px Tall — Well Below 44px Touch Target Minimum
- **Affected pages:** All pages with top navigation
- **Evidence:** Desktop nav links ("How It Works", "For Landlords", "Pay Rent", "My Dashboard") measured 17px height.
- **Impact:** WCAG 2.2 AA now requires 24×24px minimum touch targets (2.5.8). 17px fails this criterion, especially on mobile.
- **Fix:** Increase padding on nav links so the interactive area is at least 44×44px.

### M-14 — Signup Form: Date of Birth Field Has No Min/Max Age Validation Feedback
- **Page:** `/signup`
- **Evidence:** The field says "must be 18+" but there is no error message if a user enters a date that makes them under 18. The form proceeds.
- **Fix:** Add validation: if DOB < 18 years ago from today, show "You must be 18 or older to create an account."

---

## Low-Priority Issues

### L-01 — Page `<title>` Is the Same on Every Page
- **Evidence:** Every page — `/`, `/privacy`, `/terms`, `/tenant`, `/tenant/search` — returns `title="Settleed | Section 8 Housing Marketplace"`. No page-specific titles.
- **Impact:** Poor SEO. Screen reader users can't distinguish tabs. Browser history is unhelpful.
- **Fix:** Set unique, descriptive titles per page (e.g., "Find Section 8 Housing — Settleed", "Privacy Policy — Settleed").

### L-02 — Meta Description Is Generic
- **Evidence:** `<meta name="description" content="Settleed — Section 8 housing marketplace">` — the same 4-word description on every page.
- **Fix:** Write unique, keyword-rich meta descriptions per page template.

### L-03 — Testimonials Section Contains Placeholder / Fabricated Reviews
- **Page:** `/`
- **Evidence:** "What Our Community Says" section exists but the site has no real users yet. These may be fabricated quotes.
- **Impact:** Legal risk if fabricated; trust risk if users investigate.
- **Fix:** Remove or replace with honest "Beta coming soon" language until real testimonials exist.

### L-04 — Forgot Password Echoes Email Back to User
- **Page:** `/forgot-password`
- **Evidence:** After submitting any email (real or fake), the confirmation message reads "We sent a password reset link to [that exact email]."
- **Note:** This is acceptable UX (not a security issue since the same message shows for all emails), but displaying the email back adds minor phishing risk if the confirmation page can be screenshot-shared. Low risk.

### L-05 — "Repairs" Label in Bottom Nav Instead of "Maintenance"
- **Page:** `/tenant` bottom nav
- **Evidence:** Bottom nav shows "HomeSearchRepairsRentAccount" — the maintenance section is labelled "Repairs" in the nav but "Maintenance" as the page heading.
- **Fix:** Use consistent terminology throughout. Pick one and apply it everywhere.

### L-06 — No Loading States / Spinners on Data Fetch
- **Pages:** `/tenant/search`, `/tenant`
- **Evidence:** When the search page first loads, listings appear after a delay with no intermediate loading skeleton or spinner.
- **Fix:** Add skeleton cards or a spinner while listings load from Supabase.

### L-07 — "Voucher Estimator" and "Rent Analyzer" Tools Not Linked From Tenant Dashboard
- **Evidence:** Both tools are only accessible via the footer. No mention in the tenant dashboard or onboarding flow.
- **Fix:** Add links to both tools in the tenant dashboard or profile setup flow where they'd be most useful.

### L-08 — For-Landlords Page Has No Price Shown Until Signup
- **Page:** `/for-landlords`
- **Evidence:** The landlord marketing page explains the product but does not show the subscription price. Users must click through to signup to discover the $49/month price.
- **Impact:** Higher drop-off; landlords don't want to start a signup only to learn the price at checkout.
- **Fix:** Display the subscription price on the `/for-landlords` page.

### L-09 — No Favicon or PWA Icon at 192×192
- **Evidence:** `GET /favicon.ico` and `GET /icon-192.png` both had transferSize=0 in performance entries, indicating they may be missing or misconfigured.
- **Fix:** Ensure `favicon.ico`, `icon-192.png`, and `icon-512.png` are in the `/public` directory and deployed.

### L-10 — Housing Authority Options Limited to Georgia Only
- **Pages:** `/signup`, `/tenant/apply/[id]`
- **Evidence:** Housing authority dropdown lists only Georgia HAs (AHA, DCA, Cobb, DeKalb). If you select "Other" it still proceeds, but the UX implies Georgia-only.
- **Fix:** This is fine for Atlanta-first launch. Consider adding an explanatory line: "Settleed is currently available in Atlanta, GA."

---

## Detailed Bug Table

| ID | Page | Role | Device | Severity | Priority | Description | Expected | Actual | Likely Cause | Fix |
|----|------|------|--------|----------|----------|-------------|----------|--------|--------------|-----|
| C-01 | All | Any | All | Critical | P0 | Stripe publishable key empty — console throws IntegrationError | Stripe loads silently | Error × 2 on every page load; subscribe flow broken | `VITE_STRIPE_PUBLISHABLE_KEY` env var not set in Vercel | Add live publishable key to Vercel env |
| C-02 | /tenant/search | Tenant | All | Critical | P0 | Listing card shows `$/mo`, `null bd · null ba` | Formatted listing data | Raw null values rendered | No null guards in listing card component; missing DB constraints | Add null checks + enforce required fields |
| C-03 | All | Any | All | Critical | P0 | No EHO / Fair Housing language anywhere on site | EHO statement in footer and Terms | Absent | Not built | Add EHO statement to footer and Terms |
| C-04 | /tenant/profile | Tenant | All | Critical | P1 | No account deletion option | "Delete my account" in profile | Only Sign Out available | Feature not built | Build account deletion flow with data wipe |
| H-01 | /signup, /apply | Any | All | High | P1 | No inline validation errors on form submit | Red error messages per field | No visible errors; silent fail | No validation error rendering in React | Add per-field validation with aria-describedby |
| H-02 | /apply, /tools | Tenant | All | High | P1 | Form inputs have no `<label>` | Labelled inputs | `id=""`, no label | Components use placeholder instead of label | Add explicit `<label>` or `aria-label` to all inputs |
| H-03 | All | Any | All | High | P1 | No `<main>` landmark or skip link | `<main>` + skip nav | Neither present | Not built | Add `<main>` wrapper and skip link |
| H-04 | /tenant/maintenance | Tenant | All | High | P2 | Bottom nav renders twice | Single nav | Duplicated "HomeSearchRepairsRentAccount" | Duplicate BottomNav render in form overlay | Remove duplicate BottomNav from form component |
| H-05 | /landlord/listings/new, /landlord/subscribe | Tenant | All | High | P2 | Returns 404 instead of redirect | Redirect to /tenant | 404 page | Router doesn't handle these paths for tenant role | Add role-based redirect for all /landlord/* routes |
| H-06 | /tenant/maintenance | Tenant | All | High | P2 | Lease check happens after form fill | Warning before form | Error after submit | Validation order | Move no-lease check to page mount |
| H-07 | /apply, /maintenance | Tenant | All | High | P2 | No message character limit | 500 char max with counter | 5,000+ chars accepted | No maxlength or validation | Add maxlength + character counter |
| H-08 | /tenant/search | Tenant | All | High | P2 | Filters stick; no "Clear filters" button | One-click reset | Must hard reload page | No reset handler | Add Clear Filters button |
| H-09 | All (logged in) | Any | All | High | P1 | "Go to Dashboard" nav link ~1:1 contrast ratio | ≥4.5:1 contrast | ~1:1 blue on navy | Unstyled link inherits browser default blue | Apply explicit white/light color to nav links |
| M-01 | /tools/voucher-estimator | Any | All | Medium | P2 | Estimator shows no result after submit | Voucher estimate displayed | No visible change | Possible React state/event issue or below fold | Verify and fix result rendering |
| M-02 | /terms | Any | All | Medium | P2 | No governing law clause | GA jurisdiction specified | Absent | Not written | Add Governing Law section |
| M-03 | /terms | Any | All | Medium | P2 | No refund/cancellation policy | Clear refund terms | Absent | Not written | Add Refund & Cancellation section |
| M-04 | /privacy | Any | All | Medium | P2 | Privacy Policy lists unimplemented services (Twilio, Cloudinary) | Only active integrations listed | Twilio + Cloudinary mentioned | Premature disclosure | Remove until integrated |
| M-05 | / | Any | All | Medium | P3 | H1 text missing space: "NextSection" | "Next Section 8 Home" | "NextSection 8 Home" | Span break without space | Add space between span elements |
| M-06 | / | Any | All | Medium | P2 | Featured listing cards link to signup not listing detail | Link to listing page | Links to /signup?role=tenant | Intentional but bad UX | Link to public listing preview or browse |
| M-07 | /tenant/listing/[id] | Tenant | All | Medium | P1 | Listing detail missing description, amenities, photos, map | Full listing content | Minimal data only | Fields not rendered in component | Render all available listing fields |
| M-08 | /tenant/listing/[id] | Tenant | All | Medium | P2 | Save button no visual feedback | Heart fills / toast shows | No state change | Missing UI state update | Toggle icon state; add save confirmation toast |
| M-09 | /tenant/maintenance | Tenant | All | Medium | P2 | Validation errors at bottom of page | Errors near relevant field | Errors at page bottom | Error rendering position | Move error display to top of form or inline |
| M-10 | /tenant | Tenant | All | Medium | P3 | Dashboard H1 is just first name "QA" | "Welcome, QA Tester" | "QA" | String template issue | Add greeting prefix |
| M-11 | /tenant/apply/[id] | Tenant | All | Medium | P2 | No duplicate application prevention | Warning if already applied | Form opens fresh | No existing application check | Query existing apps on mount |
| M-12 | /tenant/apply/[id] | Tenant | All | Medium | P2 | No confirmation screen after application submit | "Application submitted!" | Silent redirect | No confirmation state | Add success screen with next steps |
| M-13 | All | Any | Mobile | Medium | P2 | Nav links 17px tall — below 44px touch target | ≥44px height | 17px | Insufficient padding | Increase nav link padding |
| M-14 | /signup | Any | All | Medium | P2 | Under-18 DOB accepted silently | "Must be 18+" error | No error shown | No age validation logic | Add DOB validation against 18yr threshold |
| L-01 | All | Any | All | Low | P3 | Same `<title>` on every page | Unique per-page title | Identical title | Not set per route | Add per-route `<title>` via document.title or Helmet |
| L-02 | All | Any | All | Low | P3 | Generic meta description on every page | Unique descriptions | Same on all pages | Not implemented | Write per-page meta descriptions |
| L-03 | / | Any | All | Low | P3 | Testimonials may be fabricated | Real community testimonials | Placeholder content | No real users yet | Remove or mark as "coming soon" |
| L-04 | /tenant/maintenance | Tenant | All | Low | P3 | "Repairs" nav label vs "Maintenance" page heading | Consistent terminology | Mismatch | Naming inconsistency | Standardise on one term |
| L-05 | /tenant/search | Tenant | All | Low | P3 | No loading skeletons while listings fetch | Skeleton cards | Blank then pop-in | No loading state | Add skeleton loader |
| L-06 | / | Any | All | Low | P3 | Favicon and PWA icons may be missing | Icons load | transferSize=0 | Missing from /public | Ensure favicon.ico and icon PNGs are deployed |
| L-07 | /for-landlords | Landlord | All | Low | P3 | Subscription price not shown before signup | Price visible on marketing page | Price hidden until signup | Intentional but conversion-killing | Display $49/mo on the marketing page |

---

## Workflow Scorecard

| Area | Score | Notes |
|------|-------|-------|
| Homepage & Navigation | 6/10 | Good layout, but missing EHO, H1 space bug, fabricated testimonials, same-page title on all routes |
| Tenant Registration | 7/10 | Fast flow, auto-selects role from URL param, but zero inline validation errors |
| Tenant Profile | 6/10 | Profile wizard skippable (good), but no delete account, limited fields visible |
| Property Search | 6/10 | Search and HA/BR filters work; no sort, no price filter, no clear button, null listing card |
| Tenant Inquiries / Applications | 5/10 | Application form works end-to-end but no confirmation screen, no duplicate prevention, no char limit, unlabelled fields |
| Landlord Registration | 7/10 | Registration flow works (not tested in this session as new landlord; based on smoke test) |
| Landlord Profile | 6/10 | Similar issues to tenant profile |
| Property Creation | 6/10 | Listing form exists with 9 steps; subscription gate works; null data issue in production |
| Listing Management | 5/10 | No evidence of edit/deactivate/delete working from this session; listing detail page very sparse |
| Payments & Subscriptions | 1/10 | Completely broken — Stripe publishable key missing |
| Authentication | 8/10 | Signup, login, forgot password all functional; forgot password doesn't enumerate accounts; RLS blocks cross-user data access |
| Permissions & Privacy | 7/10 | Role-based routing mostly correct (tenant→landlord redirects); RLS verified blocking cross-tenant writes; 2 landlord subroutes return 404 instead of redirect |
| Mobile Responsiveness | 7/10 | No horizontal overflow at 375px; hamburger menu present; touch targets too small on nav |
| Accessibility | 3/10 | Missing skip link, `<main>` landmark, form labels, low-contrast nav link; no visible focus styles confirmed |
| Performance | 6/10 | No obvious critical resource loading issues; no loading skeletons; Stripe fires twice on load |
| Trust & Credibility | 4/10 | No EHO statement, possibly fabricated testimonials, no refund policy, no governing law |
| Overall Usability | 6/10 | Core flows work; too many rough edges (null data, no confirmations, no validation feedback) for public launch |

---

## Missing Features

### Needed Before Beta
- **Equal Housing Opportunity statement** (footer + Terms) — legal requirement
- **Account deletion / right to erasure** — privacy law compliance
- **Inline form validation errors** — without these, users can't self-recover from mistakes
- **Stripe publishable key in production** — payments 100% broken without it
- **Null-field guards on listing cards** — live null data in production is unacceptable
- **Listing detail page full content** — tenants cannot evaluate housing from current sparse view
- **Duplicate application prevention** — users must not be able to apply twice

### Needed Before Public Launch
- **Application confirmation screen** — users need certainty their application was received
- **Clear filters button on search** — basic search UX expectation
- **Governing law and refund/cancellation terms** — legal minimum for a paid SaaS
- **Loading states** on all data-fetching pages (skeleton cards or spinners)
- **Character limits + counters** on all text areas
- **Page-specific `<title>` tags** — SEO and usability
- **Touch target sizing** — 44×44px minimum for all interactive elements
- **Real testimonials or honest placeholder** language
- **No-lease warning shown before maintenance form** fills

### Appropriate for Later Release
- Photo galleries with multiple images on listing detail
- Map integration on listing detail
- Sort options on search (by price, availability, etc.)
- Advanced filters (pets, accessibility, parking, utilities)
- Twilio SMS notifications
- Cloudinary image optimization
- Playwright / Cypress E2E test suite
- Admin dashboard for moderation
- Fraud reporting flow
- Recertification alerts

---

## Recommended Launch Checklist (In Priority Order)

- [ ] **1.** Set `VITE_STRIPE_PUBLISHABLE_KEY` in Vercel → redeploy → confirm subscribe flow loads
- [ ] **2.** Add null guards to listing card component for rent, bedrooms, bathrooms, address
- [ ] **3.** Add EHO statement and logo to footer; add Fair Housing section to Terms
- [ ] **4.** Build account deletion in `/tenant/profile` and `/landlord/profile`
- [ ] **5.** Add inline validation error messages to signup, application, and all major forms
- [ ] **6.** Add `<label>` or `aria-label` to all form inputs (signup, apply, tools)
- [ ] **7.** Add `<main>` landmark wrapper and skip-to-content link to all pages
- [ ] **8.** Fix bottom nav duplication on maintenance page
- [ ] **9.** Fix role-based routing: tenant visiting `/landlord/listings/new` or `/landlord/subscribe` should redirect, not 404
- [ ] **10.** Show no-active-lease warning before the maintenance form opens
- [ ] **11.** Add character limits (500 chars) + counters to message and description textareas
- [ ] **12.** Fix "Go to Dashboard" nav link contrast (white text instead of browser-default blue)
- [ ] **13.** Fix H1 missing space: "Find Your Next Section 8 Home"
- [ ] **14.** Add duplicate application check on `/tenant/apply/[id]`
- [ ] **15.** Add application submission confirmation screen
- [ ] **16.** Add Clear Filters button to search page
- [ ] **17.** Fix governing law and add refund/cancellation section to Terms
- [ ] **18.** Remove Twilio and Cloudinary from Privacy Policy until integrated
- [ ] **19.** Populate listing detail page with description, amenities, photos, utilities, pet policy, parking
- [ ] **20.** Add Save listing visual feedback (heart toggle + toast)
- [ ] **21.** Add under-18 DOB validation error on signup
- [ ] **22.** Add loading skeletons to search and dashboard
- [ ] **23.** Set unique `<title>` and meta description per page/route
- [ ] **24.** Ensure favicon.ico, icon-192.png, icon-512.png are in /public and deployed
- [ ] **25.** Increase nav link padding to ≥44px touch target height
- [ ] **26.** Replace or clearly label testimonials as "early community feedback" or remove

---

## Automated Test Cases

### AT-01 — Stripe Loads Without Console Error
**Tool:** Playwright + playwright-network-observer  
**Priority:** P0  
**Scenario:** Homepage loads, Stripe initialises correctly  
**Steps:**
1. Navigate to `https://www.settleed.com/`
2. Wait for `DOMContentLoaded`
3. Collect all console errors

**Expected:** Zero `IntegrationError` messages from `js.stripe.com`  
**Assertion:** `expect(consoleErrors.filter(e => e.includes('IntegrationError'))).toHaveLength(0)`

---

### AT-02 — Null Listing Fields Never Rendered
**Tool:** Playwright  
**Priority:** P0  
**Scenario:** Search page never shows raw null values  
**Steps:**
1. Sign in as tenant
2. Navigate to `/tenant/search`
3. Wait for listings to load
4. Assert page text

**Expected:** Page text does not contain `null`, `undefined`, `$/mo`, or `null bd`  
**Assertion:** `expect(await page.content()).not.toMatch(/null bd|null ba|\$\/mo|undefined/)` 

---

### AT-03 — Tenant Cannot Access Landlord Dashboard
**Tool:** Playwright  
**Priority:** P1  
**Scenario:** Cross-role protection  
**Steps:**
1. Sign up and log in as tenant
2. Navigate to `/landlord`
3. Assert redirect

**Expected:** URL changes to `/tenant` within 2 seconds  
**Assertion:** `await expect(page).toHaveURL(/\/tenant/, { timeout: 2000 })`

---

### AT-04 — RLS Blocks Cross-Tenant Application Read
**Tool:** Vitest + Supabase test client  
**Priority:** P1  
**Scenario:** Tenant A cannot read Tenant B's application via REST API  
**Steps:**
1. Create Tenant A and Tenant B via Supabase auth
2. Tenant B submits an application (record ID known)
3. Tenant A's session calls `GET /rest/v1/applications?id=eq.[Tenant B application ID]`

**Expected:** Response returns empty array `[]`  
**Assertion:** `expect(data).toHaveLength(0)`

---

### AT-05 — Signup Requires Valid Email and 8+ Character Password
**Tool:** Playwright  
**Priority:** P1  
**Scenario:** Form validation on signup  
**Steps:**
1. Navigate to `/signup?role=tenant`
2. Fill first name, last name, phone, DOB
3. Enter `notanemail` in email field
4. Enter `1234567` (7 chars) in password field
5. Click "Create account"

**Expected:** Inline error messages appear for email and password fields; form does not submit  
**Assertion:** `expect(await page.locator('[data-testid="email-error"]')).toBeVisible()`

---

### AT-06 — Forgot Password Returns Same Message for Real and Fake Emails
**Tool:** Playwright  
**Priority:** P1  
**Scenario:** No user enumeration via forgot-password  
**Steps:**
1. Navigate to `/forgot-password`
2. Submit with `doesnotexist999@fake.com`
3. Save confirmation message
4. Navigate back, submit with a real registered email
5. Save confirmation message

**Expected:** Both messages are identical (anti-enumeration)  
**Assertion:** `expect(msgFake).toEqual(msgReal)`

---

### AT-07 — Application Form Blocks Duplicate Submission
**Tool:** Playwright  
**Priority:** P2  
**Scenario:** Tenant applies twice to same listing  
**Steps:**
1. Sign in as tenant
2. Navigate to `/tenant/apply/[listingId]`
3. Fill and submit application
4. Navigate back to `/tenant/apply/[listingId]`

**Expected:** Page shows "You already applied on [date]" and disables the form  
**Assertion:** `expect(await page.locator('[data-testid="already-applied"]')).toBeVisible()`

---

### AT-08 — Message Field Enforces 500 Character Limit
**Tool:** Playwright  
**Priority:** P2  
**Scenario:** Textarea rejects oversized input  
**Steps:**
1. Navigate to `/tenant/apply/[listingId]`
2. Type a 600-character string into the message field
3. Check `.value.length`

**Expected:** Field value truncated to ≤ 500 characters  
**Assertion:** `expect(await page.inputValue('textarea[name="message"]')).toHaveLength.lessThanOrEqual(500)`

---

### AT-09 — All Pages Have Unique Titles
**Tool:** Playwright (parameterised)  
**Priority:** P3  
**Scenario:** SEO and screen-reader usability  
**Steps:**
1. Navigate to each route: `/`, `/login`, `/signup`, `/tenant`, `/tenant/search`, `/tenant/profile`, `/terms`, `/privacy`
2. Collect `document.title` for each

**Expected:** All titles are unique strings  
**Assertion:** `expect(new Set(titles).size).toEqual(titles.length)`

---

### AT-10 — Lighthouse Accessibility Score ≥ 85
**Tool:** Lighthouse CI  
**Priority:** P1  
**Scenario:** Automated accessibility baseline  
**Steps:**
1. Run Lighthouse against `/`, `/signup`, `/tenant/search`
2. Assert accessibility score

**Expected:** Score ≥ 85 on all three pages  
**Configuration:** Add to CI pipeline: `lhci autorun --collect.url=https://www.settleed.com --assert.preset=lighthouse:recommended`

---

*Report generated July 28, 2026. All findings are based on live production testing of https://www.settleed.com/ using Chrome browser with Claude extension. Issues marked "Recommendation" could not be directly confirmed via automated test and should be manually verified.*
