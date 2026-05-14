import { NextResponse } from 'next/server';
import { requireCustomer } from '@/lib/customer-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { isMockMode } from '@/lib/mock';
import { mockSavedAddressesGet, mockSavedAddressesSet } from '@/lib/saved-addresses';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireCustomer();

  if (isMockMode()) {
    const next = mockSavedAddressesGet().map((a) => ({ ...a, is_default: a.id === params.id }));
    mockSavedAddressesSet(next);
    return NextResponse.json({ ok: true });
  }
  const supabase = createAdminClient();
  // Clear any existing default for this user, then set this one.
  await supabase.from('saved_addresses').update({ is_default: false }).eq('user_id', user.id);
  const { error } = await supabase
    .from('saved_addresses')
    .update({ is_default: true })
    .eq('id', params.id)
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
