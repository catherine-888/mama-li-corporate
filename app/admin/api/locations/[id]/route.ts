import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { revalidateLocations } from '@/lib/content';
import { isMockMode } from '@/lib/mock';

const Update = z.object({
  name: z.string().optional(),
  addr: z.string().optional(),
  pickup: z.string().optional(),
  cn: z.string().optional(),
  sort_order: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const actor = await requireAdmin();
  if (isMockMode()) return NextResponse.json({ ok: true, mocked: true });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  const parsed = Update.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const sb = createAdminClient();
  const { error } = await sb.from('locations').update(parsed.data).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await sb.from('audit_log').insert({
    actor_id: actor.user_id, actor_email: actor.email,
    action: 'update', resource: 'location', resource_id: params.id, changes: parsed.data,
  });
  revalidateLocations();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const actor = await requireAdmin();
  if (isMockMode()) return NextResponse.json({ ok: true, mocked: true });
  const sb = createAdminClient();
  const { error } = await sb.from('locations').update({ active: false }).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await sb.from('audit_log').insert({
    actor_id: actor.user_id, actor_email: actor.email,
    action: 'delete', resource: 'location', resource_id: params.id,
  });
  revalidateLocations();
  return NextResponse.json({ ok: true });
}
