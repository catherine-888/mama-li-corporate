-- ─────────────────────────────────────────────────────────────
--  Mama Li Corporate — Admin content schema (v2 migration)
--
--  This adds the content tables that the admin portal manages:
--   - bundles, alacarte_items, modifier_groups, modifier_options
--   - timeslots, locations
--   - blocked_dates, slot_capacity_overrides
--   - site_settings (a single-row config table)
--   - admin_users (role-gating for /admin routes)
--   - audit_log (who changed what when)
--
--  Run this AFTER the original schema.sql. Safe to re-run.
--  The seed-data step (lib/menu.ts → tables) happens via the
--  scripts/seed-content.ts node script (run once).
-- ─────────────────────────────────────────────────────────────

-- Bundles -------------------------------------------------------
create table if not exists public.bundles (
  id            text primary key,
  cat           text not null check (cat in ('platters', 'lunchboxes', 'canapes')),
  name          text not null,
  subtitle      text not null,
  description   text not null,
  serves        text not null,
  price         numeric(10,2) not null check (price >= 0),
  tag           text,
  cn            text,
  img           text,
  contains      text[] not null default '{}',
  sort_order    int not null default 100,
  visible       boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists bundles_cat_idx on public.bundles (cat, sort_order);
create index if not exists bundles_visible_idx on public.bundles (visible, sort_order);

-- À la carte items ---------------------------------------------
create table if not exists public.alacarte_items (
  id            text primary key,
  name          text not null,
  price         numeric(10,2) not null check (price >= 0),
  cat           text not null,
  sort_order    int not null default 100,
  visible       boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists alacarte_visible_idx on public.alacarte_items (visible, sort_order);

-- Modifier groups (FK to bundles) ------------------------------
create table if not exists public.modifier_groups (
  id            uuid primary key default gen_random_uuid(),
  bundle_id     text not null references public.bundles(id) on delete cascade,
  key           text not null, -- the prototype's group "id" e.g. 'meats', 'base'
  label         text not null,
  sub           text,
  required      boolean not null default false,
  type          text not null default 'single' check (type in ('single', 'multi')),
  depends_on    text, -- another modifier_groups.key
  sort_order    int not null default 100,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (bundle_id, key)
);

create index if not exists modifier_groups_bundle_idx on public.modifier_groups (bundle_id, sort_order);

-- Modifier options ---------------------------------------------
create table if not exists public.modifier_options (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.modifier_groups(id) on delete cascade,
  key           text not null, -- e.g. '1', '2', 'charsiu', 'jasmine'
  label         text not null,
  sub           text,
  delta         numeric(10,2) not null default 0,
  sort_order    int not null default 100,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (group_id, key)
);

create index if not exists modifier_options_group_idx on public.modifier_options (group_id, sort_order);

-- Timeslots ----------------------------------------------------
create table if not exists public.timeslots (
  id            text primary key,
  label         text not null,
  tag           text not null,
  sort_order    int not null default 100,
  active        boolean not null default true,
  default_capacity int not null default 1 check (default_capacity >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists timeslots_active_idx on public.timeslots (active, sort_order);

-- Locations ----------------------------------------------------
create table if not exists public.locations (
  id            text primary key,
  name          text not null,
  addr          text not null,
  pickup        text not null,
  cn            text not null,
  sort_order    int not null default 100,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists locations_active_idx on public.locations (active, sort_order);

-- Blocked dates ------------------------------------------------
-- A date in this table means "we are not delivering on this day".
-- Used for holidays, kitchen closures, fully-booked overflow.
create table if not exists public.blocked_dates (
  date          date primary key,
  reason        text not null default '',
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null
);

-- Slot capacity overrides --------------------------------------
-- For a specific (date, timeslot) override the default capacity.
-- E.g. "Friday 6 June, 12:00-13:00, capacity 0" to close just that slot.
-- E.g. "Wednesday 11 June, 13:00-14:00, capacity 3" to expand.
create table if not exists public.slot_capacity_overrides (
  date          date not null,
  slot_id       text not null references public.timeslots(id) on delete cascade,
  capacity      int not null check (capacity >= 0),
  reason        text not null default '',
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null,
  primary key (date, slot_id)
);

-- Site settings (single-row config) ----------------------------
-- Singleton table. Always row with id=1.
create table if not exists public.site_settings (
  id                int primary key default 1,
  brand_name        text not null default 'Mama Li',
  brand_tagline     text not null default 'Corporate',
  logo_url          text,
  font_pairing      text not null default 'editorial' check (font_pairing in ('editorial', 'classic', 'modern', 'sans')),
  palette           text not null default 'jade' check (palette in ('jade', 'coral', 'charcoal', 'gold')),
  hero_kicker       text not null default '— Corporate Catering · est. 2019',
  hero_headline_1   text not null default 'Feed the',
  hero_headline_2   text not null default 'whole office',
  hero_headline_3   text not null default 'properly.',
  hero_body         text not null default 'Hong Kong–style siu mei, family platters and proper working lunches — cooked fresh in our City kitchens and delivered to your boardroom in a two-hour window.',
  hero_img          text,
  min_spend         numeric(10,2) not null default 250,
  delivery_fee      numeric(10,2) not null default 15,
  vat_rate          numeric(5,4) not null default 0.20,
  postcode_areas    text[] not null default array['EC1','EC2','EC3','EC4'],
  contact_email     text not null default 'orders@mamali.co.uk',
  contact_phone     text not null default '+44 20 7946 0000',
  footer_blurb      text not null default 'From Hong Kong to London, with love. Family-run, twenty-plus years in roasted Cantonese meats.',
  trust_logos       text[] not null default array['Goldman Sachs','Allen & Overy','Schroders','Linklaters','KPMG · UK Wall','Slaughter and May','Aviva'],
  updated_at        timestamptz not null default now(),
  check (id = 1)
);

-- Insert the singleton row if missing
insert into public.site_settings (id) values (1)
  on conflict (id) do nothing;

-- Admin users --------------------------------------------------
-- A row in this table grants the corresponding auth.users access
-- to /admin. Email is duplicated for convenience (lookup by email
-- before knowing the user_id).
create table if not exists public.admin_users (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  name          text,
  role          text not null default 'admin' check (role in ('admin', 'owner')),
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null
);

-- Audit log ----------------------------------------------------
create table if not exists public.audit_log (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references auth.users(id) on delete set null,
  actor_email   text,
  action        text not null, -- 'create' | 'update' | 'delete'
  resource      text not null, -- 'bundle' | 'alacarte' | 'timeslot' | etc
  resource_id   text,
  changes       jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists audit_log_resource_idx on public.audit_log (resource, resource_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
--  Touch-updated-at triggers for content tables
-- ─────────────────────────────────────────────────────────────

drop trigger if exists bundles_touch on public.bundles;
create trigger bundles_touch before update on public.bundles
  for each row execute function public.touch_updated_at();

drop trigger if exists alacarte_touch on public.alacarte_items;
create trigger alacarte_touch before update on public.alacarte_items
  for each row execute function public.touch_updated_at();

drop trigger if exists modifier_groups_touch on public.modifier_groups;
create trigger modifier_groups_touch before update on public.modifier_groups
  for each row execute function public.touch_updated_at();

drop trigger if exists modifier_options_touch on public.modifier_options;
create trigger modifier_options_touch before update on public.modifier_options
  for each row execute function public.touch_updated_at();

drop trigger if exists timeslots_touch on public.timeslots;
create trigger timeslots_touch before update on public.timeslots
  for each row execute function public.touch_updated_at();

drop trigger if exists locations_touch on public.locations;
create trigger locations_touch before update on public.locations
  for each row execute function public.touch_updated_at();

drop trigger if exists site_settings_touch on public.site_settings;
create trigger site_settings_touch before update on public.site_settings
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
--  Row-level security
-- ─────────────────────────────────────────────────────────────

alter table public.bundles                  enable row level security;
alter table public.alacarte_items           enable row level security;
alter table public.modifier_groups          enable row level security;
alter table public.modifier_options         enable row level security;
alter table public.timeslots                enable row level security;
alter table public.locations                enable row level security;
alter table public.blocked_dates            enable row level security;
alter table public.slot_capacity_overrides  enable row level security;
alter table public.site_settings            enable row level security;
alter table public.admin_users              enable row level security;
alter table public.audit_log                enable row level security;

-- Public read access for everything customers need to see.
-- Admin writes happen via the service-role key (server-side).
drop policy if exists "bundles_public_read" on public.bundles;
create policy "bundles_public_read" on public.bundles for select using (visible = true);

drop policy if exists "alacarte_public_read" on public.alacarte_items;
create policy "alacarte_public_read" on public.alacarte_items for select using (visible = true);

drop policy if exists "modifier_groups_public_read" on public.modifier_groups;
create policy "modifier_groups_public_read" on public.modifier_groups for select using (true);

drop policy if exists "modifier_options_public_read" on public.modifier_options;
create policy "modifier_options_public_read" on public.modifier_options for select using (true);

drop policy if exists "timeslots_public_read" on public.timeslots;
create policy "timeslots_public_read" on public.timeslots for select using (active = true);

drop policy if exists "locations_public_read" on public.locations;
create policy "locations_public_read" on public.locations for select using (active = true);

drop policy if exists "blocked_dates_public_read" on public.blocked_dates;
create policy "blocked_dates_public_read" on public.blocked_dates for select using (true);

drop policy if exists "slot_overrides_public_read" on public.slot_capacity_overrides;
create policy "slot_overrides_public_read" on public.slot_capacity_overrides for select using (true);

drop policy if exists "settings_public_read" on public.site_settings;
create policy "settings_public_read" on public.site_settings for select using (true);

-- Admin users: only admins can see the list (used by middleware)
-- but the middleware uses the service-role key, so this is mostly
-- belt-and-braces. Anonymous reads are forbidden.
drop policy if exists "admin_users_self_read" on public.admin_users;
create policy "admin_users_self_read" on public.admin_users
  for select using (user_id = auth.uid());

-- Audit log: admins can read their own actions; service-role bypasses.
drop policy if exists "audit_self_read" on public.audit_log;
create policy "audit_self_read" on public.audit_log
  for select using (actor_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
--  Storage bucket for images (created via Supabase dashboard, but
--  these policies make it work). Bucket name: `mamali-images`.
-- ─────────────────────────────────────────────────────────────

-- These policies assume a public-read bucket named 'mamali-images'.
-- Create it in the Supabase dashboard first (Storage → New bucket
-- → name: 'mamali-images', public: true). Then this SQL grants
-- the right permissions.

-- Public read
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'mamali_images_public_read') then
    create policy "mamali_images_public_read" on storage.objects
      for select to public
      using (bucket_id = 'mamali-images');
  end if;
exception when undefined_table then null;
end $$;

-- Authenticated insert (admin uploads via service-role key in
-- practice, so this is also belt-and-braces)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'mamali_images_admin_insert') then
    create policy "mamali_images_admin_insert" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'mamali-images');
  end if;
exception when undefined_table then null;
end $$;

-- ─────────────────────────────────────────────────────────────
--  Saved addresses (customer-side) — added in v2.1
--
--  Lets signed-in customers keep a list of recipient/building
--  combos for one-tap fill-in at checkout. Per-user.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.saved_addresses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  label         text not null,            -- "Bishopsgate Tower 14F" / "Reception"
  recipient     text not null default '',
  building      text not null default '',
  address       text not null default '',
  postcode      text not null default '',
  contact_phone text not null default '',
  notes         text not null default '',
  is_default    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists saved_addresses_user_idx on public.saved_addresses (user_id, is_default desc, created_at desc);

alter table public.saved_addresses enable row level security;

drop policy if exists "saved_addresses_own" on public.saved_addresses;
create policy "saved_addresses_own" on public.saved_addresses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop trigger if exists saved_addresses_touch on public.saved_addresses;
create trigger saved_addresses_touch before update on public.saved_addresses
  for each row execute function public.touch_updated_at();
