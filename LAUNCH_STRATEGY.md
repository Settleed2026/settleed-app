# Settleed Launch Strategy
## Strategic Review + Legal Matrix + 30-Day Sprint

**Generated:** August 2026  
**Context:** Early Access launch, free tier, supply-first, North Star = lease-ups

---

## PART 1 — PROJECT AUDIT

### ✅ Launch-Ready Right Now
- **Auth system** — signup, login, password reset, email confirmation
- **Landlord listing form** — 9-step flow, photos, amenities, accessibility flags, voucher info
- **Listing admin queue** — you can verify and approve listings as admin
- **Tenant search** — filters (beds, rent, zip, pets, accessibility), map view, voucher amount filter
- **Application flow** — tenants apply, landlords see inbox, you see all of it
- **Public listing pages** — /listing/:id, SEO-ready, shareable links, OG tags
- **Domain** — settleed.com live on Vercel ✅
- **Admin email notifications** — you get emailed on every signup, listing, inquiry
- **Saved searches + email alerts** — tenants save searches, cron emails matches daily
- **Agency portal** — /for-agencies with contact form
- **Legal pages** — Terms, Privacy live
- **Landlord dashboard** — subscription paywall REMOVED (done this session)

### ⚠️ Works But Needs Attention Before Landlord Outreach
- **Listing form is 9 steps** — cold outreach landlords may abandon. Consider collapsing to 4 steps for Early Access (address, bedrooms/rent, photos, submit). You can fill in the rest manually.
- **Map pins are empty** — geocoding only runs on new listings going forward. Existing listings (if any) need coordinates manually set or a one-time backfill migration.
- **Landing page copy** — still has premium product positioning. Needs to say "Free during Early Access" in the hero. Does NOT currently reflect the free model.
- **For Landlords page** — needs to say "List free" prominently. Currently implies features/price.

### 🚫 Disabled / Removed (Do Not Re-Enable Until Legal Review)
- Stripe subscription ($49/mo) — REMOVED ✅
- Featured listings / Boost button — REMOVED ✅
- Background checks (FCRA compliance not confirmed)
- Rent payment processing (money transmission risk)
- Referral / success fees (possible brokerage activity under GREC)

### 📋 Can Be Manual at Launch (Don't Build Yet)
- Matching — you email landlords and tenants who fit each other
- Landlord onboarding — phone call + screen share if they get stuck on the form
- Agency outreach — direct calls to AHA/DCA contacts
- RFTA guidance — send a PDF checklist, don't complete forms yourself
- Tenant vetting — review each profile before making an intro

### 🚫 Postpone (Don't Touch for 30 Days)
- AI listing writer, Q&A assistant, rent optimizer — not needed for first 25 landlords
- Messaging system — phone/email outside platform is fine
- Reviews & ratings — need users first
- Agency dashboard / HA portal — build it AFTER an agency partner is signed
- Any monetization feature (pricing, tiers, success fees)

---

## PART 2 — LEGAL / REGULATORY MATRIX (Georgia)

> **Disclaimer:** This is a framework for identifying risk, not legal advice. Before activating any "⚠️ Review" item, consult a Georgia attorney familiar with GREC (Georgia Real Estate Commission) and Fair Housing law.

### Georgia-Specific Context First
Georgia does **not** have statewide source-of-income (voucher) protection, and neither does Atlanta. Georgia landlords can legally refuse Section 8 without it being discrimination under state or local law. Your value proposition to landlords must be **economic** (stable payment from government, low vacancy, guaranteed income), NOT compliance-based.

