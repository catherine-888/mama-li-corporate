import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { revalidateAlacarte } from '@/lib/content';
import { isMockMode } from '@/lib/mock';

const Schema = z.object({
  name: z.string().min(1).optional(),
  cat: z.string().min(1).optional(),
  price: z.number().nonnegative().optional(),
  sort_order: z.number().int().optional(),
  visible: z.boolean().optional(),
});

async function patchOne(
  id: string,
  body: unknown,
  actor: { user_id: string; email: string },
  action: 'update' | 'patch'
) {
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const supabase = createAdminClient();
  const { error } = await supabase.from('alacarte_items').update(parsed.data).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('audit_log').insert({
    actor_id: actor.user_id,
    actor_email: actor.email,
    action,
    resource: 'alacarte',
    resource_id: id,
    changes: parsed.data,
  });
  revalidateAlacarte();
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const actor = await requireAdmin();
  if (isMockMode()) return NextResponse.json({ ok: true, mocked: true });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  return patchOne(params.id, body, actor, 'update');
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const actor = await requireAdmin();
  if (isMockMode()) return NextResponse.json({ ok: true, mocked: true });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  return patchOne(params.id, body, actor, 'patch');
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const actor = await requireAdmin();
  if (isMockMode()) return NextResponse.json({ ok: true, mocked: true });
  const supabase = createAdminClient();
  const { error } = await supabase.from('alacarte_items').update({ visible: false }).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('audit_log').insert({
    actor_id: actor.user_id,
    actor_email: actor.email,
    action: 'delete',
    resource: 'alacarte',
    resource_id: params.id,
  });
  revalidateAlacarte();
  return NextResponse.json({ ok: true });
}
