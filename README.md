# Mama Li Corporate Catering

Next.js 14 site for Mama Li Group's corporate ordering — verified-account-only ordering for City of London offices.

---

## 👀 Preview the site (no setup)

The site ships with a **mock mode** that stubs out Supabase / Stripe / Resend so you can click through the full real UI — postcode → sign-in → landing → menu → checkout → confirmation — without any accounts or keys.

### Option A · Local preview (5 minutes)

Requires [Node.js](https://nodejs.org) 18+ installed.

```bash
# In the project folder:
npm install
cp .env.example .env.local        # mock mode is on by default
npm run dev
```

Open <http://localhost:3000>. You'll start at the postcode gate. Try `EC2M 5TE`, then click through. For sign-in, type any email; for new-account application, fill it in — both shortcut straight through.

To preview the **admin portal** in mock mode, go to <http://localhost:3000/admin/login>. Sign in with any email. You'll see the overview, menu editor, delivery editor, and site settings. Changes don't actually persist (mock mode is for clicking through the UI, not data entry).

> Note: in mock mode the order doesn't actually charge anything, doesn't actually send email, and doesn't persist to a real database. It's a click-through preview of the real UI.

### Option B · Deploy to Vercel (free, ~10 minutes)

Push this folder to a GitHub repo, then click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

In Vercel's import flow, the only env var you need to set is `NEXT_PUBLIC_MOCK_MODE=1`. (Everything else has safe defaults in `.env.example` and isn't used in mock mode.)

You'll get a real `https://your-project.vercel.app` URL within a few minutes. Anyone with the link can click through the site.

---

## 🚀 Going to production (real orders)

When you're ready to take real money: follow [`SETUP.md`](./SETUP.md) — a 6-step runbook covering Supabase, Stripe, Resend, custom domain, and the test-card → live-card cutover. Estimated time: 2-4 hours for a developer, plus 24h for DNS/email verification.

The admin portal at `/admin` (for editing menu, delivery slots, site settings) needs additional setup — see the "Admin portal setup" section at the bottom of `SETUP.md`. In mock mode it works out of the box (sign in with any email).

---

## Stack

- **Next.js 14** (App Router) + TypeScript + React 18
- **Supabase** — Postgres database + magic-link auth
- **Stripe Checkout** — hosted card payment (PCI scope: minimal)
- **Resend** — transactional email (customer confirmation + ops notification)
- **Vercel** — hosting

## Project layout

```
app/
  page.tsx       # Landing page (the marketing homepage)
  gate/          # Postcode check (EC1–EC4)
  auth/          # Magic-link sign-in + new-account application
  pending/       # After application — waiting for ops approval
  menu/          # Bundles, à la carte, sticky cart
  checkout/      # Stepped Account → Delivery → Payment
  confirmation/  # Post-Stripe success page
  api/
    auth/apply/             # POST — new account application
    auth/callback/          # GET  — magic-link OAuth callback
    checkout/create-session # POST — Stripe Checkout Session
    checkout/session/[id]/  # GET  — confirmation polling
    stripe-webhook/         # POST — Stripe webhook (the big one)
components/
  ui/            # Logo, FoodPlate, Btn, Tag, ornaments
  site-chrome.tsx# NavBar + Footer
  order-context.tsx # Cart + delivery state (localStorage-backed)
lib/
  menu.ts        # Bundles, à la carte, locations, timeslots — EDIT THIS
  order.ts       # Pricing math, date helpers
  mock.ts        # Mock-mode flag + fake user
  stripe.ts      # Stripe SDK init
  supabase-*.ts  # Supabase client init
  email.ts       # Resend SDK init
  types.ts       # Domain types (shared with schema)
emails/
  templates.ts   # HTML email templates
supabase/
  schema.sql     # Run once on a fresh Supabase project
```

## Editing the menu

Change prices, items, time slots, etc. in `lib/menu.ts`. The site picks up changes automatically on deploy.

## Operational flow (production)

1. New customer enters postcode → applies for account
2. Application saved to `account_applications`, ops team emailed
3. Ops reviews in Supabase, sends magic-link via Supabase Auth UI
4. Customer signs in, builds order, pays via Stripe
5. Stripe webhook flips order to `paid` and sends:
   - Customer confirmation email
   - Ops notification email at `orders@mamali.co.uk`

## What's in mock mode vs production

| Flow step | Mock mode | Production |
|---|---|---|
| Postcode gate | Real validation | Real validation |
| Sign in | Any email works — stored in localStorage | Magic link via Supabase |
| Account application | Skipped through to pending screen | POSTs to Supabase, emails ops |
| Menu + cart | Real (localStorage-backed) | Real (localStorage-backed) |
| Checkout payment | Fake — straight to confirmation in ~1s | Stripe Checkout (real card) |
| Order confirmation | Reads fake order from localStorage | Polls real DB until webhook flips status |
| Customer email | Not sent | Sent via Resend |
| Ops email | Not sent | Sent via Resend |

Switch by toggling `NEXT_PUBLIC_MOCK_MODE` in `.env.local`.
