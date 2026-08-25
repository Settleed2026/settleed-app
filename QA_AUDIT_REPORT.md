# Settleed Launch-Readiness QA Audit Report
**Date:** August 25, 2026  
**Auditor:** Claude (Cowork)  
**Site tested:** https://www.settleed.com/  
**Method:** Live browser testing via Chrome MCP — navigation, JavaScript DOM inspection, and content review across all accessible public and protected routes

---

## 1. EXECUTIVE VERDICT

### 🚫 NO-GO

**Settleed is NOT safe to launch in its current deployed state.**

Five blocker-level issues must be resolved before any public-facing landlord or tenant is allowed to use the site:

1. A live subscription pricing page ($49/mo + $4.99/mo) contradicts the free-launch strategy and will damage trust immediately
2. Fabricated testimonials ("Tamara J.", "Marcus D.") expose Settleed to FTC regulatory risk
3. Hardcoded fake listings on the homepage misrepresent an empty marketplace
4. The /for-landlords page shows fake metrics ("340+ active tenants") before a single user exists
5. The /for-agencies route (a built feature) returns a 404 on the live site — a deployment gap

Once these five blockers are resolved, the core architecture is solid and a conditional launch is achievable quickly.

---

## 2. SITE MAP — ALL ROUTES TESTED

| Route | Status | Notes |
|---|---|---|
| / (Homepage) | ✅ Loads | Contains issues (see bugs) |
| /for-landlords | ✅ Loads | Contains issues (see bugs) |
| /for-agencies | ❌ 404 | Route built but not deployed |
| /listings | ✅ Loads | 0 listings (correct — empty marketplace) |
| /signup | ✅ Loads | Role picker works |
| /signup?role=landlord | ✅ Loads | Form fields render |
| /signup?role=tenant | ✅ Loads | Form fields render |
| /login | ✅ Loads | Minimal, functional |
| /admin/queue | ✅ Protected | "Access Denied" to non-admin ✅ |
| /subscribe | ❌ BLOCKER | Still live with $49 + $4.99 pricing |
| /terms | ✅ Loads | Has issues (see bugs) |
| /privacy | ✅ Loads | Adequate |
| /tools/voucher-estimator | ✅ Loads | Functional |
| /tools/rent-analyzer | ✅ Loads | Functional |
| /tenant (logged out) | ✅ Redirects | Correctly goes to /login |
| /tenant/rent (logged out) | ✅ Redirects | Correctly goes to /login |
| /404-anything | ✅ Custom page | Minimal but present |
| /robots.txt | ❌ Missing | Returns SPA HTML shell |
| /sitemap.xml | ❌ Missing | Returns SPA HTML shell |
| /manifest.json | ✅ | Present (PWA manifest) |

---

## 3. CRITICAL USER-JOURNEY RESULTS

| Journey | Result | Notes |
|---|---|---|
| New tenant registration | PARTIAL | Form renders; email verification not tested (need to complete full flow) |
| Tenant login | PASS | Redirects correctly |
| Tenant profile | BLOCKED | Requires login; auth works |
| Property search and filters | PARTIAL | Page loads, 0 listings, filters render |
| Tenant property inquiry | BLOCKED | No live listings to apply to |
| New landlord registration | PARTIAL | Form renders; fields correct |
| Landlord login | PASS | Redirects correctly |
| Landlord profile | BLOCKED | Requires login |
| Create a property listing | BLOCKED | Requires login + undeployed paywall removal |
| Upload property photos | BLOCKED | Cannot test without listing |
| Save and edit a draft | BLOCKED | Requires login |
| Submit a listing | BLOCKED | Requires login |
| Publish or approve a listing | BLOCKED | Requires admin access |
| Edit or deactivate a listing | BLOCKED | Requires login |
| Password reset | BLOCKED | Requires test account email delivery |
| Contact/support submission | FAIL | No contact form or page exists on the live site |
| Email and notification delivery | BLOCKED | Requires completing a flow |
| Mobile — tenant journey | PARTIAL | Responsive layout present; full flow untested |
| Mobile — landlord journey | PARTIAL | Responsive layout present; full flow untested |

