import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { isMockMode } from '@/lib/mock';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (isMockMode()) return NextResponse.json({ ok: true, mocked: true });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('account_applications')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('status', 'pending');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: admin.user_id,
    actor_email: admin.email,
    action: 'reject',
    resource: 'application',
    resource_id: params.id,
  });

  return NextResponse.json({ ok: true });
}
