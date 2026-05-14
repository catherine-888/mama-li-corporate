import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { revalidateTimeslots } from '@/lib/content';
import { isMockMode } from '@/lib/mock';

const Update = z.object({
  label: z.string().optional(),
  tag: z.string().optional(),
  sort_order: z.number().int().optional(),
  active: z.boolean().optional(),
  default_capacity: z.number().int().min(0).optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const actor = await requireAdmin();
  if (isMockMode()) return NextResponse.json({ ok: true, mocked: true });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  const parsed = Update.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const sb = createAdminClient();
  const { error } = await sb.from('timeslots').update(parsed.data).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await sb.from('audit_log').insert({
    actor_id: actor.user_id, actor_email: actor.email,
    action: 'update', resource: 'timeslot', resource_id: params.id, changes: parsed.data,
  });
  revalidateTimeslots();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const actor = await requireAdmin();
  if (isMockMode()) return NextResponse.json({ ok: true, mocked: true });
  const sb = createAdminClient();
  const { error } = await sb.from('timeslots').update({ active: false }).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await sb.from('audit_log').insert({
    actor_id: actor.user_id, actor_email: actor.email,
    action: 'delete', resource: 'timeslot', resource_id: params.id,
  });
  revalidateTimeslots();
  return NextResponse.json({ ok: true });
}
