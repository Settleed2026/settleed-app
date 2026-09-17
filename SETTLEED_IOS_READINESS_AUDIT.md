# SETTLEED iOS APP READINESS AUDIT
**Date:** September 14, 2026  
**Prepared for:** Demetrius Wilburn, Founder/CEO — Settleed  
**Scope:** Architecture and feasibility assessment only. No code was modified.

---

## EXECUTIVE SUMMARY

Settleed is a fully-functional React web application deployed at settleed.com. It is **not** currently an iOS app and has no native code. The app has a solid mobile-first foundation — a PWA manifest, a service worker, role-based bottom navigation, and responsive Tailwind CSS layouts — but these features do NOT make it submittable to the Apple App Store.

**Bottom line:** Getting Settleed into the App Store is achievable, but requires hardware (a Mac), a $99/year Apple Developer Account, and roughly 3–6 weeks of engineering work to wrap the existing app in a native shell. The fastest path is **Capacitor** — it converts your existing React codebase into a real iOS app with minimal rewriting. This report covers exactly what needs to happen, what's already good, and what the blockers are.

---

## SECTION 1 — CURRENT ARCHITECTURE OVERVIEW

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + Vite 5 | SPA, JavaScript (not TypeScript) |
| Styling | Tailwind CSS 3 | Mobile-first utility classes |
| Routing | React Router v6 | Client-side, 37 routes |
| Auth | Supabase Auth (email/password only) | No Google, no Apple OAuth |
| Database | Supabase (PostgreSQL + RLS) | Real-time subscriptions |
| Storage | Cloudinary | Photos and documents |
| Payments | Stripe | Subscriptions + rent payments |
| Email | SendGrid | Transactional only |
| Maps | Leaflet.js via CDN | Loaded dynamically at runtime |
| Hosting | Vercel (Hobby plan) | 12 serverless API functions |
| Icons | lucide-react | All UI icons |
| Real-time | Supabase channel subscriptions | Messaging system |

**What is NOT present:**
- No React Native code
- No Capacitor / Ionic / Cordova / Expo
- No Swift, Objective-C, or Xcode project files
- No native iOS SDKs
- No Firebase / OneSignal (no push notification infrastructure)
- No Apple Sign In

---

## SECTION 2 — PWA READINESS ASSESSMENT

The app has a meaningful PWA foundation, which is good news for the Capacitor wrapper path.

**What exists:**

| Item | Status | Location |
|---|---|---|
| `manifest.json` | ✅ Present | `public/manifest.json` |
| `display: standalone` | ✅ Set | Users don't see browser chrome |
| `orientation: portrait-primary` | ✅ Set | Matches mobile UX |
| `theme_color: #1B3A6B` | ✅ Set | Settleed navy |
| `background_color: #ffffff` | ✅ Set | Clean splash |
| Service Worker (`sw.js`) | ✅ Present + registered | `public/sw.js` |
| SW network-first for APIs | ✅ Implemented | Supabase + Stripe bypass cache |
| SW cache-first for assets | ✅ Implemented | JS/CSS/images cached |
| Offline SPA fallback | ✅ `/index.html` | Works without network |
| PWA icons (192×192) | ❌ **MISSING** | Referenced but file not found |
| PWA icons (512×512) | ❌ **MISSING** | Referenced but file not found |
| OG image | ✅ Present | `public/og-image.png` (1200×630) |

**Critical gap:** `manifest.json` references `/icon-192.png` and `/icon-512.png` but neither file exists in the `public/` folder. The PWA is currently broken for "Add to Home Screen" — no icon appears. This must be fixed before ANY iOS submission.

**Service Worker quality:** The `sw.js` implementation is solid. It correctly bypasses the cache for API calls, Supabase, and Stripe, and caches static assets aggressively. The offline SPA fallback (`/index.html`) means the app shell loads even without network.

---

## SECTION 3 — THE THREE PATHS TO THE APP STORE

There are three realistic options. Here is an honest assessment of each.

### Path A: Capacitor Wrapper (RECOMMENDED)
Capacitor (by Ionic) wraps your existing React web app in a native iOS shell using WKWebView. You keep 100% of your existing code and add a thin native layer.