| Activity | Verdict | Why | Settleed Approach |
|---|---|---|---|
| Publishing landlord listings | ✅ Go | Standard marketplace, no license needed | Do it |
| Tenant-property matching (free, informational) | ✅ Go | Neutral platform notification, not representation | Do it — email intros are fine |
| Advertising listings online | ✅ Go | Standard | Do it |
| Collecting landlord sign-ups | ✅ Go | Standard | Do it |
| HCV education (voucher how-tos, RFTA explainers) | ✅ Go | Non-licensed public information | Do it |
| Landlord education (HQS checklist, inspection tips) | ✅ Go | Non-licensed public information | Do it |
| Identity verification of landlords | ✅ Go | Standard KYC, no license needed | Do it |
| Displaying rent prices | ✅ Go | Informational | Do it |
| RFTA information / checklists | ✅ Go (education only) | Providing info is fine; completing forms is not | Send checklists, never fill out forms |
| Inspection prep checklists | ✅ Go (education only) | Standard educational content | Send checklists, never schedule or accompany |
| Charging landlords a flat listing fee (future) | ⚠️ Review | Could require RE license under GREC depending on framing | Get GREC opinion before charging |
| Charging a success fee per lease-up (future) | ⚠️ Review | Resembles a real estate commission — significant risk | Get GREC opinion before charging |
| Algorithmic recommendations (matching) | ⚠️ Review | Fair Housing disparate impact risk if algorithm produces discriminatory results | Audit for disparate impact before using; manual matching is safer |
| Background checks on tenants | ⚠️ Review | FCRA compliance required: permissible purpose, adverse action notices, dispute rights | Do NOT run background checks until FCRA procedures are in writing |
| Collecting application fees from tenants | ⚠️ Review | Georgia has no cap but money handling creates risk; could be money transmission | Do NOT collect app fees at launch |
| Discussing/advising on rent pricing | ⚠️ Review | Could be construed as broker activity if fee-based | Frame as market data display, not advice |
| Scheduling HQS inspections | ⚠️ Review | Coordination could create liability | Provide dates and contacts only; don't schedule |
| Negotiating rent on behalf of either party | 🚫 Do not do | Real estate brokerage activity under GREC | NEVER negotiate rent |
| Preparing leases or addenda | 🚫 Do not do | Unauthorized practice of law | NEVER prepare leases |
| Holding security deposits or any money | 🚫 Do not do | Requires trust account and potentially a property management license | NEVER hold money |
| Property management services | 🚫 Do not do | Requires GA property management or broker license | Out of scope |
| Completing RFTA / HAP contract paperwork | 🚫 Do not do | Could be unauthorized practice of housing counseling or law | NEVER complete RFTA forms |

### Fair Housing Obligations (Federal)
Even without Georgia SOI protection, federal FHA applies:
- Cannot discriminate based on race, color, national origin, religion, sex, disability, familial status
- Cannot have algorithms or filters that produce disparate impact on protected classes
- All listings must include Equal Housing Opportunity (EHO) statement ✅ (already in your public listing pages)
- Advertising cannot indicate preference based on protected class

### The Safe Zone Summary
Settleed can: **display listings, facilitate introductions, educate both sides, and track progress.** Settleed cannot: **negotiate, prepare documents, hold money, or complete paperwork for either party.**

---

## PART 3 — FEATURE CLASSIFICATION (4 Buckets)

### Bucket 1: Ship It (Launch-ready, no risk)
Subscription-free landlord dashboard, listing form, tenant search, public listing pages, admin email notifications, agency contact form, saved searches, EHO statements on all listing pages, geocoding on new listings, admin listing queue

### Bucket 2: Fix Before Outreach Starts (This week)
- Landing page hero → "Free during Early Access" message
- For Landlords page → "List free, no subscription" messaging
- Shorten landlord listing form or add a "Quick List" path

### Bucket 3: Keep Manual (Don't build the feature)
Matching (email manually), landlord onboarding (phone call), agency outreach (direct calls), RFTA help (send a checklist PDF), tenant intake review

### Bucket 4: Do Not Touch for 30 Days
Stripe (any form), background checks, messaging system, AI features, reviews, agency dashboard, any monetization, referral/success fees

---

## PART 4 — 30-DAY DAY-BY-DAY SPRINT

> Legend: **ME** = you do this | **SITE** = code change | **OUTREACH** = phone/email/in-person | **METRIC** = measure this

### Week 1 (Days 1–7): Fix + Load the Gun

**Day 1 (Aug 25) — Foundation**
- SITE: Update landing page hero to "Free during Early Access — List your Section 8 property in 10 minutes"
- SITE: Update For Landlords page to say "Free to list. No subscription. No credit card."
- ME: Write your 3-sentence founding landlord outreach script (see template below)
- ME: Make a list of every landlord you personally know who accepts or might accept Section 8 in Atlanta. Include former colleagues from AHA.
- METRIC: Target = 10 names on your landlord list

