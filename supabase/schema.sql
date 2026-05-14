-- ─────────────────────────────────────────────────────────────
--  Mama Li Corporate — Supabase schema
--
--  Run this once on a fresh Supabase project (SQL Editor →
--  paste → Run). It's idempotent: safe to re-run.
--
--  Tables:
--   - account_applications: new account requests, ops reviews
--     these manually before flipping to 'approved'
--   - orders: every order (pending, paid, cancelled, failed)
--   - bookings: future per-slot booking counts (empty for now)
--
--  Auth: we use Supabase's built-in auth.users table. Magic-link
--  sign-in is enabled via dashboard settings.
-- ─────────────────────────────────────────────────────────────

-- Extensions ----------------------------------------------------
create extension if not exists "pgcrypto";

-- Application requests ------------------------------------------
create table if not exists public.account_applications (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  name          text not null,
  company       text not null,
  phone         text not null,
  company_type  text,
  frequency     text,
  billing       text,
  status        text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  notes         text,
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz
);

create index if not exists account_applications_status_idx
  on public.account_applications (status, created_at desc);

-- Orders --------------------------------------------------------
create table if not exists public.orders (
  id                       uuid primary key default gen_random_uuid(),
  account_id               uuid references auth.users(id) on delete set null,
  postcode                 text not null,
  cart                     jsonb not null,
  delivery                 jsonb not null,
  totals                   jsonb not null,
  status                   text not null default 'pending'
                           check (status in ('pending', 'paid', 'cancelled', 'failed')),
  stripe_session_id        text unique,
  stripe_payment_intent_id text,
  contact_email            text,
  contact_name             text,
  contact_company          text,
  contact_phone            text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists orders_status_idx
  on public.orders (status, created_at desc);
create index if not exists orders_account_idx
  on public.orders (account_id, created_at desc);
create index if not exists orders_stripe_session_idx
  on public.orders (stripe_session_id);

-- Maintain updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- Bookings (future feature) -------------------------------------
--
--  When you want time-slot capacity to grey out booked slots on
--  the checkout date picker, populate this table with one row per
--  (date, slot) for each paid order. The checkout page can query
--  it and disable booked slots. For v1 it's intentionally empty
--  and every slot shows as available.
create table if not exists public.bookings (
  date        date not null,
  slot        text not null,
  order_id    uuid references public.orders(id) on delete cascade,
  primary key (date, slot)
);

-- Row-level security --------------------------------------------
alter table public.account_applications enable row level security;
alter table public.orders               enable row level security;
alter table public.bookings             enable row level security;

-- Applications: nobody can read via anon/auth keys — they're
-- only readable in the dashboard or with the service-role key.
drop policy if exists "applications_no_select" on public.account_applications;
create policy "applications_no_select" on public.account_applications
  for select using (false);
drop policy if exists "applications_no_insert" on public.account_applications;
create policy "applications_no_insert" on public.account_applications
  for insert with check (false);
-- (Inserts come from the service-role key via /api/auth/apply.)

-- Orders: signed-in users see their own orders, nobody can write.
drop policy if exists "orders_self_read" on public.orders;
create policy "orders_self_read" on public.orders
  for select using (account_id = auth.uid());
drop policy if exists "orders_no_anon_write" on public.orders;
create policy "orders_no_anon_write" on public.orders
  for insert with check (false);
-- (Writes happen via service-role key in the API routes.)

-- Bookings: read-only for everyone (so the checkout can show
-- which slots are taken without exposing order data).
drop policy if exists "bookings_public_read" on public.bookings;
create policy "bookings_public_read" on public.bookings
  for select using (true);

-- ─────────────────────────────────────────────────────────────
--  approve_application(uuid)
--
--  Helper for the ops team: given an application id, sets it to
--  'approved' and creates the corresponding auth.users row so
--  the customer can sign in with magic link.
--
--  Usage from the Supabase dashboard SQL editor:
--    select public.approve_application('<the-uuid>');
--
--  Note: Supabase doesn't let you insert directly into auth.users
--  from SQL in a way that's robust across versions. The cleanest
--  approach is to use the Supabase Admin API from a small script
--  (see SETUP.md). This function flips the application status so
--  ops has a record, but the actual auth user creation needs to
--  happen via the Auth UI in the dashboard ("Add user → Send
--  magic link") or via the admin API.
-- ─────────────────────────────────────────────────────────────
create or replace function public.approve_application(application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.account_applications
     set status = 'approved',
         reviewed_at = now()
   where id = application_id and status = 'pending';
end;
$$;
