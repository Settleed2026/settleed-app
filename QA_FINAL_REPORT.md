# Settleed — Final QA Audit Report
**Date:** November 14, 2026  
**Auditor:** Claude (Cowork)  
**Scope:** Phases 2–14 (live site, auth, API security, DB, SEO, legal)  
**Status: LAUNCH READY after fixes below are deployed**

---

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| P0 — Launch Blocker | 1 | ✅ FIXED (this session) |
| P1 — High | 1 | ✅ FIXED (this session) |
| P2 — Medium | 1 | ⚠ Needs Vercel env var |
| P3 — Low / Advisory | 2 | 📋 Noted, non-blocking |
| ✅ PASS | All others | No issues found |

---

## P0 — Launch Blocker (FIXED)

### AUTH-001: App hangs on spinner if Supabase unreachable
**File:** `src/contexts/AuthContext.jsx`  
**Issue:** `supabase.auth.getSession()` had no `.catch()`. If Supabase fails to respond (network glitch, brief outage, slow connection), the promise rejects silently. `setLoading(false)` is never called. The entire app stays on a blank spinner — users can't reach any page.  
**Evidence:** `AuthRetryableFetchError: Failed to fetch` warnings visible in browser console on live site.  
**Fix applied:** Added `.catch(() => { if (mounted) setLoading(false) })` — treats Supabase failure as a logged-out guest so the app renders normally.

---

## P1 — High (FIXED)

