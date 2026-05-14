import { NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe } from '@/lib/stripe';
import { createClient, createAdminClient } from '@/lib/supabase-server';
import { calcTotals, postcodeAllowed } from '@/lib/order';
import { POSTCODE_AREAS, VAT_RATE } from '@/lib/menu';
import { isMockMode } from '@/lib/mock';

// ─────────────────────────────────────────────────────────────
//  POST /api/checkout/create-session
//
//  1. Validate payload (zod).
//  2. Re-compute totals on the server — never trust the client.
//  3. Insert a pending order row in Supabase.
//  4. Create a Stripe Checkout Session with three line items:
//     subtotal, delivery (if applicable), and VAT.
//  5. Persist the session id on the order row.
//  6. Return the Stripe URL — the browser redirects to it.
//
//  After payment, /api/stripe-webhook flips status='paid'
//  and sends the customer + ops confirmation emails.
// ─────────────────────────────────────────────────────────────

const CartItemSchema = z.object({
  id: z.string(),
  bundleId: z.string(),
  name: z.string(),
  subtitle: z.string().optional(),
  price: z.number().positive(),
  qty: z.number().int().positive(),
  modifiers: z.record(z.union([z.string(), z.array(z.string())])).optional(),
});

const DeliverySchema = z.object({
  method: z.enum(['delivery', 'pickup']),
  date: z.string(),
  slot: z.string(),
  pickupLocation: z.string(),
  building: z.string().optional().default(''),
  address: z.string().optional().default(''),
  recipient: z.string().optional().default(''),
  contactPhone: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

const PayloadSchema = z.object({
  cart: z.array(CartItemSchema).min(1),
  delivery: DeliverySchema,
  postcode: z.string(),
  account: z
    .object({
      email: z.string().email().optional(),
      name: z.string().optional(),
      company: z.string().optional(),
      phone: z.string().optional(),
    })
    .optional(),
});

const MIN_SPEND = 250;

export async function POST(request: Request) {
  // Mock mode: the client handles everything locally, but if this
  // route is hit directly, return a benign fake response.
  if (isMockMode()) {
    return NextResponse.json(
      { error: 'Mock mode: payment is handled client-side.' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid order payload.' }, { status: 400 });
  }
  const { cart, delivery, postcode, account } = parsed.data;

  if (!postcodeAllowed(postcode, POSTCODE_AREAS)) {
    return NextResponse.json({ error: "We don't deliver to that postcode." }, { status: 400 });
  }

  const totals = calcTotals(cart, delivery.method);
  if (totals.subtotal < MIN_SPEND) {
    return NextResponse.json({ error: `Minimum order is £${MIN_SPEND}.` }, { status: 400 });
  }

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const customerEmail = user?.email ?? account?.email;
  if (!customerEmail) {
    return NextResponse.json({ error: 'Email required.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: orderRow, error: insertError } = await admin
    .from('orders')
    .insert({
      account_id: user?.id ?? null,
      postcode,
      cart,
      delivery,
      totals,
      status: 'pending',
      contact_email: customerEmail,
      contact_name: account?.name ?? null,
      contact_company: account?.company ?? null,
      contact_phone: account?.phone ?? null,
    })
    .select('id')
    .single();

  if (insertError || !orderRow) {
    console.error('Order insert failed:', insertError);
    return NextResponse.json({ error: 'Could not create order.' }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const lineItems = [
    {
      price_data: {
        currency: 'gbp' as const,
        unit_amount: Math.round(totals.subtotal * 100),
        product_data: {
          name: 'Mama Li Corporate order',
          description: `${cart.reduce((s, i) => s + i.qty, 0)} item(s) · ${
            delivery.method === 'pickup' ? 'pickup' : `delivery to ${postcode}`
          } on ${delivery.date}`,
        },
      },
      quantity: 1,
    },
    ...(delivery.method === 'delivery'
      ? [
          {
            price_data: {
              currency: 'gbp' as const,
              unit_amount: Math.round(totals.deliveryFee * 100),
              product_data: { name: 'Delivery — EC zone' },
            },
            quantity: 1,
          },
        ]
      : []),
    {
      price_data: {
        currency: 'gbp' as const,
        unit_amount: Math.round(totals.vat * 100),
        product_data: { name: `VAT (${Math.round(VAT_RATE * 100)}%)` },
      },
      quantity: 1,
    },
  ];

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customerEmail,
      success_url: `${siteUrl}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout`,
      line_items: lineItems,
      metadata: {
        order_id: orderRow.id,
        postcode,
        delivery_method: delivery.method,
        delivery_date: delivery.date,
        delivery_slot: delivery.slot,
        subtotal: totals.subtotal.toFixed(2),
        vat: totals.vat.toFixed(2),
        delivery_fee: totals.deliveryFee.toFixed(2),
        total: totals.total.toFixed(2),
      },
    });
  } catch (err) {
    console.error('Stripe session creation failed:', err);
    await admin.from('orders').update({ status: 'failed' }).eq('id', orderRow.id);
    return NextResponse.json({ error: 'Could not start payment.' }, { status: 500 });
  }

  await admin.from('orders').update({ stripe_session_id: session.id }).eq('id', orderRow.id);

  return NextResponse.json({ url: session.url, sessionId: session.id });
}
