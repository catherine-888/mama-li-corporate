import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { fetchTimeslots } from '@/lib/content';
import { isMockMode } from '@/lib/mock';
import { PageHeader } from '@/components/admin-ui';
import CalendarClient from './calendar-client';
import type { CartItem, OrderTotals, DeliveryDetails } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
//  Admin calendar — month view of upcoming deliveries with day
//  drill-down. Operational overview for the kitchen.
// ─────────────────────────────────────────────────────────────

export type CalOrder = {
  id: string;
  delivery_date: string;
  slot: string;
  method: 'delivery' | 'pickup';
  status: 'pending' | 'paid' | 'cancelled' | 'failed';
  postcode: string;
  contact_company: string | null;
  contact_name: string | null;
  total: number;
  headcount: number;
  items_summary: string;
};

async function fetchUpcomingOrders(): Promise<CalOrder[]> {
  if (isMockMode()) {
    // Generate two months of mock orders so the calendar feels populated.
    const slots = ['11-12', '12-13', '13-14', '14-15', '15-16'];
    const companies = [
      'Allen & Overy LLP', 'Goldman Sachs', 'McKinsey & Company', 'LSE Group',
      'Morgan Stanley', 'Clifford Chance', 'BCG', 'Freshfields',
      'PwC UK', 'EY London', 'Monzo Bank', 'Wise plc',
    ];
    const items = [
      'Classic Siu Mei Platter',
      'Rice Box Lunch ×14',
      'Hong Kong Feast + extras',
      'Reception Canapés ×40',
      'Garden Platter ×2',
    ];
    const out: CalOrder[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Patterns: real life isn't even
    const patterns = [
      [], ['12-13'], ['11-12', '13-14'], ['12-13', '14-15'], ['12-13', '13-14', '15-16'],
      ['15-16'], [], ['11-12'], ['13-14'], ['12-13'], [], [],
    ];
    let idx = 0;
    for (let d = -14; d <= 60; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      // Weekdays only
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      const pat = patterns[Math.abs(d) % patterns.length];
      for (const slot of pat) {
        const co = companies[idx % companies.length];
        const it = items[idx % items.length];
        const total = 200 + ((idx * 47) % 600);
        const headcount = 6 + ((idx * 3) % 32);
        out.push({
          id: 'mock-' + d + '-' + slot,
          delivery_date: date.toISOString().slice(0, 10),
          slot,
          method: idx % 7 === 0 ? 'pickup' : 'delivery',
          status: d < 0 ? 'paid' : idx % 13 === 0 ? 'pending' : 'paid',
          postcode: ['EC2M 5TE', 'EC3R 5AQ', 'EC1A 1BB', 'EC4M 7AA'][idx % 4],
          contact_company: co,
          contact_name: ['Priya Shah', 'Marcus Webb', 'Sara Lindqvist'][idx % 3],
          total,
          headcount,
          items_summary: it,
        });
        idx++;
      }
    }
    return out;
  }

  const admin = createAdminClient();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 14);
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 90);

  const { data, error } = await admin
    .from('orders')
    .select('id,delivery,status,postcode,contact_company,contact_name,totals,cart')
    .gte('delivery->>date', fromDate.toISOString().slice(0, 10))
    .lte('delivery->>date', toDate.toISOString().slice(0, 10))
    .order('delivery->>date');
  if (error) {
    console.error('calendar fetch failed:', error);
    return [];
  }
  return (data ?? []).map((o: {
    id: string; delivery: DeliveryDetails; status: CalOrder['status'];
    postcode: string; contact_company: string | null; contact_name: string | null;
    totals: OrderTotals; cart: CartItem[];
  }) => {
    const headcount = (o.cart ?? []).reduce((s, c) => s + c.qty, 0);
    const summary =
      (o.cart ?? [])
        .slice(0, 2)
        .map((c) => `${c.name}${c.qty > 1 ? ` ×${c.qty}` : ''}`)
        .join(', ') + ((o.cart?.length ?? 0) > 2 ? ' + more' : '');
    return {
      id: o.id,
      delivery_date: o.delivery.date,
      slot: o.delivery.slot,
      method: o.delivery.method as 'delivery' | 'pickup',
      status: o.status,
      postcode: o.postcode,
      contact_company: o.contact_company,
      contact_name: o.contact_name,
      total: Number(o.totals?.total ?? 0),
      headcount,
      items_summary: summary,
    };
  });
}

export default async function CalendarPage() {
  await requireAdmin();
  const [orders, timeslots] = await Promise.all([fetchUpcomingOrders(), fetchTimeslots()]);
  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Every upcoming delivery, day by day. Click any day to see slot-by-slot detail."
      />
      <CalendarClient orders={orders} timeslots={timeslots} />
    </div>
  );
}
