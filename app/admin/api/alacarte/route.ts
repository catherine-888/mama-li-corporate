import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { revalidateAlacarte } from '@/lib/content';
import { isMockMode } from '@/lib/mock';

const Schema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  cat: z.string().min(1),
  price: z.number().nonnegative(),
  sort_order: z.number().int().default(100),
  visible: z.boolean().default(true),
});

export async function POST(req: Request) {
  const actor = await requireAdmin();
  if (isMockMode()) return NextResponse.json({ ok: true, mocked: true });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.from('alacarte_items').insert(parsed.data);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: actor.user_id,
    actor_email: actor.email,
    action: 'create',
    resource: 'alacarte',
    resource_id: parsed.data.id,
    changes: parsed.data,
  });

  revalidateAlacarte();
  return NextResponse.json({ ok: true });
}
