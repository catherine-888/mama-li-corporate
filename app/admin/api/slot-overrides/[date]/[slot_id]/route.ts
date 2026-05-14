import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { revalidateAvailability } from '@/lib/content';
import { isMockMode } from '@/lib/mock';

export async function DELETE(
  _req: Request,
  { params }: { params: { date: string; slot_id: string } }
) {
  const actor = await requireAdmin();
  if (isMockMode()) return NextResponse.json({ ok: true, mocked: true });
  const sb = createAdminClient();
  const { error } = await sb
    .from('slot_capacity_overrides')
    .delete()
    .eq('date', params.date)
    .eq('slot_id', params.slot_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await sb.from('audit_log').insert({
    actor_id: actor.user_id, actor_email: actor.email,
    action: 'remove_override', resource: 'slot_override',
    resource_id: `${params.date}/${params.slot_id}`,
  });
  revalidateAvailability();
  return NextResponse.json({ ok: true });
}