---

## 4. BUG TABLE

### BLOCKER — Must fix before ANY public access

| ID | Severity | Role | Page | Issue | Expected | Actual | Fix |
|---|---|---|---|---|---|---|---|
| B-01 | **Blocker** | All | /subscribe | Subscription pricing page still live: $49/mo landlord + $4.99/mo tenant, "7-day free trial," "Card required" | Page should be removed or replaced with Early Access messaging | Full active Stripe paywall page | Remove route or replace with "Coming Soon / Early Access — Free" landing |
| B-02 | **Blocker** | All | / (homepage) | Two fabricated testimonials ("Tamara J., Southwest Atlanta" and "Marcus D., East Atlanta") presented as real community members — platform has no users yet | Real testimonials or none | Fake quotes published as real | Remove immediately. FTC guidelines on endorsements require testimonials to reflect honest opinions of real users. |
| B-03 | **Blocker** | All | / (homepage) | "Featured Homes" section shows 3 hardcoded fake property listings (East Atlanta $1,250, College Park $975, Decatur $1,450) that don't exist in the database. The /listings page correctly shows 0 results. | Either real listings from DB or no section at all | Fabricated listings presented as real marketplace inventory | Remove "Featured Homes" section OR replace with a message like "Be the first listing in Atlanta — add yours free" |
| B-04 | **Blocker** | All | /for-landlords | Page shows fabricated metrics: "340+ active tenants", "11 days avg. to fill" — platform has no tenants yet. Also shows "$49/month after trial · Card required · Cancel anytime" | Accurate copy reflecting free Early Access launch | False statistics and wrong pricing model | Remove fake stats entirely; update copy to "Free during Early Access" |
| B-05 | **Blocker** | All | /for-agencies | Route returns 404 — page was built in the codebase but not deployed to production | Page loads correctly | 404 error | Deploy latest code; verify route is in App.jsx build |

---

### CRITICAL — Fix before inviting any users

| ID | Severity | Role | Page | Issue | Expected | Actual | Fix |
|---|---|---|---|---|---|---|---|
| C-01 | **Critical** | All | Nav + Footer | "Admin" link is visible to ALL visitors in both the top navigation and footer — it links directly to /admin/queue | Admin link only visible to authenticated admin users | Publicly exposed admin link | Conditionally render admin link only when user is logged in as admin |
| C-02 | **Critical** | All | /terms | Section 7 is titled "Subscriptions, Payments, and Cancellations" and references the old paid model — the product is now free | Terms should reflect the actual product: free marketplace with no subscription | Stale terms referencing a billing model that was removed | Rewrite Section 7 to reflect free Early Access; add note about future monetization when applicable |
| C-03 | **Critical** | All | All pages | No Open Graph / social sharing meta tags (og:title, og:description, og:image) | When a landlord shares settleed.com in a text or on LinkedIn, a rich preview card appears | Bare URL with no preview | Add OG tags to the index.html or via React Helmet |
| C-04 | **Critical** | All | All pages | No favicon — browser shows blank tab icon | Settleed logo/brand icon appears in browser tab | Empty/default browser icon | Add favicon.ico and link it in index.html |
| C-05 | **Critical** | SEO | /robots.txt /sitemap.xml | Both routes return the React SPA HTML shell instead of actual files | /robots.txt returns crawl directives; /sitemap.xml returns XML with page URLs | SPA HTML returned for both | Create public/robots.txt and public/sitemap.xml in the Vite project |

---

### HIGH — Fix before wide public launch

