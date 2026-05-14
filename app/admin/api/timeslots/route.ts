import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { revalidateTimeslots } from '@/lib/content';
import { isMockMode } from '@/lib/mock';

const Schema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  tag: z.string().min(1),
  sort_order: z.number().int().default(100),
  active: z.boolean().default(true),
  default_capacity: z.number().int().min(0).default(1),
});

export async function POST(req: Request) {
  const actor = await requireAdmin();
  if (isMockMode()) return NextResponse.json({ ok: true, mocked: true });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const sb = createAdminClient();
  const { error } = await sb.from('timeslots').insert(parsed.data);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await sb.from('audit_log').insert({
    actor_id: actor.user_id, actor_email: actor.email,
    action: 'create', resource: 'timeslot', resource_id: parsed.data.id, changes: parsed.data,
  });
  revalidateTimeslots();
  return NextResponse.json({ ok: true });
}
