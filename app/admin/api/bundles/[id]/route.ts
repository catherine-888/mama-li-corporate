import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { revalidateBundles } from '@/lib/content';
import { isMockMode } from '@/lib/mock';

// ─────────────────────────────────────────────────────────────
//  /admin/api/bundles/[id]
//   PUT    — full replace (used by edit form)
//   PATCH  — partial update (used by visibility toggle)
//   DELETE — soft-delete by setting visible=false
//            (we don't truly delete so order history references
//             still resolve to a name/price/photo)
// ─────────────────────────────────────────────────────────────

const UpdateSchema = z.object({
  cat: z.enum(['platters', 'lunchboxes', 'canapes']).optional(),
  name: z.string().min(1).optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  serves: z.string().optional(),
  price: z.number().nonnegative().optional(),
  tag: z.string().nullable().optional(),
  cn: z.string().nullable().optional(),
  img: z.string().nullable().optional(),
  contains: z.array(z.string()).optional(),
  sort_order: z.number().int().optional(),
  visible: z.boolean().optional(),
});

async function update(
  id: string,
  body: unknown,
  actor: { user_id: string; email: string },
  action: 'update' | 'patch'
) {
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from('bundles').update(parsed.data).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: actor.user_id,
    actor_email: actor.email,
    action,
    resource: 'bundle',
    resource_id: id,
    changes: parsed.data,
  });

  revalidateBundles();
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const actor = await requireAdmin();
  if (isMockMode()) return NextResponse.json({ ok: true, mocked: true });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  return update(params.id, body, actor, 'update');
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const actor = await requireAdmin();
  if (isMockMode()) return NextResponse.json({ ok: true, mocked: true });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  return update(params.id, body, actor, 'patch');
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const actor = await requireAdmin();
  if (isMockMode()) return NextResponse.json({ ok: true, mocked: true });

  const supabase = createAdminClient();
  // Soft delete — keep the row so order data still resolves names.
  const { error } = await supabase.from('bundles').update({ visible: false }).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: actor.user_id,
    actor_email: actor.email,
    action: 'delete',
    resource: 'bundle',
    resource_id: params.id,
  });

  revalidateBundles();
  return NextResponse.json({ ok: true });
}