| ID | Severity | Role | Page | Issue | Fix |
|---|---|---|---|---|---|
| H-01 | High | All | / Header | "Pay Rent" nav link goes to /signup?role=tenant — a logged-out visitor who wants to pay rent is confused | Link "Pay Rent" to /tenant/rent; hide entirely for logged-out visitors who have no rent to pay |
| H-02 | High | All | / Header | "For Landlords" nav item links to #landlords (a homepage anchor), not to the /for-landlords dedicated page | Change href to /for-landlords |
| H-03 | High | Tenant | / | "Find Housing" hero CTA → /signup. Forces signup before seeing any listings | Link "Find Housing" to /listings instead. Let them browse, then sign up to apply. |
| H-04 | High | Tenant | / | "View all" under Featured Homes → /signup instead of /listings | Link "View all" to /listings |
| H-05 | High | All | / | "ATLANTA'S #1 SECTION 8 MARKETPLACE" claim in hero is unsubstantiated — true only in that competitors don't exist, not proven by market data | Change to "Atlanta's Section 8 Marketplace" or "Atlanta's First Section 8 Marketplace" |
| H-06 | High | All | All | Meta description is "Settleed — Section 8 housing marketplace" — not keyword-rich or compelling | Update to: "Find verified Section 8 landlords in Atlanta. Free for voucher holders. Every listing accepts Housing Choice Vouchers." |

---

### MEDIUM — Important, not blocking launch

| ID | Severity | Role | Page | Issue | Fix |
|---|---|---|---|---|---|
| M-01 | Medium | Tenant | /signup?role=tenant | Date of birth required at signup — adds friction and raises data minimization questions (why does a marketplace need DOB?) | Move DOB to profile setup post-signup, or make optional with a note about 18+ requirement |
| M-02 | Medium | Both | /signup | Mobile phone required for both landlords and tenants at signup — some users won't provide this upfront | Make mobile phone optional at signup; collect during profile setup |
| M-03 | Medium | All | Site-wide | No contact page, no contact form, no FAQ page — visitors who have questions have no clear path to help | Add a simple contact page with a form that fires to your email (similar to /for-agencies form) |
| M-04 | Medium | All | / 404 page | 404 page says "This page does not exist. Go home." — no helpful navigation, no explanation | Add links to /listings, /signup, /for-landlords; improve copy |
| M-05 | Medium | All | Site-wide | Canonical URL not set — both www.settleed.com and settleed.com may be indexed separately by Google | Add <link rel="canonical"> to all pages or configure Vercel to enforce www redirect |
| M-06 | Medium | SEO | Site-wide | No sitemap.xml — Google has no structured list of indexable pages | Create public/sitemap.xml with all public routes |
| M-07 | Medium | Landlord | /for-landlords | Page has an apparent truncated testimonial starting with "As a..." — appears to be a placeholder not fully rendered | Verify the full testimonial text renders correctly |

---

### LOW / COSMETIC

| ID | Severity | Issue | Fix |
|---|---|---|---|
| L-01 | Low | 404 page title is "Settleed \| Section 8 Housing Marketplace" — not "Page Not Found \| Settleed" | Update page title for 404 |
| L-02 | Low | Privacy Policy dated June 2026, Terms dated July 2026 — slight date discrepancy | Update privacy to July or August 2026 |
| L-03 | Low | No "About" page — visitors can't learn who built Settleed or why | Add minimal about page |
| L-04 | Low | Tools pages use "Get Started Free" button that links to /for-landlords — confusing from a tenant-facing tool | Link tools page CTA to /signup?role=tenant for voucher estimator, /for-landlords for rent analyzer |
| L-05 | Cosmetic | Footer column "Company" contains "Admin" link — should be removed from public footer | Remove admin from footer |

---

## 5. MISSING OR INCOMPLETE FEATURES

### Required before launch
- Remove /subscribe page or replace with Early Access free messaging
- Remove fake testimonials
- Remove fake featured listings OR replace with real data fetch
- Fix /for-agencies 404 (deploy latest code)
- Update /for-landlords copy from $49/mo to "Free"
- Hide Admin link from public nav/footer
- Update Terms Section 7 to remove subscription references

### Strongly recommended before launch
- Add favicon
- Add OG meta tags
- Create robots.txt (allow all / disallow /admin)
- Create sitemap.xml
- Add contact page
- Make mobile phone optional at signup
- Change "Find Housing" CTA to /listings

