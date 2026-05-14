# Mama Li Corporate — Setup & deployment guide

This is the runbook for taking this codebase from a fresh clone to a live, accepting-orders production site at **orders.mamali.co.uk**.

Estimated time for a developer: **2–4 hours** start to finish, plus 24h for DNS + Resend domain verification to complete.

You'll need accounts at:

1. [Supabase](https://supabase.com) — free tier is fine to start (database + auth)
2. [Stripe](https://stripe.com) — payment processing (only charged on real transactions)
3. [Resend](https://resend.com) — transactional email (free tier: 3,000 emails/month)
4. [Vercel](https://vercel.com) — hosting (free tier is fine for low-volume corporate ordering)
5. Access to DNS for `mamali.co.uk` (to point a subdomain at Vercel + verify email)

---

## 1. Local dev setup (15 min)

```bash
# Clone and install
git clone <repo-url> mama-li
cd mama-li
npm install

# Copy env template
cp .env.example .env.local
```

Open `.env.local` — you'll fill in values as you go through the rest of this guide.

```bash
# Start the dev server
npm run dev
# → http://localhost:3000
```

You should see the postcode gate. Try `EC2M 5TE` to advance — auth, menu, and checkout will all be visible but the API routes won't work until Supabase + Stripe are configured.

---

## 2. Supabase: database + auth (30 min)

### 2a. Create the project

1. Go to <https://supabase.com/dashboard> → **New project**.
2. Name: `mama-li-corporate`. Region: `eu-west-2 (London)`. Pricing: **Free** to start.
3. Wait \~2 minutes for provisioning.

### 2b. Get the keys

In the project: **Settings → API**. Copy these three values into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   ← "anon public" key
SUPABASE_SERVICE_ROLE_KEY=eyJ...       ← "service_role" key (keep private!)
```

> The service role key bypasses row-level security. Never expose it to the browser, never commit it to git.

### 2c. Run the schema

1. In Supabase → **SQL Editor → New query**.
2. Open `supabase/schema.sql` from this repo and paste the whole file.
3. Click **Run**.

You should see "Success. No rows returned" — three tables created (`account_applications`, `orders`, `bookings`) plus one helper function.

### 2d. Configure auth

1. **Authentication → Providers**: make sure **Email** is enabled, with **Email confirmation** ON and **Magic link** ON.
2. **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000` for now (change to `https://orders.mamali.co.uk` later)
   - **Redirect URLs**: add `http://localhost:3000/api/auth/callback` and (later) `https://orders.mamali.co.uk/api/auth/callback`
3. **Authentication → Email Templates → Magic link**: tweak the subject/body if you like. Default works fine.

### 2e. Test signup → application

In a fresh `npm run dev` terminal, go through the flow:

1. `http://localhost:3000` → enter `EC2M 5TE` → continue.
2. Click "New account" tab → fill the form → submit.
3. In Supabase → **Table Editor → account_applications** — you should see your row with status `pending`.

If you see an error, check the dev console + the Vercel/dev terminal logs.

### 2f. Approve an account (manual ops process)

When a real customer applies:

1. Open Supabase → **Table Editor → account_applications**. Review their details.
2. If you approve:
   - **Authentication → Users → Add user → Send magic link**, paste their email, click send. (Or: "Add user → Create new user" if you'd rather they sign in via password — but magic-link is the smoother experience.)
   - Then in the SQL editor, run:
     ```sql
     select approve_application('<the-application-uuid>');
     ```
3. The customer gets the magic-link email, clicks it, lands signed in on `/menu`.

> Tip: build a simple internal admin page later that lists pending applications and does this in one click. Out of scope for v1.

---

## 3. Stripe: payment (30 min)

### 3a. Create the account

1. Go to <https://stripe.com> → sign up. Choose **United Kingdom**. Business type: **Limited company** (or whatever applies). Tax category: **Restaurant / catering**.
2. You'll be in **test mode** by default — perfect.

### 3b. Get the test keys

**Developers → API keys**. Copy these two into `.env.local`:

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3c. Set up the webhook

We need Stripe to ping our `/api/stripe-webhook` route after every successful payment.

**Locally**, use the Stripe CLI to forward events to your dev server:

```bash
# Install: https://docs.stripe.com/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

The CLI will print a webhook signing secret like `whsec_xxxxx`. Paste it into `.env.local`:

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

Keep `stripe listen` running in its own terminal while you develop.

### 3d. Test a payment end-to-end

1. With dev server + `stripe listen` running, go through the full flow:
   - Postcode → sign in (use a real email and the magic-link from Supabase Auth → Users → Send magic link)
   - Add ≥£250 of items to cart
   - Checkout → fill delivery → click "Pay"
   - You'll redirect to Stripe Checkout
2. Use Stripe's [test card](https://docs.stripe.com/testing): `4242 4242 4242 4242`, any future expiry, any 3-digit CVC, any postcode.
3. After "Pay", you should:
   - Redirect to `/confirmation?session_id=...`
   - See the "Order confirmed" page
   - See the order in Supabase **orders** table with `status = 'paid'`
   - (Once Resend is set up) Get a confirmation email + the ops team gets a notification

If anything fails, check the dev terminal logs and the `stripe listen` output for errors.

---

## 4. Resend: transactional email (20 min, then 24h verification wait)

### 4a. Create the account & API key

1. <https://resend.com> → sign up.
2. **API Keys → Create API key**. Paste into `.env.local`:

```
RESEND_API_KEY=re_...
ORDERS_INBOX_EMAIL=orders@mamali.co.uk
ORDERS_FROM_EMAIL=orders@mamali.co.uk
ORDERS_FROM_NAME=Mama Li Corporate
```

### 4b. Verify the domain

Until the domain is verified, emails will only deliver to addresses you've added to Resend's "allowed list".

1. Resend → **Domains → Add Domain** → `mamali.co.uk`.
2. Resend will give you 3 DNS records (DKIM, SPF, DMARC). Add them to your DNS provider for `mamali.co.uk`.
3. Wait — typically 5 mins to 24h for DNS propagation. Resend's UI shows "Verified" when ready.

### 4c. Make sure `orders@mamali.co.uk` exists as an inbox

The "From" address (`orders@mamali.co.uk`) doesn't need to be a real inbox to send — Resend just needs the domain verified. But you want it to be a real inbox to **receive replies**: customers can reply to confirmation emails. Set this up in your mail provider (Google Workspace / Microsoft 365 / Fastmail / Cloudflare Email Routing).

### 4d. Test it

With the dev server + Stripe webhook listener + Resend API key all set, complete another test payment. Within seconds you should see:

- An email from `Mama Li Corporate <orders@mamali.co.uk>` in the customer's inbox
- A notification at `orders@mamali.co.uk` with the full kitchen breakdown

---

## 5. Vercel: hosting (20 min)

### 5a. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
# create a new private repo on GitHub, then:
git remote add origin git@github.com:your-org/mama-li-corporate.git
git push -u origin main
```

### 5b. Connect to Vercel

1. <https://vercel.com/new> → **Import Git Repository** → pick your repo.
2. Framework: **Next.js** (auto-detected).
3. Root directory: `./`.
4. Add **all** environment variables from `.env.local` under **Environment Variables** (paste them in one by one, or use Vercel's bulk-paste with `.env` format).

⚠ Set `NEXT_PUBLIC_SITE_URL=https://orders.mamali.co.uk` (your production URL) — **not** `localhost`.

5. Click **Deploy**. First deploy takes \~2 minutes.

### 5c. Point the domain

1. In Vercel → **Settings → Domains → Add** → `orders.mamali.co.uk`.
2. Vercel gives you a CNAME or A record. Add it to your DNS provider for `mamali.co.uk`.
3. Wait for DNS to propagate (usually 5 min). Vercel will auto-issue an SSL certificate.

### 5d. Reconfigure Supabase & Stripe with the production URL

Now that you have a real URL, update these:

**Supabase**:

- **Authentication → URL Configuration**:
  - Site URL: `https://orders.mamali.co.uk`
  - Redirect URLs: add `https://orders.mamali.co.uk/api/auth/callback`

**Stripe** (production webhook — replace the local `stripe listen` one):

1. **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://orders.mamali.co.uk/api/stripe-webhook`.
3. Events to send: select **`checkout.session.completed`** and **`checkout.session.expired`**.
4. After creating, click the new endpoint → **Reveal signing secret** → copy.
5. In Vercel → **Settings → Environment Variables**: update `STRIPE_WEBHOOK_SECRET` to this new secret. Redeploy.

### 5e. Test end-to-end on production

Run the whole flow on `https://orders.mamali.co.uk` using a Stripe test card. Everything should work. Then —

---

## 6. Going live (15 min)

When you're ready to take real money:

1. **Stripe → toggle from Test mode to Live mode** (top-right of dashboard).
2. **Developers → API keys** in live mode → copy `sk_live_...` and `pk_live_...`.
3. **Developers → Webhooks** in live mode → create a new webhook with the same URL and events → grab the new `whsec_...`.
4. In Vercel, update environment variables to the live versions. Redeploy.

You may also want to:

- Move Supabase off the free tier once you have real customer data (£25/mo for Pro).
- Set up automated backups (Supabase Pro includes daily backups).
- Set up [Vercel Analytics](https://vercel.com/analytics) (free) for traffic visibility.
- Add a simple internal admin page for ops to approve applications and see paid orders. (Currently they use the Supabase dashboard directly.)

---

## Troubleshooting

**Magic-link email not arriving** — Supabase rate-limits magic links to 4/hour per email by default. Bump it in **Auth → Rate Limits** if you're testing repeatedly.

**Webhook signature mismatch** — `STRIPE_WEBHOOK_SECRET` must match the endpoint you're hitting. Locally use the one from `stripe listen`; in prod use the one from the dashboard webhook. They're different.

**"Orders" table has rows but no payment confirmation email** — check Resend logs (it'll show why a send failed). Most common: domain not verified yet, or `ORDERS_FROM_EMAIL` doesn't match the verified domain.

**Confirmation page stuck on "Confirming your order…"** — the webhook didn't fire. Check Stripe dashboard → Webhooks → your endpoint → "View attempts". If it shows the right event but a 4xx/5xx response, check Vercel logs for the error.

**RLS errors when querying** — make sure API routes that need to bypass row-level security use `createAdminClient()` (with the service-role key), not `createClient()`.

---

## What was simplified for v1

The original design prototype had a few experimental options that are not in this production build. They can be added back later if needed:

- **Multiple hero layouts**: the design tool offered 4 hero styles (editorial, split, fullbleed, stack). Locked in **editorial** for production.
- **Multiple menu grid layouts**: prototype had 4 (cards, magazine, editorial, list). Locked in **cards**.
- **Tweaks panel**: the bottom-of-screen design tool was removed (it was for designers, not customers).
- **Single-page checkout variant**: locked in **stepped** (Account → Delivery → Payment).
- **Mock booking data**: prototype showed fake "booked" greying on the date picker. The real `bookings` table starts empty — every slot shows as available. To enable this for real, populate the `bookings` table whenever an order is paid (a webhook extension; left as a future task).

---

## Maintenance: editing menu and prices

Open `lib/menu.ts`. Bundles, à la carte items, time slots, locations, delivery fee, and VAT rate are all defined there. Edit, commit, push — Vercel redeploys automatically.

For bigger changes (a new bundle category, a new payment method, etc.) ping a developer.

---

That's the whole runbook. Total ongoing cost at corporate-scale orders: roughly **£0–25/month** until you grow past Supabase / Resend free tiers, plus **Stripe at 1.5% + 20p per UK card transaction**.

---

## Admin portal setup (one-time, after the v1 launch)

The admin portal lives at `/admin`. It lets your team edit menu, delivery slots, site settings, and review orders/applications without a developer.

### 1 · Apply the admin schema

In the Supabase dashboard → **SQL Editor** → paste the contents of `supabase/admin-schema.sql` → Run. This adds the content tables (bundles, alacarte, timeslots, locations, blocked_dates, slot_capacity_overrides, site_settings, admin_users, audit_log).

### 2 · Create the images storage bucket

Supabase dashboard → **Storage** → **New bucket**.

- Name: `mamali-images`
- Public bucket: **on** (so customers can see uploaded photos)

Click Create.

### 3 · Seed the content tables from `lib/menu.ts`

This copies the existing menu into the database one-time. From the project folder, with your env vars in `.env.local`:

```bash
npm install            # if you haven't already
npm run seed
```

This is idempotent — re-running it updates rows that have the same id rather than duplicating.

### 4 · Add the first admin user

You need a row in `admin_users` keyed to your auth user. In the Supabase **SQL Editor**:

```sql
-- First, make sure you have an auth.users row for your email.
-- If not, go to Authentication → Users → Add user → Send invite,
-- using the email you want to be an admin. Click the magic link
-- once to confirm the user.

-- Then make that user an admin:
insert into public.admin_users (user_id, email, role)
select id, email, 'owner'
from auth.users
where email = 'you@mamali.co.uk'
on conflict do nothing;
```

Replace `you@mamali.co.uk` with your real email. Use `'admin'` instead of `'owner'` for additional team members later.

### 5 · Sign in

Go to `/admin/login`, enter your email, click the magic link in the email. You're in.

### 6 · Add more team members

The dashboard has no UI for managing admins yet — invite team members through Supabase (Authentication → Users → Add user → Send invite), then add a matching row to `admin_users` as in step 4.

> Mock-mode note: if `NEXT_PUBLIC_MOCK_MODE=1` is set, the admin portal is accessible at `/admin/login` with any email — no setup needed. This is for design previews. Production should never run in mock mode.


---

## Account features (v2.1) — saved addresses, order history

The customer-facing `/account` section requires the saved-addresses table from `supabase/admin-schema.sql` (already applied if you've done the admin setup above). No further setup needed.

What it provides:
- `/account` — signed-in customer sees their order history with a one-tap re-order button.
- `/account/orders/[id]` — full breakdown of any past order. Re-order pulls items back into the cart.
- `/account/addresses` — saved addresses for one-tap checkout fill.
- The signed-in user navigates here via the "Account" link in the nav.

## Admin insights (v2.1) — top customers, top bundles, charts, CSV export

`/admin/insights` reads from the `orders` table directly — no extra setup. Use the preset buttons (Last 7 days / 30 / 90 days / 12 months / All time) or `?from=YYYY-MM-DD&to=YYYY-MM-DD` for a custom range.

`/admin/orders` now supports the same date filter, plus a "↓ Export CSV" button that downloads the currently-filtered orders as a spreadsheet for your accountant.

The `/admin` overview now shows a 12-week orders chart and links to insights.

---

## v2.2 — Calendar, Customers, polished dashboard, print invoice

What's new in this build:

**Admin · Calendar** (`/admin/calendar`) — month grid of upcoming deliveries with a day drill-down panel showing slot-by-slot detail. Filter by delivery vs pickup. No additional schema needed; reads from the existing `orders` table.

**Admin · Customers** (`/admin/customers`) — list of every company that has ordered in the last year, with search, sort (by spend / orders / recency), and tabs (all / active / top spenders). Click into any customer for their full history at `/admin/customers/[key]` with total spend, order count, average order value, and a list of every order with one-click link to the order detail. Derived from existing orders — no separate `customers` table needed.

**Admin · Dashboard polish** — the overview now includes top items by revenue (last 90 days), repeat-customer rate (% with 2+ orders), and week-on-week comparison. Alongside the existing tiles and 12-week chart.

**Admin · Settings polish** — palette and font-pairing pickers now show visual swatch cards (palette: 4 colours shown, name, description) and font samples (rendered "Mama Li" headline in each serif + sample sentence in the sans). Click to select.

**Customer · Order detail + print invoice** — order detail now has a 4-step status timeline (confirmed → in the kitchen → out for delivery → delivered) showing where the order is. A "Print invoice" link opens `/account/orders/[id]/print` which renders an A4-ready invoice. Customers can use browser print to save as PDF. NOTE: This is a print-friendly view, not a HMRC-compliant VAT invoice with sequential numbering. When you hit the VAT-registration threshold, get your developer to add proper invoice numbering + your registered VAT number.

No new database tables for any of this — all reads from the existing `orders` and `account_applications` tables. Just deploy and the new routes are live.
