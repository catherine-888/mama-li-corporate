import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

// ─────────────────────────────────────────────────────────────
//  GET /api/checkout/session/[id]
//  The confirmation page polls this with the Stripe session id
//  until the webhook flips the order to status='paid'. Then it
//  returns the full order so the page can render confirmation
//  details.
// ─────────────────────────────────────────────────────────────

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const sessionId = params.id;
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session id.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('orders')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('Order lookup failed:', error);
    return NextResponse.json({ error: 'Lookup failed.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  return NextResponse.json(data);
}
