import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { revalidateLocations } from '@/lib/content';
import { isMockMode } from '@/lib/mock';

const Schema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  addr: z.string().default(''),
  pickup: z.string().default(''),
  cn: z.string().default(''),
  sort_order: z.number().int().default(100),
  active: z.boolean().default(true),
});

export async function POST(req: Request) {
  const actor = await requireAdmin();
  if (isMockMode()) return NextResponse.json({ ok: true, mocked: true });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const sb = createAdminClient();
  const { error } = await sb.from('locations').insert(parsed.data);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await sb.from('audit_log').insert({
    actor_id: actor.user_id, actor_email: actor.email,
    action: 'create', resource: 'location', resource_id: parsed.data.id, changes: parsed.data,
  });
  revalidateLocations();
  return NextResponse.json({ ok: true });
}
