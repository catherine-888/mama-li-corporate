import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase-server';
import { resend, FROM_ADDRESS, OPS_INBOX } from '@/lib/email';
import { renderCustomerEmail, renderOpsEmail } from '@/emails/templates';
import type { Order } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
//  POST /api/stripe-webhook
//
//  Stripe POSTs here on every event we're subscribed to. The
//  one we care about is `checkout.session.completed` — that's
//  the moment payment succeeded and we should:
//    1. Flip the order row from 'pending' → 'paid'.
//    2. Email the customer their confirmation.
//    3. Email the Mama Li ops inbox (orders@mamali.co.uk) with
//       the full kitchen-ready breakdown.
//
//  Verification uses STRIPE_WEBHOOK_SECRET; if it's missing or
//  the signature is wrong we respond 400 and Stripe will retry.
//
//  We need the RAW request body to verify the signature — that's
//  why we use `request.text()` rather than `request.json()`.
// ─────────────────────────────────────────────────────────────

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.text();
  const sig = headers().get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ error: 'Missing signature/secret.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('Webhook signature verification failed:', msg);
    return NextResponse.json({ error: `Bad signature: ${msg}` }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.expired') {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.order_id;
  if (!orderId) {
    console.warn('Webhook event has no order_id metadata; ignoring.');
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();

  if (event.type === 'checkout.session.expired') {
    await admin.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
    return NextResponse.json({ ok: true });
  }

  // session.completed
  const { data: order, error: fetchError } = await admin
    .from('orders')
    .update({
      status: 'paid',
      stripe_payment_intent_id:
        typeof session.payment_intent === 'string' ? session.payment_intent : null,
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (fetchError || !order) {
    console.error('Failed to mark order paid:', fetchError);
    return NextResponse.json({ error: 'DB update failed.' }, { status: 500 });
  }

  // Fire confirmation emails. We don't fail the webhook if email
  // fails — Stripe would retry forever and the order is already
  // paid. Log it instead.
  const orderTyped = order as unknown as Order & {
    contact_email?: string;
    contact_name?: string;
    contact_company?: string;
  };
  const customerEmail = orderTyped.contact_email ?? session.customer_email ?? '';
  const customerName = orderTyped.contact_name ?? '';

  try {
    if (customerEmail) {
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: customerEmail,
        subject: `Mama Li · Order confirmed (ML-${order.id.slice(0, 6).toUpperCase()})`,
        html: renderCustomerEmail(orderTyped, customerName),
      });
    }
  } catch (err) {
    console.warn('Customer confirmation email failed:', err);
  }

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: OPS_INBOX,
      subject: `[Mama Li] New paid order — ML-${order.id.slice(0, 6).toUpperCase()} · £${order.totals.total.toFixed(2)}`,
      html: renderOpsEmail(orderTyped),
    });
  } catch (err) {
    console.warn('Ops notification email failed:', err);
  }

  return NextResponse.json({ ok: true });
}
