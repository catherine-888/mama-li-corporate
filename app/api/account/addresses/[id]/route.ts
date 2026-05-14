import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCustomer } from '@/lib/customer-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { isMockMode } from '@/lib/mock';
import { mockSavedAddressesGet, mockSavedAddressesSet } from '@/lib/saved-addresses';

const Schema = z.object({
  label: z.string().optional(),
  recipient: z.string().optional(),
  building: z.string().optional(),
  address: z.string().optional(),
  postcode: z.string().optional(),
  contact_phone: z.string().optional(),
  notes: z.string().optional(),
  is_default: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await requireCustomer();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  if (isMockMode()) {
    const next = mockSavedAddressesGet();
    if (parsed.data.is_default) next.forEach((a) => (a.is_default = false));
    const updated = next.find((a) => a.id === params.id);
    if (!updated) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    Object.assign(updated, parsed.data);
    mockSavedAddressesSet(next);
    return NextResponse.json({ ok: true, address: updated });
  }

  const supabase = createAdminClient();
  if (parsed.data.is_default) {
    await supabase.from('saved_addresses').update({ is_default: false }).eq('user_id', user.id);
  }
  const { data, error } = await supabase
    .from('saved_addresses')
    .update(parsed.data)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, address: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireCustomer();
  if (isMockMode()) {
    mockSavedAddressesSet(mockSavedAddressesGet().filter((a) => a.id !== params.id));
    return NextResponse.json({ ok: true });
  }
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('saved_addresses')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