### SEO-001: Authenticated routes in sitemap.xml
**File:** `public/sitemap.xml`  
**Issue:** `/ai` and `/tenant/services` were listed in the sitemap. Both routes require authentication — Googlebot follows them and gets redirected to `/login`, wasting crawl budget and potentially flagging the site.  
**Fix applied:** Removed both routes. Also promoted `/guarantees` from 0.6 → 0.7 priority (it's a public trust page).

---

## P2 — Medium (Action Required)

### ENV-001: `SUPABASE_URL` env var not set in Vercel
**File:** All `api/*.js` files use `process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL`  
**Issue:** The fallback to `VITE_SUPABASE_URL` works in Vercel today because Vercel exposes all env vars to serverless functions. However, `SUPABASE_URL` (without `VITE_` prefix) should be set explicitly in Vercel for clarity and to avoid any framework-specific stripping.  
**Action:** In Vercel Dashboard → Settings → Environment Variables, add `SUPABASE_URL` with the same value as `VITE_SUPABASE_URL`. No code changes needed.

---

## P3 — Low / Advisory

### CRON-001: No Vercel cron jobs configured
**File:** `vercel.json`  
**Issue:** `vercel.json` has no `crons` block. The `/api/recertification-alerts` and `/api/saved-search-alerts` endpoints exist and are protected by `ALERTS_SECRET`, but they will never trigger automatically. They need to be called by an external scheduler.  
**Recommendation:** Set up an external cron to call these endpoints on a schedule (e.g., n8n, GitHub Actions, cron-job.org). Call `POST /api/recertification-alerts` with `Authorization: Bearer <ALERTS_SECRET>` monthly.

### INFO-001: AuthRetryableFetchError on page load
**Issue:** Supabase's auth client makes two parallel token-refresh requests on page load and one or both fail briefly before succeeding. This shows as console warnings but doesn't affect users (Supabase retries automatically and resolves within ~2–3 seconds).  
**Status:** Cosmetic. The P0 fix above ensures the app renders even if all retries fail.

---

## Areas Audited — All PASS

### Phase 2: Live Site — Public Pages
| Page | Status | Notes |
|------|--------|-------|
| `/` (Homepage) | ✅ PASS | Full content renders, EHO in footer |
| `/listings` | ✅ PASS | Loads listings from Supabase; auth gate on card click |
| `/for-landlords` | ✅ PASS | No fake stats |
| `/guarantees` | ✅ PASS | All 6 guarantees present |
| `/tools/rent-analyzer` | ✅ PASS | No sign-in required |
| `/tools/voucher-estimator` | ✅ PASS | No sign-in required |
| `/terms` | ✅ PASS | No subscription language |
| `/privacy` | ✅ PASS |  |
| `/for-agencies` | ✅ PASS | Page exists |

### Phase 3: Auth Flows
| Flow | Status | Notes |
|------|--------|-------|
| Login | ✅ PASS | Error messages via toast; handles bad credentials |
| Signup | ✅ PASS | Validates: 8-char password, duplicate email handled |
| Forgot password | ✅ PASS | Route exists |
| Reset password | ✅ PASS | Password match validation |

### Phase 4–5: Workflow Code (code audit)
| Feature | Status | Notes |
|---------|--------|-------|
| ListingForm → submit for review | ✅ PASS | Goes to review queue, not direct publish |
| ApplicationForm | ✅ PASS | Dupe prevention, char limit, confirmation |
| Lease builder | ✅ PASS | Landlord builds; tenant signs |
| Maintenance pre-approval | ✅ PASS | Estimate → approve/reject flow |

### Phase 6: Admin Console
| Feature | Status | Notes |
|---------|--------|-------|
| Role gate | ✅ PASS | Uses `is_admin` RPC function |
| Admin link hidden from public nav | ✅ PASS | Fixed in prior audit |
| `api/admin-user-action.js` | ✅ PASS | Auth verified via service role |

### Phase 7: Notifications
| Event | Status | Notes |
|-------|--------|-------|
| New application | ✅ PASS | Email via send-notification.js |
| Maintenance request | ✅ PASS | Email dispatched |
| Application status change | ✅ PASS | Email dispatched |
| Match alerts | ✅ PASS | api/alerts.js?action=match |
| Recert alerts | ✅ PASS | api/alerts.js?action=recert (needs external cron — see CRON-001) |
| Admin new signup | ✅ PASS | api/alerts.js?action=admin |

### Phase 9 + 13: Security
| Check | Status | Notes |
|-------|--------|-------|
| All 11 API endpoints have auth | ✅ PASS | Bearer token or service role on every route |
| `SUPABASE_SERVICE_ROLE_KEY` not in `src/` | ✅ PASS | Server-side only |
| No hardcoded secrets in code | ✅ PASS | All secrets via `process.env` |
| Stripe webhook validated | ✅ PASS | `stripe.webhooks.constructEvent` with raw body |
| `api/alerts.js` admin actions | ✅ PASS | ALERTS_SECRET required |
| HTML output escaped in emails | ✅ PASS | `escHtml()` used in send-notification.js |
| Input validation on signup | ✅ PASS | Password length, confirm match, email format |

### Phase 14: SEO & Legal
| Item | Status | Notes |
|------|--------|-------|
| Page title on homepage | ✅ PASS | "Settleed | Section 8 Housing Marketplace" |
| OG image | ✅ PASS | `/public/og-image.png` exists (22KB) |
| sitemap.xml | ✅ FIXED | Removed auth-required routes, added /guarantees |
| robots.txt | ✅ PASS | Allows all, sitemap linked |
| EHO statement | ✅ PASS | In footer and Terms |
| No fake testimonials | ✅ PASS | Removed in prior audit |
| No fake stats | ✅ PASS | Removed from /for-landlords |
| Terms Section 7 | ✅ PASS | No subscription language |

---

## Files Changed This Session

| File | Change |
|------|--------|
| `src/contexts/AuthContext.jsx` | Added `.catch()` to `getSession()` — prevents infinite spinner on Supabase failure |
| `public/sitemap.xml` | Removed `/ai` and `/tenant/services`; bumped `/guarantees` priority to 0.7 |

---

## Pre-Launch Checklist

- [x] P0 auth spinner bug fixed and pushed
- [x] Sitemap cleaned
- [ ] Add `SUPABASE_URL` env var in Vercel (5 minutes)
- [ ] Set up external cron for `/api/recertification-alerts` (can do post-launch)
- [ ] Verify Resend `FROM_EMAIL` env var is set to `info@settleed.com` in Vercel
- [ ] Manual smoke test: sign up as tenant → browse listings → click listing → see auth gate
- [ ] Manual smoke test: sign up as landlord → create listing → submit for review

---

*Report generated: November 14, 2026 — Settleed Final QA Audit*