**Pros:**
- Keeps all existing React code unchanged
- Adds native features (push notifications, camera, file access) via plugins
- Real App Store binary (not rejected like bare website wrappers)
- Well-documented, large community
- Typically 3–4 weeks to first TestFlight build

**Cons:**
- Requires Mac + Xcode (hard blocker if you don't have a Mac)
- Still need Apple Developer Account ($99/yr)
- Leaflet CDN dependency may have issues offline — maps need testing

**Estimated effort:** 3–4 weeks part-time, primarily setup and App Store submission process

### Path B: React Native Rewrite
Full rebuild of the frontend in React Native (or Expo) using native components.

**Pros:**
- Fully native UI feel
- Better performance on complex screens
- True cross-platform (iOS + Android from one codebase)

**Cons:**
- Rewrite of all 37 routes (~40+ components) from scratch
- Tailwind CSS doesn't work in React Native
- Leaflet maps don't work — need react-native-maps
- Stripe SDK changes
- Estimated: 3–6 months minimum
- Very expensive relative to Capacitor

**Recommendation:** Skip this for now. Capacitor gets you to the same goal 80% faster.

### Path C: WKWebView Minimal Shell (NOT RECOMMENDED)
A minimal Swift app that loads `https://settleed.com` in a WKWebView.

**Pros:** Fastest to write

**Cons:**
- Apple's App Store Review Guidelines explicitly reject apps that are "simply a website displayed in an app" (Guideline 4.2)
- Very high chance of App Store rejection
- No offline capability
- No push notifications

**Recommendation:** Do not pursue this path.

---

## SECTION 4 — HARD BLOCKERS (MUST RESOLVE BEFORE ANY SUBMISSION)

These are binary blockers — the App Store submission cannot proceed without resolving all of them.

### Blocker 1: No Mac / Xcode
Apple requires Xcode (Mac-only software) to compile and submit iOS apps. There is no workaround for this. Options:
- Buy a Mac Mini (M4, ~$599) — the cheapest path
- Rent cloud Mac (MacStadium, AWS EC2 Mac, Codemagic) — ~$50–100/month, viable for CI/CD
- Use a service like Codemagic or Bitrise for cloud builds — Capacitor apps work well with these

### Blocker 2: No Apple Developer Account
Required to submit to TestFlight and the App Store. Cost: $99/year. Sign up at developer.apple.com. Takes 24–48 hours for identity verification.

### Blocker 3: Missing PWA Icons
`icon-192.png` and `icon-512.png` are referenced in `manifest.json` but don't exist. This breaks the PWA install prompt and would cause issues with Capacitor's icon generation step. Fix: create both files in `public/` before proceeding.

### Blocker 4: No Push Notification Infrastructure
Real estate urgency depends on instant alerts ("Your application was approved," "Landlord sent a message"). Currently zero push notification capability. Capacitor adds this via `@capacitor/push-notifications` + Apple Push Notification service (APNs), but it requires backend changes too.

---

## SECTION 5 — AUTHENTICATION COMPLIANCE

### Apple Sign In Requirement
Apple requires apps to offer "Sign in with Apple" **only when** the app offers other third-party social login options (Google, Facebook, etc.).

**Settleed's status:** Email/password ONLY via Supabase. No social logins.

**Verdict: Apple Sign In is NOT required.** You are compliant on this point. If you later add Google OAuth, you must also add Apple Sign In simultaneously.

### Current Auth Flow
- `src/contexts/AuthContext.jsx`: `supabase.auth.getSession()` + `onAuthStateChange()` — works in a Capacitor WKWebView
- Role fetched from `profiles` table with 1-second retry for slow DB triggers
- Session persists in localStorage — works in Capacitor

**No auth changes required for Capacitor.**

---

## SECTION 6 — PAYMENT COMPLIANCE (CRITICAL)

This is the most legally and financially complex section.

### Apple's Rule
App Store Guidelines §3.1.1: Digital goods and services purchased inside an iOS app must go through Apple's In-App Purchase (IAP) system. Apple takes **30%** (15% for subscriptions after year 1 via the Small Business Program).

### Settleed's Payment Surface Analysis

| Payment Type | Stripe Today | App Store Requirement |
|---|---|---|
| Landlord $49/mo subscription | REMOVED (good) | N/A — not active |
| Consultation services (Stripe Checkout) | `api/subscription.js` (`?action=checkout`) | ⚠️ Likely requires Apple IAP if sold in-app |
| Rent payment (tenant → landlord) | `api/create-rent-payment.js` | ✅ Likely EXEMPT (real-world service) |
| Background check fee | UI disabled | N/A for now |

**Consultation services** (the $X booking fee for Settleed consultation) is a digital service purchased within the app. Apple will likely classify this as requiring IAP. Your options:
1. **Remove the purchase button from the iOS app** — use a "web-only" flag to hide it inside Capacitor. Users who want to pay visit settleed.com in Safari instead. This is the approach Spotify, Netflix, and Kindle use.
2. **Implement Apple IAP** — complex, requires server-side receipt validation, and Apple takes 30%.

**Recommendation:** Hide in-app purchases in the iOS build using Capacitor's platform detection (`Capacitor.getPlatform() === 'ios'`). Show a message: "To purchase, visit settleed.com." This is legal, widely used, and avoids Apple's cut.

**Rent payments** (tenant pays landlord through Settleed) are real-world financial transactions and are generally exempt from Apple IAP requirements under §3.1.3(b). Keep these as-is.

---

## SECTION 7 — THIRD-PARTY DEPENDENCY COMPATIBILITY

### Supabase (`@supabase/supabase-js`)
✅ **Fully compatible.** Runs in any JavaScript environment, including Capacitor WKWebView. Real-time subscriptions work. Auth sessions persist.

### Stripe (`@stripe/stripe-js`, `@stripe/react-stripe-js`)
⚠️ **Conditionally compatible.** Stripe's JavaScript SDK works in WKWebView. However, see Section 6 — certain payment flows may need to be hidden inside the iOS app per Apple's rules.

### Leaflet.js (CDN-loaded via `window.L`)
⚠️ **Risk: CDN dependency.** The app loads Leaflet from `https://unpkg.com/leaflet@1.9.4/` at runtime. In Capacitor WKWebView this works when online, but in offline mode the CDN fetch fails and the map never loads. The rest of the app (list view) works fine.

**Fix for later:** Either bundle Leaflet as an npm package (`npm install leaflet`) or implement graceful offline fallback when map fails to load. Not a submission blocker.

### Cloudinary (direct API from client)
✅ **Compatible.** `<input type="file" accept="image/*">` works natively on iOS (triggers the photo picker / camera). The direct `fetch()` upload to Cloudinary's API works in WKWebView. Photo uploads will work.

### React Router v6 (`createBrowserRouter`)
⚠️ **Minor consideration.** `BrowserRouter` uses the HTML5 History API, which works in Capacitor. However, Capacitor apps serve from a custom scheme (`capacitor://localhost`), not `https://`. You may need to set `server.hostname` in `capacitor.config.json`. This is well-documented.

### lucide-react, react-hot-toast, date-fns, clsx
✅ **All compatible.** Pure JavaScript/React libraries with no browser-specific APIs.

---

## SECTION 8 — MOBILE UI/UX READINESS

The existing app is well-positioned for mobile. Evidence:

**Already mobile-ready:**
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">` — set in `index.html`
- `display: standalone` in `manifest.json` — hides browser chrome
- `orientation: portrait-primary` — matches App Store screenshots requirement
- `BottomNav` component: fixed bottom navigation bar, 5 tabs per role (Home, Inbox/Search, Messages, Rent, Account)
- `active:scale-[0.98]` touch feedback on listing cards
- Tailwind mobile-first breakpoints throughout

**Gaps to address before submission:**
- No safe-area handling for iPhone notch / Dynamic Island. iOS requires `padding: env(safe-area-inset-bottom)` on the fixed BottomNav, otherwise content hides behind the home indicator bar. This is a 2-line CSS fix.
- No haptic feedback (minor — can add via `@capacitor/haptics`)
- Toast notifications (`react-hot-toast`, `top-center`) may overlap iPhone status bar in standalone mode — test on device

---

## SECTION 9 — PUSH NOTIFICATIONS

**Current state:** Zero push notification capability. No Firebase, no OneSignal, no APNs integration.

**Why this matters for Settleed:** Push notifications are arguably the most important native feature for a housing marketplace. Users need to know immediately when:
- Their application is approved/denied
- A landlord sends a message
- A new listing matches their saved search
- RFTA status changes
- Lease is ready to sign

Currently all of this is email-only (SendGrid). Email open rates for transactional messages are ~20–30%. Push notifications achieve 70–90% delivery and immediate visibility.

**What adding push notifications requires (Capacitor path):**

*Frontend:*
- `npm install @capacitor/push-notifications`
- Request permission on first launch
- Register device token
- Handle foreground/background notification events

*Backend:*
- New Supabase table: `push_tokens` (user_id, device_token, platform)
- New API function: `api/send-push.js` using Apple's APNs (via a library like `node-apn` or Firebase Admin SDK)
- Trigger push notifications at the same points currently sending emails

*Apple requirements:*
- Push Notifications entitlement (added in Xcode)
- APNs certificate or key (from Apple Developer Account)
- No App Store review special requirements for standard notifications

**Estimated effort:** 1–2 weeks for basic "new message" and "application update" pushes

---

## SECTION 10 — OFFLINE CAPABILITY ASSESSMENT

**Current service worker strategy:**
```
API / Supabase / Stripe → always network-first (no cache)
Static assets (JS/CSS/images) → cache-first, then network
HTML pages → network-first, fall back to /index.html
```

**What works offline:**
- App shell loads (the React JS/CSS bundle is cached)
- Previously visited pages may render from cache
- The BottomNav and layout render

**What does NOT work offline:**
- Any real data (listings, messages, applications) — requires Supabase
- Map tiles (Leaflet CDN)
- Sending messages
- Auth flows

**For App Store submission:** This level of offline support is acceptable. Apple doesn't require apps to be fully offline-functional. The cached shell prevents "white screen" errors.

**Improvement for later:** Cache the tenant's own profile and active applications data in IndexedDB for offline reading. This is a nice-to-have, not a submission blocker.

---

## SECTION 11 — DATA SECURITY AND PRIVACY COMPLIANCE

### VITE_ Environment Variables
Supabase URL and anon key are exposed in the client bundle via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. This is expected and correct — the anon key is the public key, protected by Row Level Security (RLS) in Supabase.

**Verified secure:**
- `SUPABASE_SERVICE_ROLE_KEY` is NOT in any client code — server-side env var only
- `SENDGRID_API_KEY` is NOT in client code — `process.env` in API functions only
- Stripe publishable key (`VITE_STRIPE_PUBLISHABLE_KEY`) is correctly public
- Stripe secret key is server-side only

### App Store Privacy Nutrition Labels
When submitting to the App Store, Apple requires you to declare what data your app collects. Based on the codebase:

| Data Type | Collected | Purpose | Linked to Identity? |
|---|---|---|---|
| Name | Yes (profiles table) | App functionality | Yes |
| Email address | Yes (Supabase auth) | Account management | Yes |
| Phone number | Likely (profile form) | Contact | Yes |
| Photos/documents | Yes (Cloudinary uploads) | Listing/verification | Yes |
| Location (approximate) | Yes (listing geocoding) | Search functionality | No |
| User content (messages) | Yes (Supabase) | Messaging | Yes |
| Identifiers (user ID) | Yes | App functionality | Yes |
| Usage data (page views) | Yes (page_views table) | Analytics | No |

Apple will require all of these to be disclosed. None of these are unusual for a housing marketplace app.

### Privacy Policy
✅ **Exists at `src/pages/legal/Privacy.jsx`** — accessible at `https://settleed.com/privacy`. Apple requires a URL to your privacy policy during submission. This URL must be publicly accessible (it is). Review the policy to ensure it covers the data types listed above.

### Terms of Service
✅ **Exists at `src/pages/legal/Terms.jsx`** — accessible at `https://settleed.com/terms`.

---

## SECTION 12 — API FUNCTION INVENTORY AND BACKEND COMPATIBILITY

The 12 Vercel serverless functions are all standard Node.js HTTP handlers. They run on Vercel's servers — completely separate from the iOS client. They are already accessed over HTTPS. Nothing about them needs to change for iOS.

| API Function | Purpose | iOS Impact |
|---|---|---|
| `api/ai.js` | AI listing writer + Q&A | ✅ No change needed |
| `api/alerts.js` | SendGrid email notifications | ✅ No change needed |
| `api/check-message.js` | Message content filter | ✅ No change needed |
| `api/connect.js` | Stripe Connect onboarding | ⚠️ Review Stripe IAP rules |
| `api/create-rent-payment.js` | Tenant rent payment | ✅ Exempt (real-world) |
| `api/lease.js` | Lease sign + activate | ✅ No change needed |
| `api/request-background-check.js` | Background check trigger | ✅ No change needed |
| `api/send-message.js` | Message delivery | ✅ No change needed |
| `api/send-notification.js` | Generic notification | ✅ No change needed |
| `api/stripe-webhook.js` | Stripe webhook handler | ✅ No change needed |
| `api/subscription.js` | Subscription management | ⚠️ May need iOS IAP flag |
| `api/update-maintenance.js` | Maintenance request update | ✅ No change needed |

**Vercel Hobby plan limit:** 12 functions (currently at limit). Adding `api/send-push.js` for push notifications would require upgrading to Vercel Pro ($20/mo) or consolidating an existing function.

---

## SECTION 13 — CAMERA AND FILE ACCESS

**Current implementation:** `<input type="file" accept="image/*">` in `ListingForm.jsx` for photo uploads. Document uploads accept `.pdf,.doc,.docx,.jpg,.png`.

**iOS behavior:** On iOS, `<input type="file">` in a WKWebView (Capacitor) triggers the native iOS share sheet, giving users access to:
- Camera (take a new photo)
- Photo Library
- Files app (iCloud Drive, etc.)

✅ This works out of the box. No plugin changes needed for basic file/photo uploads.

**Enhancement for later:** `@capacitor/camera` plugin gives a more polished camera experience (pre-built camera UI, quality settings, etc.), but the current `<input type="file">` approach will work for initial submission.

---

## SECTION 14 — DEEP LINKING AND URL SCHEMES

**Current links of note:**
- Public listing pages: `/listing/:id` — these should be deep-linkable from SMS/email
- RFTA status updates: linked from email notifications
- Lease signing: linked from email

**For Capacitor:** Universal Links (iOS) let a URL like `https://settleed.com/listing/123` open the app instead of Safari when the app is installed. This requires:
1. An `apple-app-site-association` (AASA) file served at `https://settleed.com/.well-known/apple-app-site-association`
2. Configuring the Associated Domains entitlement in Xcode
3. A Capacitor plugin (`@capacitor/app`) to handle incoming URLs

This is not required for initial App Store submission, but is important for user experience once landlords start sharing listing links.

---

## SECTION 15 — APP STORE METADATA AND ASSETS REQUIRED

When you submit, Apple requires all of the following. Plan time for this.

### App Icons (ALL sizes required)
Apple requires a single 1024×1024px icon — Xcode generates all smaller sizes from it. You'll need to create this from the Settleed "S" mark. Current icons (192px, 512px) don't exist and the 1024px icon doesn't exist.

**Action:** Design a clean 1024×1024px icon (navy background, "S" mark, no rounded corners — Apple adds rounding). Then use Capacitor's asset tooling to auto-generate all sizes.

### Screenshots (REQUIRED)
- 6.7" iPhone (iPhone 14 Pro Max / 15 Pro Max): 1290×2796px, minimum 3 screenshots
- 6.1" iPhone (iPhone 14 / 15): 1170×2532px (optional but recommended)
- iPad 12.9" (3rd gen+): 2048×2732px (required if targeting iPad)

Screenshots must show actual app screens. Plan to use a tool like Rotato, Sketch, or Figma to create polished frames.

### App Store Listing Copy
- **App Name:** Settleed — Section 8 Housing (30 char max)
- **Subtitle:** Find & List HCV Voucher Homes (30 char max)
- **Keywords:** section 8, housing voucher, HCV, RFTA, Atlanta housing (100 chars)
- **Description:** Up to 4,000 characters. Write for the tenant looking for a voucher-friendly landlord and the landlord wanting to list.
- **Category:** Lifestyle → Real Estate (primary), or Real Estate directly
- **Age Rating:** 4+ (no mature content, no violence, no gambling)
- **Copyright:** 2026 Settleed Inc. (or your LLC name)

### Support URL and Privacy URL
- Support: `https://settleed.com` or a contact page
- Privacy Policy: `https://settleed.com/privacy` ✅ (already exists)

---

## SECTION 16 — ANDROID ASSESSMENT (BONUS)

Since you mentioned Android in your original goal, Capacitor builds for both iOS and Android from the same codebase simultaneously.

**Android advantages over iOS:**
- No Mac required — Android builds work on Windows via Android Studio
- No $99/yr developer account — Google Play is a one-time $25 fee
- No IAP restrictions on non-digital goods (Stripe can be used freely)
- Faster App Review (hours vs. days)

**Android blockers (same as iOS):**
- Need to set up Android Studio
- Need to create app icons and screenshots
- Google Play Console account ($25 one-time)

**Recommendation:** Build for both simultaneously once you have Capacitor set up. The marginal cost of Android is low given you're already doing iOS.

---

## SECTION 17 — WHAT'S ALREADY PRODUCTION-QUALITY

Don't undersell what's already built. These are genuine strengths heading into the App Store:

- **Real-time messaging** with Supabase subscriptions — as good as any native app
- **Role-based navigation** — landlord/tenant/admin flows are cleanly separated
- **Service worker** — offline-capable shell, fast load on repeat visits
- **PWA manifest** — standalone display mode eliminates browser chrome
- **Mobile-first layout** — BottomNav, touch feedback, no horizontal overflow
- **Verified listing workflow** — admin approval queue (trust layer)
- **Document uploads** — Cloudinary, works on iOS file picker
- **Full auth flow** — signup, login, forgot/reset password, session persistence
- **Legal pages** — Privacy + Terms exist at public URLs
- **OG meta tags** — social sharing previews set up
- **HQS / RFTA trackers** — unique features competitors don't have

---

## SECTION 18 — WHAT APPLE WILL SCRUTINIZE

App Store reviewers look hard at:

1. **Completeness** — every button and link must work. "Coming soon" placeholder screens get rejected. Review all disabled features and either complete them or remove the UI entirely before submission.

2. **Sign In requirement** — reviewers must be able to log in and test the app. Provide a demo account in the submission notes. Suggested: create `reviewer@settleed.com` (landlord) and `reviewer.tenant@settleed.com` with active listings and applications pre-loaded.

3. **Crashless experience** — any crash during review = rejection. Test on a physical device.

4. **Background check flow** — `BackgroundChecks.jsx` exists. Even if the UI is disabled, reviewers may probe it. Ensure the disabled state is clear and not misleading.

5. **Real estate compliance** — Apple is aware of real estate app regulations. Your EHO (Equal Housing Opportunity) statement should be visible. It's already in the footer and Terms — make sure it's findable in the app.

6. **Section 8 / HCV terminology** — not a flagged category, but reviewers may ask questions. Be ready with a written explanation that Settleed is a neutral marketplace, not a brokerage.

---

## SECTION 19 — CAPACITOR IMPLEMENTATION CHECKLIST

This is the step-by-step sequence once you're ready to proceed. Each item is a discrete task.

**Phase 0: Prerequisites**
- [ ] Obtain Mac (Mac Mini M4, ~$599, or cloud Mac)
- [ ] Create Apple Developer Account at developer.apple.com ($99)
- [ ] Install Xcode (free, ~14GB)
- [ ] Install Node.js 20+ and Homebrew on the Mac
- [ ] Push og-image.png to GitHub via GitHub Desktop (already committed locally)

**Phase 1: Icons and Assets**
- [ ] Create `public/icon-192.png` (192×192px, Settleed "S" mark)
- [ ] Create `public/icon-512.png` (512×512px, same)
- [ ] Create 1024×1024px master icon for Xcode
- [ ] Install Capacitor assets tool: `npm install -D @capacitor/assets`

**Phase 2: Capacitor Installation**
- [ ] `npm install @capacitor/core @capacitor/cli`
- [ ] `npx cap init "Settleed" "com.settleed.app" --web-dir dist`
- [ ] `npm install @capacitor/ios`
- [ ] `npx cap add ios`
- [ ] Update `capacitor.config.json` with server URL settings

**Phase 3: Build and Test**
- [ ] `npm run build` (Vite production build to `dist/`)
- [ ] `npx cap copy ios` (copy dist to iOS project)
- [ ] `npx cap open ios` (opens Xcode)
- [ ] Run on iPhone Simulator to check layout and nav
- [ ] Fix safe-area insets on BottomNav (2-line CSS change)
- [ ] Run on a physical iPhone via TestFlight

**Phase 4: App Store Submission**
- [ ] Create App ID in developer.apple.com
- [ ] Create App in App Store Connect
- [ ] Upload screenshots (minimum 3 × 6.7")
- [ ] Write app description, keywords, subtitle
- [ ] Set privacy nutrition labels
- [ ] Add reviewer demo account credentials to submission notes
- [ ] Submit for review (typically 24–72 hours)

---

## SECTION 20 — COST SUMMARY

| Item | Cost | Timing |
|---|---|---|
| Apple Developer Account | $99/year | Before submission |
| Mac Mini M4 (if buying) | $599 one-time | Before any iOS work |
| OR cloud Mac (Codemagic) | ~$50–100/month | Per-build alternative |
| Google Play Console | $25 one-time | Android submission |
| Vercel Pro (if adding push API) | $20/month | If exceeding 12 functions |
| Engineering time (Capacitor path) | 3–6 weeks | First submission |
| Apple IAP integration (if needed) | 2–3 weeks extra | Only if consultation fee stays in-app |

**Minimum viable cost to reach App Store:** $99 (Apple account) + Mac access. No other paid services strictly required for v1.

---

## SECTION 21 — PRIORITY ACTION ITEMS

Ranked by what must happen before anything else can move.

### Immediate (no code required, can do today)
1. **Push `og-image.png` to GitHub** via GitHub Desktop — already committed, just needs "Push origin" click
2. **Create Apple Developer Account** at developer.apple.com — $99, takes 24–48 hrs to verify

### Short-term (1–2 weeks, on existing machine)
3. **Create PWA icons** — `public/icon-192.png` and `public/icon-512.png` — fixes broken PWA install prompt
4. **Create 1024×1024px app icon** — needed for Xcode
5. **Audit all disabled features** — anything shown in UI but non-functional will fail App Store review. Either complete it or hide it.
6. **Create reviewer demo accounts** in Supabase with pre-populated listings and applications

### Medium-term (requires Mac)
7. **Install Capacitor** and run `npx cap add ios`
8. **Fix BottomNav safe-area insets** (`padding-bottom: env(safe-area-inset-bottom)`)
9. **Test on iPhone Simulator** — validate all 37 routes render correctly
10. **Hide in-app payment flows** in iOS build if using `api/subscription.js` checkout
11. **Add push notifications** via `@capacitor/push-notifications` + APNs
12. **Create App Store screenshots** — 3 minimum for 6.7" iPhone

### Long-term (post-launch v1.1)
13. **Universal Links** — let `settleed.com/listing/:id` deep-link into the app
14. **Haptic feedback** on key interactions (message sent, application submitted)
15. **Bundle Leaflet** as npm package instead of CDN to support offline map view
16. **Android submission** via Capacitor (same codebase, minimal extra work)

---

## APPENDIX: FILE INVENTORY

Key files inspected for this audit (no modifications made):

| File | Relevance |
|---|---|
| `src/App.jsx` | 37-route structure, PageViewLogger |
| `src/main.jsx` | Service worker registration (PROD only) |
| `src/lib/supabase.js` | Supabase client, anon key |
| `src/contexts/AuthContext.jsx` | Email/password auth, role fetching |
| `src/components/BottomNav.jsx` | Mobile tab navigation |
| `src/pages/tenant/SearchListings.jsx` | Leaflet CDN map dependency |
| `src/pages/landlord/ListingForm.jsx` | Cloudinary photo/doc upload |
| `src/pages/Messages.jsx` | Supabase real-time subscriptions |
| `src/pages/legal/Privacy.jsx` | App Store privacy URL |
| `src/pages/legal/Terms.jsx` | Terms of service |
| `public/manifest.json` | PWA manifest (icons missing) |
| `public/sw.js` | Service worker (solid implementation) |
| `index.html` | Viewport, OG tags, manifest link |
| `vercel.json` | 12 API rewrites, cache headers |
| `package.json` | Dependency inventory |
| `api/*.js` (12 files) | Serverless backend functions |

---

*This report is an architecture and feasibility assessment only. No code was modified during this audit.*
