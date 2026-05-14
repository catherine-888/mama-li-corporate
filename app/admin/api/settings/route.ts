import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { revalidateSettings } from '@/lib/content';
import { isMockMode } from '@/lib/mock';

// PUT /admin/api/settings — update the singleton row (id=1).

const Schema = z.object({
  brand_name: z.string().min(1),
  brand_tagline: z.string(),
  logo_url: z.string().nullable(),
  font_pairing: z.enum(['editorial', 'classic', 'modern', 'sans']),
  palette: z.enum(['jade', 'coral', 'charcoal', 'gold']),
  hero_kicker: z.string(),
  hero_headline_1: z.string(),
  hero_headline_2: z.string(),
  hero_headline_3: z.string(),
  hero_body: z.string(),
  hero_img: z.string().nullable(),
  min_spend: z.number().nonnegative(),
  delivery_fee: z.number().nonnegative(),
  vat_rate: z.number().min(0).max(1),
  postcode_areas: z.array(z.string()),
  contact_email: z.string().email(),
  contact_phone: z.string(),
  footer_blurb: z.string(),
  trust_logos: z.array(z.string()),
});

export async function PUT(req: Request) {
  const actor = await requireAdmin();
  if (isMockMode()) return NextResponse.json({ ok: true, mocked: true });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const sb = createAdminClient();
  const { error } = await sb.from('site_settings').update(parsed.data).eq('id', 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sb.from('audit_log').insert({
    actor_id: actor.user_id,
    actor_email: actor.email,
    action: 'update',
    resource: 'settings',
    resource_id: 'site',
    changes: parsed.data,
  });

  revalidateSettings();
  return NextResponse.json({ ok: true });
}
