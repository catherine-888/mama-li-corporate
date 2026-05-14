import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { revalidateAvailability } from '@/lib/content';
import { isMockMode } from '@/lib/mock';

const Schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot_id: z.string().min(1),
  capacity: z.number().int().min(0),
  reason: z.string().default(''),
});

export async function POST(req: Request) {
  const actor = await requireAdmin();
  if (isMockMode()) return NextResponse.json({ ok: true, mocked: true });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const sb = createAdminClient();
  const { error } = await sb.from('slot_capacity_overrides').upsert(
    { ...parsed.data, created_by: actor.user_id },
    { onConflict: 'date,slot_id' }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await sb.from('audit_log').insert({
    actor_id: actor.user_id, actor_email: actor.email,
    action: 'override_capacity', resource: 'slot_override',
    resource_id: `${parsed.data.date}/${parsed.data.slot_id}`, changes: parsed.data,
  });
  revalidateAvailability();
  return NextResponse.json({ ok: true });
}
