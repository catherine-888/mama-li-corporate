import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { revalidateBundles } from '@/lib/content';
import { isMockMode } from '@/lib/mock';

// POST /admin/api/bundles  — create new bundle

const Schema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-]+$/, 'id must be lowercase letters/numbers/hyphens'),
  cat: z.enum(['platters', 'lunchboxes', 'canapes']),
  name: z.string().min(1),
  subtitle: z.string().default(''),
  description: z.string().default(''),
  serves: z.string().default(''),
  price: z.number().nonnegative(),
  tag: z.string().nullable().optional(),
  cn: z.string().nullable().optional(),
  img: z.string().nullable().optional(),
  contains: z.array(z.string()).default([]),
  sort_order: z.number().int().default(100),
  visible: z.boolean().default(true),
});

export async function POST(request: Request) {
  const adminUser = await requireAdmin();
  if (isMockMode()) return NextResponse.json({ ok: true, mocked: true });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('bundles').insert(parsed.data);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: adminUser.user_id,
    actor_email: adminUser.email,
    action: 'create',
    resource: 'bundle',
    resource_id: parsed.data.id,
    changes: parsed.data,
  });

  revalidateBundles();
  return NextResponse.json({ ok: true });
}