### Safe to add after launch
- FAQ page
- About page
- Full sitemap with dynamic listing URLs
- Social sharing image (og:image)
- Testimonials (once real users exist)
- Analytics event tracking verification

---

## 6. CONTENT AND TRUST REVIEW

| Item | Concern | Action |
|---|---|---|
| "ATLANTA'S #1 SECTION 8 MARKETPLACE" | Unsubstantiated superlative claim — legally and ethically questionable | Change to "Atlanta's Section 8 Marketplace" |
| Fake testimonials (Tamara J., Marcus D.) | FTC endorsement guidelines prohibit fabricated reviews | Remove immediately — this is a regulatory risk |
| Fake featured listing cards | Misrepresents marketplace inventory; could be considered deceptive advertising | Remove or replace with "Add the first listing" prompt |
| "340+ active tenants" on /for-landlords | False statistic — 0 tenants exist | Remove all stats until real |
| "11 days avg. to fill" on /for-landlords | False statistic — no leases have occurred | Remove all stats until real |
| Terms Section 7 (Subscriptions) | References a billing model that was removed | Update before any user signs up |
| No fraud/scam warning for tenants | Best practice for housing marketplaces — "Never wire money before viewing a property" | Add to listings page and tenant FAQ |
| No disclaimer that Settleed ≠ housing authority | Could confuse HCV families | Add brief clarifier: "Settleed is a private marketplace, not affiliated with HUD, AHA, or any housing authority" (already partially present in Terms but not on public pages) |
| DOB collected at signup | Data minimization best practice — only collect what you need | Move post-signup or make optional |

---

## 7. MOBILE AND ACCESSIBILITY RESULTS

**Note:** Full mobile/accessibility testing was limited by browser extension disconnections during the audit. The following is based on what was observable.

