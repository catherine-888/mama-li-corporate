import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { isMockMode } from '@/lib/mock';
import { PageHeader } from '@/components/admin-ui';
import OrdersClient from './orders-client';
import type { Order, CartItem, DeliveryDetails, OrderTotals } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
//  All orders. Read-only. Supports date-range filtering via the
//  ?from=YYYY-MM-DD&to=YYYY-MM-DD query params (and a ?range=
//  preset shortcut: 7d / 30d / 90d / all).
// ─────────────────────────────────────────────────────────────

export type AdminOrder = Order & {
  contact_email: string | null;
  contact_name: string | null;
  contact_company: string | null;
  contact_phone: string | null;
};

export type DateRange = { from: string; to: string };

function resolveRange(searchParams: { from?: string; to?: string; range?: string }): DateRange {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  if (searchParams.from && searchParams.to) {
    return { from: searchParams.from, to: searchParams.to };
  }
  const preset = searchParams.range ?? '30d';
  const fromDate = new Date(today);
  if (preset === '7d') fromDate.setDate(today.getDate() - 7);
  else if (preset === '30d') fromDate.setDate(today.getDate() - 30);
  else if (preset === '90d') fromDate.setDate(today.getDate() - 90);
  else if (preset === '12m') fromDate.setFullYear(today.getFullYear() - 1);
  else if (preset === 'all') return { from: '2000-01-01', to: todayIso };
  return { from: fromDate.toISOString().slice(0, 10), to: todayIso };
}

async function fetchOrders(range: DateRange): Promise<AdminOrder[]> {
  if (isMockMode()) {
    const days = [0, 1, 2, 5, 7, 9, 14, 21, 28, 35, 42, 49, 56, 63, 70];
    return days
      .map((d, i): AdminOrder => {
        const cart: CartItem[] = [
          { id: 'b-platter-classic', bundleId: 'b-platter-classic', name: 'Classic Siu Mei Platter', price: 185, qty: 1, subtitle: 'Family-style sharing — feeds 8–10' },
          { id: 'b-lunch-rice', bundleId: 'b-lunch-rice', name: 'Rice Box Lunch — per person', price: 14.5, qty: 12 + i, subtitle: 'Choose-your-own rice boxes' },
        ];
        const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
        const deliveryFee = 15;
        const vat = (subtotal + deliveryFee) * 0.2;
        const total = subtotal + deliveryFee + vat;
        const totals: OrderTotals = { subtotal, deliveryFee, vat, total };
        const delivery: DeliveryDetails = {
          method: 'delivery',
          date: new Date(Date.now() + (d + 2) * 86400000).toISOString().slice(0, 10),
          slot: ['11-12', '12-13', '13-14'][i % 3],
          pickupLocation: 'london-wall',
          building: 'Bishopsgate Tower',
          address: '150 Bishopsgate',
          recipient: ['Priya Shah', 'Tom Blackwell', 'Sara Khan'][i % 3],
          contactPhone: '+44 7700 900' + (100 + i),
          notes: '',
        };
        return {
          id: 'mock-order-' + i,
          account_id: null,
          postcode: ['EC2M 5TE', 'EC3R 5AQ', 'EC1A 1BB', 'EC4M 7AA'][i % 4],
          cart,
          delivery,
          totals,
          status: i === 0 ? 'pending' : 'paid',
          stripe_session_id: 'cs_demo_' + i,
          stripe_payment_intent_id: null,
          created_at: new Date(Date.now() - d * 86400000).toISOString(),
          contact_email: ['priya@aoshearman.com', 'tom@schroders.com', 'sara@linklaters.com'][i % 3],
          contact_name: ['Priya Shah', 'Tom Blackwell', 'Sara Khan'][i % 3],
          contact_company: ['A&O Shearman', 'Schroders', 'Linklaters'][i % 3],
          contact_phone: '+44 7700 900' + (100 + i),
        };
      })
      .filter((o) => o.created_at.slice(0, 10) >= range.from && o.created_at.slice(0, 10) <= range.to);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('orders')
    .select('*')
    .gte('created_at', range.from + 'T00:00:00')
    .lte('created_at', range.to + 'T23:59:59')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) {
    console.error('orders fetch failed:', error);
    return [];
  }
  return (data ?? []) as AdminOrder[];
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; id?: string; from?: string; to?: string; range?: string };
}) {
  await requireAdmin();
  const range = resolveRange(searchParams);
  const orders = await fetchOrders(range);
  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="Every order placed through the site. Click a row to see full details."
      />
      <OrdersClient
        initial={orders}
        initialFilter={searchParams.status ?? 'paid'}
        highlightId={searchParams.id}
        range={range}
      />
    </div>
  );
}