**Day 2 (Aug 26)**
- OUTREACH: Call 5 landlords from your list. Phone only — no text, no email yet. Say: "I built a free platform for Section 8 landlords in Atlanta. It's called Settleed. I'd love to walk you through it — takes 10 minutes. Can I call you this week?"
- ME: Set up ImprovMX email aliases (hello@, support@settleed.com → your Gmail)
- ME: Update SendGrid sender verification for noreply@settleed.com
- METRIC: Calls made, responses, scheduled demos

**Day 3 (Aug 27)**
- OUTREACH: Call 5 more landlords. Start texting the ones who didn't pick up.
- ME: Write your landlord welcome email template (what they get after signing up)
- SITE: Add "Founding Landlord" badge option to the admin panel — a simple boolean you can set per landlord profile. Displayed on their profile. Makes them feel special.
- METRIC: Total outreach attempts = 10+

**Day 4 (Aug 28)**
- OUTREACH: Follow up with everyone from Day 2 who didn't respond
- ME: Research 5 Atlanta-area Facebook groups for landlords, Section 8 landlords, real estate investors
- ME: Draft a short Facebook/NextDoor post: "I built a free tool for Atlanta landlords who accept Section 8. No fees. No subscription. Looking for 25 founding members. Interested?" (Do NOT post yet — have it ready)
- METRIC: Outreach pipeline tracked in a simple spreadsheet

**Day 5 (Aug 29)**
- OUTREACH: Conduct first landlord demo (screen share, walk them through listing form)
- ME: Document everything that confused them — this is your product feedback
- SITE: Fix any friction points from the demo within 24 hours
- METRIC: First landlord onboarded?

**Day 6 (Aug 30) — Saturday**
- ME: Post in 2 Facebook groups (landlord-focused, not for sale/rent)
- OUTREACH: Respond to every DM within 1 hour
- ME: Review your AHA contacts — who do you know at Atlanta Housing? Set up one informal coffee/call

**Day 7 (Aug 31) — Sunday**
- ME: Weekly review. Write down: How many landlords contacted? How many demos scheduled? How many listed? What's blocking progress?
- Decision gate: If you've done ≥10 outreach attempts and 0 demos, your message isn't working. Rewrite the script.

---

### Week 2 (Days 8–14): Demo Machine

**Day 8**
- OUTREACH: Conduct 2+ landlord demos. Goal: 5 active listings by end of week
- ME: Join Atlanta Real Estate Investors Association (REIA) — go to next meeting in person
- SITE: If the 9-step listing form is losing people, add a "Quick List" shortcut: just address + bedrooms + rent + submit for review. You complete the rest in admin.

**Day 9**
- ME: Email or call every contact from your AHA days. "I left to build something. It's called Settleed. I'd love to show you what we're building." No ask yet — just reconnect.
- METRIC: AHA contacts reached = ?

**Day 10**
- OUTREACH: Post to LinkedIn. Frame: "I spent years inside Atlanta Housing. Now I'm building the platform I wish existed for Section 8 landlords and families. Here's what we're doing." Personal story, no hard sell.
- METRIC: LinkedIn impressions, DMs

**Day 11**
- SITE: Update the admin queue to show "Lease-Up Pipeline" view — landlords with active listings, tenants who applied, and application status. This is your internal matching tool.
- ME: Build a simple spreadsheet: Landlord → Unit address → Bedrooms → Rent → Status. This IS your matching system.

**Day 12**
- OUTREACH: Call 5 more landlords. Now you have a track record: "We already have [X] landlords listed." Social proof matters even at small scale.
- METRIC: Active listings count — first goal is 5

**Day 13**
- ME: Reach out to one affordable housing attorney in Atlanta. Introduction, not a legal services request. "I'm building a Section 8 marketplace. Would love 30 minutes to make sure I'm not crossing any lines I shouldn't cross." Budget $500 for a 30-min consult.
- This is non-negotiable. You need an attorney who knows GREC and Fair Housing to review your business before you charge anyone anything.

**Day 14 — 2-Week Review**
- Metric check: How many landlords with live listings? Target = 10 by Day 14
- Decision: Are landlords finding the listing form hard? If yes, simplify it this week.
- Decision: Is the barrier to sign up too high (verification feels slow)? If yes, streamline admin approval to same-day.

---

### Week 3 (Days 15–21): Tenant Activation + First Matches

