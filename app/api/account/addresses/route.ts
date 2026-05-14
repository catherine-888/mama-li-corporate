import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCustomer } from '@/lib/customer-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { isMockMode } from '@/lib/mock';
import { mockSavedAddressesGet, mockSavedAddressesSet } from '@/lib/saved-addresses';

const Schema = z.object({
  label: z.string().default(''),
  recipient: z.string().default(''),
  building: z.string().default(''),
  address: z.string().default(''),
  postcode: z.string().default(''),
  contact_phone: z.string().default(''),
  notes: z.string().default(''),
  is_default: z.boolean().default(false),
});

export async function POST(req: Request) {
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
    const id = 'mock-' + Math.random().toString(36).slice(2, 10);
    const next = mockSavedAddressesGet();
    if (parsed.data.is_default) next.forEach((a) => (a.is_default = false));
    const created = { id, ...parsed.data };
    next.push(created);
    mockSavedAddressesSet(next);
    return NextResponse.json({ ok: true, address: created });
  }

  const supabase = createAdminClient();
  // If this one is default, clear any existing default for this user first.
  if (parsed.data.is_default) {
    await supabase.from('saved_addresses').update({ is_default: false }).eq('user_id', user.id);
  }
  const { data, error } = await supabase
    .from('saved_addresses')
    .insert({ user_id: user.id, ...parsed.data })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, address: data });
}
