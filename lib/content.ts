import 'server-only';
import { unstable_cache, revalidateTag } from 'next/cache';
import { createAdminClient } from './supabase-server';
import type {
  Bundle,
  AlaCarteItem,
  Timeslot,
  Location,
  Modifier,
  ModifierOption,
} from './types';
import { isMockMode } from './mock';
import {
  BUNDLES as STATIC_BUNDLES,
  ALACARTE as STATIC_ALACARTE,
  TIMESLOTS as STATIC_TIMESLOTS,
  LOCATIONS as STATIC_LOCATIONS,
  POSTCODE_AREAS as STATIC_POSTCODE_AREAS,
  VAT_RATE as STATIC_VAT_RATE,
  DELIVERY_FEE as STATIC_DELIVERY_FEE,
} from './menu';

// ─────────────────────────────────────────────────────────────
//  Content layer — fetches bundles, à la carte, timeslots,
//  locations, and site settings from Supabase, with per-resource
//  caching and tag-based invalidation.
//
//  Mock mode short-circuits to the static lib/menu.ts data.
//  Real mode reads from the database. Either way, the calling
//  components get back the same shape of data.
//
//  When the admin saves a change, the API route calls
//  `revalidateTag('content:bundles')` (or similar) and the next
//  request rebuilds the cache. Cache lifetime is otherwise 1 hour.
// ─────────────────────────────────────────────────────────────

export const CONTENT_TAGS = {
  bundles: 'content:bundles',
  alacarte: 'content:alacarte',
  timeslots: 'content:timeslots',
  locations: 'content:locations',
  settings: 'content:settings',
  blockedDates: 'content:blocked-dates',
  capacityOverrides: 'content:capacity-overrides',
} as const;

// ─────────── Bundles ───────────

async function _fetchBundles(): Promise<Bundle[]> {
  if (isMockMode()) return STATIC_BUNDLES;

  const admin = createAdminClient();
  const { data: bundles, error } = await admin
    .from('bundles')
    .select('*')
    .eq('visible', true)
    .order('sort_order');
  if (error || !bundles) {
    console.warn('fetchBundles failed, falling back to static:', error);
    return STATIC_BUNDLES;
  }

  // Modifier groups + options, joined into shape
  const ids = bundles.map((b) => b.id);
  const { data: groups } = await admin
    .from('modifier_groups')
    .select('*, modifier_options(*)')
    .in('bundle_id', ids)
    .order('sort_order');

  const groupsByBundle: Record<string, Modifier[]> = {};
  for (const g of groups ?? []) {
    const options: ModifierOption[] = (g.modifier_options ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((o: any) => ({
        id: o.key,
        label: o.label,
        sub: o.sub ?? undefined,
        delta: o.delta != null ? Number(o.delta) : undefined,
      }));
    const mod: Modifier = {
      id: g.key,
      label: g.label,
      sub: g.sub ?? undefined,
      required: g.required ?? false,
      type: g.type ?? 'single',
      dependsOn: g.depends_on ?? undefined,
      options,
    };
    (groupsByBundle[g.bundle_id] ??= []).push(mod);
  }

  return bundles.map((b) => ({
    id: b.id,
    cat: b.cat,
    name: b.name,
    subtitle: b.subtitle,
    description: b.description,
    serves: b.serves,
    price: Number(b.price),
    tag: b.tag ?? undefined,
    cn: b.cn ?? undefined,
    img: b.img ?? undefined,
    contains: b.contains ?? [],
    modifiers: groupsByBundle[b.id],
  }));
}

export const fetchBundles = unstable_cache(_fetchBundles, ['bundles'], {
  tags: [CONTENT_TAGS.bundles],
  revalidate: 3600,
});

// ─────────── À la carte ───────────

async function _fetchAlacarte(): Promise<AlaCarteItem[]> {
  if (isMockMode()) return STATIC_ALACARTE;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('alacarte_items')
    .select('*')
    .eq('visible', true)
    .order('sort_order');
  if (error || !data) {
    console.warn('fetchAlacarte failed, falling back to static:', error);
    return STATIC_ALACARTE;
  }
  return data.map((a) => ({
    id: a.id,
    name: a.name,
    price: Number(a.price),
    cat: a.cat,
  }));
}

export const fetchAlacarte = unstable_cache(_fetchAlacarte, ['alacarte'], {
  tags: [CONTENT_TAGS.alacarte],
  revalidate: 3600,
});

// ─────────── Timeslots ───────────

async function _fetchTimeslots(): Promise<Timeslot[]> {
  if (isMockMode()) return STATIC_TIMESLOTS;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('timeslots')
    .select('*')
    .eq('active', true)
    .order('sort_order');
  if (error || !data) {
    console.warn('fetchTimeslots failed, falling back to static:', error);
    return STATIC_TIMESLOTS;
  }
  return data.map((t) => ({ id: t.id, label: t.label, tag: t.tag }));
}

export const fetchTimeslots = unstable_cache(_fetchTimeslots, ['timeslots'], {
  tags: [CONTENT_TAGS.timeslots],
  revalidate: 3600,
});

// ─────────── Locations ───────────

async function _fetchLocations(): Promise<Location[]> {
  if (isMockMode()) return STATIC_LOCATIONS;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('locations')
    .select('*')
    .eq('active', true)
    .order('sort_order');
  if (error || !data) {
    console.warn('fetchLocations failed, falling back to static:', error);
    return STATIC_LOCATIONS;
  }
  return data.map((l) => ({
    id: l.id,
    name: l.name,
    addr: l.addr,
    pickup: l.pickup,
    cn: l.cn,
  }));
}

export const fetchLocations = unstable_cache(_fetchLocations, ['locations'], {
  tags: [CONTENT_TAGS.locations],
  revalidate: 3600,
});

// ─────────── Site settings ───────────

export type SiteSettings = {
  brand_name: string;
  brand_tagline: string;
  logo_url: string | null;
  font_pairing: 'editorial' | 'classic' | 'modern' | 'sans';
  palette: 'jade' | 'coral' | 'charcoal' | 'gold';
  hero_kicker: string;
  hero_headline_1: string;
  hero_headline_2: string;
  hero_headline_3: string;
  hero_body: string;
  hero_img: string | null;
  min_spend: number;
  delivery_fee: number;
  vat_rate: number;
  postcode_areas: string[];
  contact_email: string;
  contact_phone: string;
  footer_blurb: string;
  trust_logos: string[];
};

export const DEFAULT_SETTINGS: SiteSettings = {
  brand_name: 'Mama Li',
  brand_tagline: 'Corporate',
  logo_url: null,
  font_pairing: 'editorial',
  palette: 'jade',
  hero_kicker: '— Corporate Catering · est. 2019',
  hero_headline_1: 'Feed the',
  hero_headline_2: 'whole office',
  hero_headline_3: 'properly.',
  hero_body:
    'Hong Kong–style siu mei, family platters and proper working lunches — cooked fresh in our City kitchens and delivered to your boardroom in a two-hour window.',
  hero_img: null,
  min_spend: 250,
  delivery_fee: STATIC_DELIVERY_FEE,
  vat_rate: STATIC_VAT_RATE,
  postcode_areas: STATIC_POSTCODE_AREAS,
  contact_email: 'orders@mamali.co.uk',
  contact_phone: '+44 20 7946 0000',
  footer_blurb:
    'From Hong Kong to London, with love. Family-run, twenty-plus years in roasted Cantonese meats.',
  trust_logos: [
    'Goldman Sachs',
    'Allen & Overy',
    'Schroders',
    'Linklaters',
    'KPMG · UK Wall',
    'Slaughter and May',
    'Aviva',
  ],
};

async function _fetchSettings(): Promise<SiteSettings> {
  if (isMockMode()) return DEFAULT_SETTINGS;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error || !data) {
    console.warn('fetchSettings failed, using defaults:', error);
    return DEFAULT_SETTINGS;
  }
  return {
    brand_name: data.brand_name,
    brand_tagline: data.brand_tagline,
    logo_url: data.logo_url,
    font_pairing: data.font_pairing,
    palette: data.palette,
    hero_kicker: data.hero_kicker,
    hero_headline_1: data.hero_headline_1,
    hero_headline_2: data.hero_headline_2,
    hero_headline_3: data.hero_headline_3,
    hero_body: data.hero_body,
    hero_img: data.hero_img,
    min_spend: Number(data.min_spend),
    delivery_fee: Number(data.delivery_fee),
    vat_rate: Number(data.vat_rate),
    postcode_areas: data.postcode_areas ?? STATIC_POSTCODE_AREAS,
    contact_email: data.contact_email,
    contact_phone: data.contact_phone,
    footer_blurb: data.footer_blurb,
    trust_logos: data.trust_logos ?? [],
  };
}