**Prerequisites before activating tenants:**
- ≥ 15 landlords with active listings
- CAN-SPAM-compliant email template ready
- TCPA-compliant if texting (written consent for marketing texts — required)
- One agency contact who knows you're doing this (not a partnership, just awareness)

**Day 15**
- ME: Draft tenant activation email for your existing database. Subject: "Free housing search tool for voucher holders in Atlanta." Body: 3 sentences, one CTA. Get it reviewed for CAN-SPAM compliance (must include: who you are, physical address, unsubscribe link).
- DO NOT SEND until you have ≥15 landlord listings. Otherwise you're activating demand with no supply.

**Day 16**
- OUTREACH: Send landlord status check emails to all signed-up landlords who haven't listed yet. "Your profile is ready. Can I help you add your first listing? Takes 10 minutes on a call."

**Day 17**
- OUTREACH: If ≥15 active listings, send the tenant email. Start with 50–100 people from your database, not the full list. Watch open rates, click rates, signups.
- METRIC: Email open rate target >25%, click rate >5%, signup rate >2%

**Day 18**
- ME: Make your first manual match. Look at who signed up, look at listings, send one email to both sides: "I think this property could be a great fit. Here's the listing. The landlord knows to expect your inquiry." That's it. That's the product for now.
- METRIC: First manual match made

**Day 19**
- OUTREACH: Follow up on your AHA contact. Not to sell — to learn. "Are you hearing from voucher holders who are having trouble finding landlords? I'm building a resource for them."

