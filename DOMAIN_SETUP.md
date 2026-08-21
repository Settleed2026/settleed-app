# Settleed Domain & Email Setup

## Part 1 — Point settleed.com to Vercel

### Step 1: Add domain in Vercel
1. Go to vercel.com → your `settleed-app` project → **Settings → Domains**
2. Click **Add Domain** → type `settleed.com` → click **Add**
3. Also add `www.settleed.com` — Vercel will redirect it to `settleed.com`
4. Vercel will show you two DNS records to add

### Step 2: Add DNS records in your registrar (GoDaddy / Namecheap / Google Domains / etc.)
In your domain registrar's DNS settings, add:

| Type | Name | Value |
|------|------|-------|
| A    | @    | 76.76.21.21 (Vercel's IP) |
| CNAME | www | cname.vercel-dns.com |

> If your registrar doesn't allow an A record at `@`, use the CNAME `cname.vercel-dns.com` for the root domain instead.

### Step 3: Wait for propagation
DNS changes take 5–30 minutes. Vercel will automatically provision your SSL certificate once the records are verified.

---

## Part 2 — Set up email aliases (hello@, support@, agencies@settleed.com)

Since you're using Gmail, the easiest approach is **email forwarding** via your domain registrar or a free service like ImprovMX.

### Option A: ImprovMX (Recommended — free, 5-minute setup)
1. Go to **improvmx.com** → click **Get started for free**
2. Enter `settleed.com` → click **Create a free account**
3. Add forwarding aliases:
   - `hello@settleed.com` → `odtrius@gmail.com`
   - `support@settleed.com` → `odtrius@gmail.com`
   - `agencies@settleed.com` → `odtrius@gmail.com`
   - `noreply@settleed.com` → `odtrius@gmail.com`
4. ImprovMX will show you two MX records to add to your DNS

### DNS records for ImprovMX:
| Type | Name | Value | Priority |
|------|------|-------|----------|
| MX | @ | mx1.improvmx.com | 10 |
| MX | @ | mx2.improvmx.com | 20 |
| TXT | @ | v=spf1 include:spf.improvmx.com ~all | — |

Add these in the same DNS settings as Step 2 above.

### Option B: Google Workspace ($6/mo)
If you want to send FROM hello@settleed.com (not just receive), you'll need Google Workspace. 
Go to workspace.google.com → set up with settleed.com → follow Google's DNS verification steps.

---

## Part 3 — Update Vercel env var for emails
Once your domain is live, update `VITE_SUPABASE_URL` if needed. More importantly, make sure your SendGrid account has `noreply@settleed.com` verified as a sender:

1. Go to app.sendgrid.com → Settings → Sender Authentication
2. Click **Verify a Single Sender** → enter `noreply@settleed.com`
3. SendGrid will send a verification email to `odtrius@gmail.com` (via the alias you just set up)
4. Click the verification link

---

## Part 4 — Update Supabase redirect URLs
Once settleed.com is live, update your Auth redirect URLs in Supabase:

1. Go to supabase.com → your project → **Authentication → URL Configuration**
2. Add to **Redirect URLs**:
   - `https://settleed.com/**`
   - `https://www.settleed.com/**`
3. Update **Site URL** to `https://settleed.com`