**Positive:**
- Skip to content link is present ✅
- `<main>` landmark present ✅ (from prior audit fixes)
- EHO statement in footer ✅
- Color theme (#1B3A6B navy) used consistently
- Viewport meta tag present ✅

**Requires follow-up testing (blocked during this audit):**
- Form label associations on signup forms (prior fixes should be in place but couldn't verify live)
- Focus indicators on interactive elements
- Image alt text on listing cards and logo
- Tap target sizes on mobile
- Keyboard navigation through signup flow
- Screen reader compatibility of role picker

---

## 8. DATA, PRIVACY, AND SECURITY OBSERVATIONS

| Observation | Severity | Notes |
|---|---|---|
| Admin route (/admin/queue) is protected | ✅ Pass | "Access Denied" correctly shown to unauthenticated visitors |
| Protected routes redirect to /login | ✅ Pass | /tenant, /tenant/rent all redirect correctly |
| Admin link in public nav/footer | ⚠️ Medium | Exposes admin URL to all visitors; though protected, remove from public nav |
| Date of birth collected at signup | ⚠️ Medium | DOB is sensitive PII; verify it's stored securely in Supabase with RLS and never exposed to other users |
| Mobile phone collected at signup (required) | ⚠️ Low | Ensure not exposed in any landlord-facing tenant profile view |
| No CAPTCHA or rate limiting on signup | ⚠️ Note | Acceptable at low scale; monitor for abuse |
| HTTPS | ✅ Pass | Site is fully served over HTTPS |
| Supabase keys | ✅ Confirmed out-of-scope | SUPABASE_SERVICE_ROLE_KEY should never appear client-side; verify in Vercel env vars only |

---

## 9. LAUNCH CHECKLIST

### ✋ Must fix before ANY public access
- [ ] Remove or replace /subscribe page (fake pricing)
- [ ] Remove fabricated testimonials (Tamara J. and Marcus D.)
- [ ] Remove hardcoded fake featured listings from homepage
- [ ] Update /for-landlords copy: remove "$49/month", fake stats ("340+ tenants", "11 days")
- [ ] Deploy latest code (fixes /for-agencies 404, deploys paywall removal from dashboard)
- [ ] Hide "Admin" link from public nav and footer
- [ ] Update Terms of Service Section 7 to remove subscription language

### ✅ Must verify before public access
- [ ] Complete one full landlord signup → listing form → submission flow end-to-end
- [ ] Complete one full tenant signup → search → apply flow end-to-end
- [ ] Confirm email delivery: welcome email, listing submitted email, admin notification
- [ ] Confirm admin can approve a listing in /admin/queue
- [ ] Confirm /for-agencies page loads and form submits correctly after deploy

### 📋 Recommended within 7 days of launch
- [ ] Add favicon
- [ ] Add OG meta tags (og:title, og:description, og:image)
- [ ] Create public/robots.txt
- [ ] Create public/sitemap.xml
- [ ] Change "Find Housing" CTA on homepage to /listings (let users browse before signing up)
- [ ] Fix "Pay Rent" nav link behavior for logged-out visitors
- [ ] Fix "For Landlords" nav to link to /for-landlords instead of #landlords anchor
- [ ] Add fraud/scam safety warning to listings page and tenant onboarding
- [ ] Add "Settleed is not affiliated with HUD or any housing authority" disclaimer on public pages
- [ ] Make mobile phone optional at signup (or move to profile step)
- [ ] Consider removing DOB from signup (move to profile completion)

### 🗓 Recommended within 30 days of launch
- [ ] Add contact page + support form
- [ ] Add minimal FAQ page
- [ ] Add About page (you, the mission, AHA background)
- [ ] Improve 404 page with navigation links
- [ ] Add real testimonials as they become available (get written permission, archive evidence)
- [ ] Full accessibility audit (keyboard, screen reader, contrast)
- [ ] Full mobile device testing (iPhone Safari, Android Chrome)
- [ ] Add analytics conversion events (signup, listing_created, application_submitted)
- [ ] Verify canonical URL / www redirect configuration in Vercel

---

## 10. FINAL RETEST PLAN

After fixing the 7 blockers above, retest in this exact order:

1. **Navigate to /subscribe** — verify it redirects to home or shows Early Access page (not $49 pricing)
2. **Navigate to / (homepage)** — verify: no fake testimonials, no fake listing cards, "Find Housing" goes to /listings, no Admin in nav
3. **Navigate to /for-landlords** — verify: no dollar amounts, no fake stats, correct Early Access messaging
4. **Navigate to /for-agencies** — verify page loads (not 404)
5. **Navigate to /admin/queue logged out** — verify "Access Denied" still shows, Admin link not in nav
6. **Complete full landlord signup** with fresh email → verify dashboard loads, no subscription prompt
7. **Complete landlord listing form** → submit for review → verify admin receives email notification
8. **Complete full tenant signup** → verify search page loads → verify saved search works
9. **Confirm admin can approve listing** in /admin/queue
10. **Confirm matching listing appears on /listings** after approval

---

## 11. TOP 5 MUST-DO BEFORE PUBLIC LAUNCH

In priority order:

**1. Kill the fake social proof** — Remove the fabricated testimonials and fake listing cards from the homepage today. This is both a legal risk (FTC) and a trust killer. When your first real landlord or tenant visits and sees fake reviews, you've lost them.

**2. Kill the /subscribe page** — It's still live, it shows $49/mo, and someone WILL find it. A landlord who just agreed to list for free after your phone call finds this page and wonders what the catch is. Remove or redirect to home.

**3. Fix /for-landlords copy** — "Start your 7-day free trial" and "340+ active tenants" must go. Replace the whole pricing section with a simple "Free during Early Access. No card required. Be a founding member." and remove all stats.

**4. Deploy the code** — The paywall removal from the dashboard, the /for-agencies route, and any other uncommitted changes need to be committed, pushed, and deployed. Run a post-deploy check.

**5. Hide the Admin link** — It's in the public nav AND the footer. Every visitor sees it. It looks unprofessional and exposes your admin URL. One line of conditional rendering fixes it.

Fix these five things and you have a credible, honest marketplace ready for your first 25 landlords.
