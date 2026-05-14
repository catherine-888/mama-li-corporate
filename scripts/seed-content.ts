/* eslint-disable no-console */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { BUNDLES, ALACARTE, TIMESLOTS, LOCATIONS } from '../lib/menu';

// ─────────────────────────────────────────────────────────────
//  Seed script — populates the content tables with the original
//  menu defined in lib/menu.ts.
//
//  Usage:
//    npm run seed
//
//  Reads env from .env.local. Requires SUPABASE_SERVICE_ROLE_KEY
//  (bypasses RLS). Re-runnable: upserts by id so existing data
//  is updated, not duplicated.
// ─────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log('🌱  Seeding content tables…');

  // Bundles
  const bundleRows = BUNDLES.map((b, i) => ({
    id: b.id,
    cat: b.cat,
    name: b.name,
    subtitle: b.subtitle,
    description: b.description,
    serves: b.serves,
    price: b.price,
    tag: b.tag ?? null,
    cn: b.cn ?? null,
    img: b.img ?? null,
    contains: b.contains,
    sort_order: (i + 1) * 10,
    visible: true,
  }));
  const { error: bErr } = await admin.from('bundles').upsert(bundleRows, { onConflict: 'id' });
  if (bErr) throw new Error(`bundles: ${bErr.message}`);
  console.log(`   ✓ ${bundleRows.length} bundles`);

  // Modifier groups + options
  let groupCount = 0;
  let optionCount = 0;
  for (const b of BUNDLES) {
    if (!b.modifiers) continue;
    // Clear existing modifiers for this bundle to avoid stale rows
    await admin.from('modifier_groups').delete().eq('bundle_id', b.id);

    for (let gi = 0; gi < b.modifiers.length; gi++) {
      const g = b.modifiers[gi];
      const { data: insertedGroup, error: gErr } = await admin
        .from('modifier_groups')
        .insert({
          bundle_id: b.id,
          key: g.id,
          label: g.label,
          sub: g.sub ?? null,
          required: g.required ?? false,
          type: g.type ?? 'single',
          depends_on: g.dependsOn ?? null,
          sort_order: (gi + 1) * 10,
        })
        .select('id')
        .single();
      if (gErr || !insertedGroup) throw new Error(`modifier_groups (${b.id}/${g.id}): ${gErr?.message}`);
      groupCount += 1;

      const optionRows = g.options.map((o, oi) => ({
        group_id: insertedGroup.id,
        key: o.id,
        label: o.label,
        sub: o.sub ?? null,
        delta: o.delta ?? 0,
        sort_order: (oi + 1) * 10,
      }));
      const { error: oErr } = await admin.from('modifier_options').insert(optionRows);
      if (oErr) throw new Error(`modifier_options (${b.id}/${g.id}): ${oErr.message}`);
      optionCount += optionRows.length;
    }
  }
  console.log(`   ✓ ${groupCount} modifier groups, ${optionCount} options`);

  // À la carte
  const aRows = ALACARTE.map((a, i) => ({
    id: a.id,
    name: a.name,
    price: a.price,
    cat: a.cat,
    sort_order: (i + 1) * 10,
    visible: true,
  }));
  const { error: aErr } = await admin.from('alacarte_items').upsert(aRows, { onConflict: 'id' });
  if (aErr) throw new Error(`alacarte: ${aErr.message}`);
  console.log(`   ✓ ${aRows.length} à la carte items`);

  // Timeslots
  const sRows = TIMESLOTS.map((s, i) => ({
    id: s.id,
    label: s.label,
    tag: s.tag,
    sort_order: (i + 1) * 10,
    active: true,
    default_capacity: 1,
  }));
  const { error: sErr } = await admin.from('timeslots').upsert(sRows, { onConflict: 'id' });
  if (sErr) throw new Error(`timeslots: ${sErr.message}`);
  console.log(`   ✓ ${sRows.length} timeslots`);

  // Locations
  const lRows = LOCATIONS.map((l, i) => ({
    id: l.id,
    name: l.name,
    addr: l.addr,
    pickup: l.pickup,
    cn: l.cn,
    sort_order: (i + 1) * 10,
    active: true,
  }));
  const { error: lErr } = await admin.from('locations').upsert(lRows, { onConflict: 'id' });
  if (lErr) throw new Error(`locations: ${lErr.message}`);
  console.log(`   ✓ ${lRows.length} locations`);

  console.log('🎉 Seed complete.');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
