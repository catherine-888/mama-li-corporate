import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { revalidateAvailability } from '@/lib/content';
import { isMockMode } from '@/lib/mock';

export async function DELETE(_req: Request, { params }: { params: { date: string } }) {
  const actor = await requireAdmin();
  if (isMockMode()) return NextResponse.json({ ok: true, mocked: true });
  const sb = createAdminClient();
  const { error } = await sb.from('blocked_dates').delete().eq('date', params.date);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await sb.from('audit_log').insert({
    actor_id: actor.user_id, actor_email: actor.email,
    action: 'unblock_date', resource: 'blocked_date', resource_id: params.date,
  });
  revalidateAvailability();
  return NextResponse.json({ ok: true });
}