**Day 20**
- SITE: Add a simple "lease-up" flag to the admin panel. When a landlord marks a unit as rented to a Settleed tenant, you can tag it as a lease-up. This is your North Star metric tracker.
- METRIC: Lease-ups = 0 (you're working toward 1)

**Day 21 — 3-Week Review**
- Metric check: Active listings? Tenant signups? Applications submitted? Matches made?
- Decision gate: If zero applications after 1 week of tenant activation, the listings aren't matching what tenants need. Talk to 3 tenants directly — find out why.

---

### Week 4 (Days 22–30): Push for First Lease-Up

**Day 22**
- OUTREACH: Call every landlord who has received an application. "Did you hear from [tenant name]? Did you connect? Is there anything blocking you from moving forward?"
- Your job this week is to be the deal facilitator without being a broker. You can encourage, educate, and follow up — you cannot negotiate.

**Day 23**
- ME: Draft your "how the RFTA process works" one-pager. A clear, simple checklist landlords can follow. Send it to every landlord who has an interested tenant.
- Do NOT complete their RFTA. Give them the roadmap and let them drive.

**Day 24**
- OUTREACH: Send follow-up email to all tenant signups who haven't applied yet. "There are [X] new listings in Atlanta. Here are 3 that match your voucher. Apply directly →"
- Use the saved search email alert system (already built) — trigger it manually if needed

**Day 25**
- ME: Check in with your attorney contact. "Here's what we've done so far. Does anything concern you?" Get a gut check before going further.

**Day 26**
- OUTREACH: Reach out to Georgia DCA or AHA with a simple ask: "We have [X] verified landlords on Settleed who accept Section 8. Would your agency be willing to share this resource with voucher holders?" This is NOT a formal partnership pitch. It's a low-stakes referral ask.

**Day 27**
- ME: Write up what you know so far. Honest assessment: Which landlords are engaged? Which went cold? What do tenants need that we're not providing? What's slowing down lease-ups?
- This becomes your seed pitch if you ever raise capital, and your benchmark if you ever hire someone.

**Day 28**
- SITE: Based on what you've learned, identify ONE product improvement that would accelerate lease-ups. Build only that one thing.

**Day 29**
- OUTREACH: Push for any deal that's in progress. Follow up. Offer to help. Stay engaged without being a broker.

**Day 30 — Decision Day**
- Metrics review:
  - Active landlord listings: Target ≥ 25
  - Tenant signups: Target ≥ 50  
  - Applications submitted: Target ≥ 10
  - Lease-ups: Target ≥ 1
- Decision: Does the product need to change? Do you pivot the message? Do you go deeper into one segment?
- If you hit 1 lease-up: You have proof. Write the case study. Share it. Start the monetization conversation with counsel.
- If you hit 0 lease-ups: Find out where in the funnel deals are dying. Fix that one thing.

---

## PART 5 — MESSAGING UPDATES NEEDED

### Homepage Hero (current vs. needed)

**Current (implied by subscription model):** Premium platform, subscription required  
**Needed:** "Atlanta's free Section 8 marketplace. Connect with verified voucher holders — no fees, no subscription, no waiting."

### For Landlords Page — Key Message
"List your Section 8 property in 10 minutes. Free during Early Access. We verify every voucher holder before they apply to your listing."

### For Tenants / Search
"Every listing on Settleed is from a landlord who accepts Housing Choice Vouchers. No more calling 30 numbers to find one who says yes."

---

## PART 6 — OUTREACH SCRIPTS

### Founding Landlord Call Script (30 seconds)
"Hi [name], this is Demetrius. I spent years at Atlanta Housing and I've been building a free platform for landlords who accept Section 8. It's called Settleed — you list your property, we show it to verified voucher holders, and we help track the inspection and RFTA process. Zero fees during Early Access. I'm looking for 25 founding landlords. You'd be one of the first. Can I walk you through it on a 10-minute call?"

### Landlord Text Follow-Up
"Hey [name] — Demetrius here. I tried calling about Settleed, a free Section 8 listing tool I built. Worth a 10-min call? settleed.com"

### Tenant Activation Email (CAN-SPAM Compliant)
Subject: Free tool to find Section 8 landlords in Atlanta  
Body:
"Hi [first name],  
Settleed is a free platform where every listing is from a landlord who already accepts Housing Choice Vouchers. Browse and apply directly — no phone calls, no guesswork.  
[Browse listings →]  
Free to use. No sign-up fee.  
— Demetrius Wilburn, Settleed  
[Address for CAN-SPAM] | [Unsubscribe]"

---

## PART 7 — METRICS DASHBOARD (Track Weekly)

| Metric | Week 1 | Week 2 | Week 3 | Week 4 | Target |
|---|---|---|---|---|---|
| Landlord outreach attempts | — | — | — | — | 40 total |
| Landlord demos conducted | — | — | — | — | 15 |
| Active listings live | — | — | — | — | 25 |
| Tenant signups | — | — | — | — | 50 |
| Applications submitted | — | — | — | — | 10 |
| Matches made (manual) | — | — | — | — | 5 |
| **Lease-ups** | — | — | — | — | **≥ 1** |

---

## PART 8 — WHAT TO DO TOMORROW MORNING

**Priority order. Do not skip ahead.**

**1. Call 5 landlords.** (9am–12pm)  
Not email. Not text. Phone call. Use the script above. The most important thing you can do tomorrow is generate a human conversation about Settleed. Every minute you spend on code instead of outreach is a mistake this week.

**2. Update the landing page hero.** (1 hour, after calls)  
Change it to reflect free Early Access. A landlord who gets curious and visits settleed.com after your call must immediately see "Free to list. No credit card." If they see premium pricing or confusion about cost, they bounce.

**3. Make your landlord list.** (30 min)  
Everyone you know who owns rental property in Atlanta. Former AHA colleagues who were landlords. Anyone in your network. Minimum 20 names. This is your first outreach pipeline.

**4. Do NOT open VS Code to build anything new.** Seriously. The subscription paywall is now gone. The site works. You have public listing pages, search, applications, email alerts, and an admin queue. That is enough product to get 25 landlords and 1 lease-up. Stop building and start selling.

**5. One optional SITE task if you finish everything else early:**  
Update the For Landlords page to say "Free" prominently in the hero. 30 minutes max.

---

## Things I'm Pushing Back On

**"I need to build X before I can do outreach."** No. The product is good enough. The constraint is not the product — it's the number of humans who know Settleed exists.

**"Let me email blast my full database."** Not yet. CAN-SPAM and TCPA compliance first. A formal bulk email to people who didn't explicitly opt in creates legal exposure. Start with people who know you, then layer in the database with proper unsubscribe infrastructure.

**"I'll get a housing authority partner first."** Housing authorities move slowly. A partnership would be great but waiting for one is a mistake. Build the landlord supply independently. When you have 25 listings, the partnership pitch is much stronger.

**"What about background checks / FCRA?"** Disabled. Do not re-enable without a FCRA compliance attorney reviewing your procedures. The liability if you mishandle adverse action notices is significant.

**"Should I add monetization signals to track what features would generate revenue?"** Not this week. The only signal that matters is lease-ups. Revenue conversations happen after you prove the model.