export const fetchSettings = unstable_cache(_fetchSettings, ['settings'], {
  tags: [CONTENT_TAGS.settings],
  revalidate: 3600,
});

// ─────────── Slot availability ───────────

export type SlotAvailability = {
  blockedDates: string[]; // ISO yyyy-mm-dd
  capacityByDateSlot: Record<string, Record<string, number>>; // date → slot → capacity override
};

async function _fetchSlotAvailability(): Promise<SlotAvailability> {
  if (isMockMode()) return { blockedDates: [], capacityByDateSlot: {} };

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: blocked }, { data: overrides }] = await Promise.all([
    admin.from('blocked_dates').select('date').gte('date', today),
    admin.from('slot_capacity_overrides').select('date,slot_id,capacity').gte('date', today),
  ]);

  const blockedDates = (blocked ?? []).map((r) => r.date);
  const capacityByDateSlot: Record<string, Record<string, number>> = {};
  for (const o of overrides ?? []) {
    (capacityByDateSlot[o.date] ??= {})[o.slot_id] = o.capacity;
  }
  return { blockedDates, capacityByDateSlot };
}

export const fetchSlotAvailability = unstable_cache(
  _fetchSlotAvailability,
  ['slot-availability'],
  {
    tags: [CONTENT_TAGS.blockedDates, CONTENT_TAGS.capacityOverrides],
    revalidate: 300, // shorter — availability changes more frequently
  }
);

// ─────────── Invalidation helpers ───────────

export function revalidateBundles() {
  revalidateTag(CONTENT_TAGS.bundles);
}
export function revalidateAlacarte() {
  revalidateTag(CONTENT_TAGS.alacarte);
}
export function revalidateTimeslots() {
  revalidateTag(CONTENT_TAGS.timeslots);
}
export function revalidateLocations() {
  revalidateTag(CONTENT_TAGS.locations);
}
export function revalidateSettings() {
  revalidateTag(CONTENT_TAGS.settings);
}
export function revalidateAvailability() {
  revalidateTag(CONTENT_TAGS.blockedDates);
  revalidateTag(CONTENT_TAGS.capacityOverrides);
}
