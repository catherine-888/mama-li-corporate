import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { isMockMode } from '@/lib/mock';
import { PageHeader, Card, Btn } from '@/components/admin-ui';
import { moneyExact } from '@/lib/order';
import type { CartItem, OrderTotals } from '@/lib/types';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────
//  Admin insights — top customers, top bundles, both for a
//  configurable date range.
// ─────────────────────────────────────────────────────────────

type Row = { key: string; label: string; sub?: string; revenue: number; orders: number; items?: number };

const PRESETS = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: '12m', label: 'Last 12 months' },
  { id: 'all', label: 'All time' },
];

function resolveRange(searchParams: { from?: string; to?: string; range?: string }) {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  if (searchParams.from && searchParams.to) {
    return { from: searchParams.from, to: searchParams.to };
  }
  const preset = searchParams.range ?? '90d';
  const fromDate = new Date(today);
  if (preset === '7d') fromDate.setDate(today.getDate() - 7);
  else if (preset === '30d') fromDate.setDate(today.getDate() - 30);
  else if (preset === '90d') fromDate.setDate(today.getDate() - 90);
  else if (preset === '12m') fromDate.setFullYear(today.getFullYear() - 1);
  else if (preset === 'all') return { from: '2000-01-01', to: todayIso };
  return { from: fromDate.toISOString().slice(0, 10), to: todayIso };
}

type RawOrder = {
  contact_company: string | null;
  contact_email: string | null;
  cart: CartItem[];
  totals: OrderTotals;
};

async function fetchOrdersInRange(range: { from: string; to: string }): Promise<RawOrder[]> {
  if (isMockMode()) {
    // Stable, slightly varied mock data for the preview.
    const companies = ['A&O Shearman', 'Schroders', 'Linklaters', 'KPMG', 'Slaughter and May'];
    const bundles = [
      { id: 'b-platter-classic', name: 'Classic Siu Mei Platter', price: 185 },
      { id: 'b-platter-vegetarian', name: 'Garden Platter', price: 145 },
      { id: 'b-platter-feast', name: 'Hong Kong Feast', price: 320 },
      { id: 'b-lunch-rice', name: 'Rice Box Lunch — per person', price: 14.5 },
      { id: 'b-canape-reception', name: 'Reception Canapés (per person)', price: 18 },
    ];
    const orders: RawOrder[] = [];
    for (let i = 0; i < 35; i++) {
      const items: CartItem[] = [];
      const n = 1 + (i % 3);
      for (let j = 0; j < n; j++) {
        const b = bundles[(i + j) % bundles.length];
        const qty = b.id.startsWith('b-lunch') || b.id.startsWith('b-canape') ? 8 + (i % 14) : 1;
        items.push({ id: b.id, bundleId: b.id, name: b.name, price: b.price, qty, subtitle: '' });
      }
      const subtotal = items.reduce((s, c) => s + c.price * c.qty, 0);
      const deliveryFee = 15;
      const vat = (subtotal + deliveryFee) * 0.2;
      const total = subtotal + deliveryFee + vat;
      orders.push({
        contact_company: companies[i % companies.length],
        contact_email: companies[i % companies.length].toLowerCase().replace(/[^a-z]/g, '') + '@example.com',
        cart: items,
        totals: { subtotal, deliveryFee, vat, total },
      });
    }
    return orders;
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('orders')
    .select('contact_company,contact_email,cart,totals')
    .gte('created_at', range.from + 'T00:00:00')
    .lte('created_at', range.to + 'T23:59:59')
    .eq('status', 'paid')
    .limit(2000);
  if (error) {
    console.error('insights fetch failed:', error);
    return [];
  }
  return (data ?? []) as RawOrder[];
}

function aggregate(orders: RawOrder[]): { customers: Row[]; bundles: Row[] } {
  const byCustomer = new Map<string, Row>();
  const byBundle = new Map<string, Row>();
  for (const o of orders) {
    const key = (o.contact_company || o.contact_email || 'Unknown').toLowerCase();
    const existing = byCustomer.get(key) ?? {
      key,
      label: o.contact_company || o.contact_email || 'Unknown',
      sub: o.contact_email ?? undefined,
      revenue: 0,
      orders: 0,
    };
    existing.revenue += Number(o.totals?.total ?? 0);
    existing.orders += 1;
    byCustomer.set(key, existing);

    for (const c of o.cart ?? []) {
      const b = byBundle.get(c.id) ?? {
        key: c.id,
        label: c.name,
        revenue: 0,
        orders: 0,
        items: 0,
      };
      b.revenue += c.price * c.qty;
      b.items! += c.qty;
      b.orders += 1;
      byBundle.set(c.id, b);
    }
  }
  return {
    customers: [...byCustomer.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 20),
    bundles: [...byBundle.values()].sort((a, b) => (b.items ?? 0) - (a.items ?? 0)).slice(0, 20),
  };
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; range?: string };
}) {
  await requireAdmin();
  const range = resolveRange(searchParams);
  const orders = await fetchOrdersInRange(range);
  const { customers, bundles } = aggregate(orders);
  const totalRevenue = orders.reduce((s, o) => s + Number(o.totals?.total ?? 0), 0);
  const orderCount = orders.length;
  const aov = orderCount === 0 ? 0 : totalRevenue / orderCount;

  return (
    <div>
      <PageHeader
        title="Insights"
        subtitle="Top customers, top bundles, and headline numbers — paid orders only."
      />

      {/* Range presets */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, flexWrap: 'wrap' }}>
        {PRESETS.map((p) => (
          <Link
            key={p.id}
            href={`/admin/insights?range=${p.id}`}
            style={{
              background: '#ffffff',
              color: '#1c1813',
              border: '1px solid #d9cfb6',
              padding: '6px 12px',
              borderRadius: 4,
              fontSize: 12,
              textDecoration: 'none',
              fontFamily: 'inherit',
            }}
          >
            {p.label}
          </Link>
        ))}
        <span style={{ marginLeft: 8, fontSize: 12, color: '#5a524a' }}>
          showing {range.from} → {range.to}
        </span>
      </div>

      {/* Headline numbers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <Card style={{ background: '#eaf3ee', borderColor: '#b9d6c4' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#1f4a38' }}>
            Revenue
          </div>
          <div style={{ fontFamily: 'Newsreader, serif', fontSize: 28, color: '#1f4a38', lineHeight: 1, marginTop: 4 }}>
            {moneyExact(totalRevenue)}
          </div>
        </Card>
        <Card>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5a524a' }}>
            Paid orders
          </div>
          <div style={{ fontFamily: 'Newsreader, serif', fontSize: 28, lineHeight: 1, marginTop: 4 }}>
            {orderCount}
          </div>
        </Card>
        <Card>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5a524a' }}>
            Average order value
          </div>
          <div style={{ fontFamily: 'Newsreader, serif', fontSize: 28, lineHeight: 1, marginTop: 4 }}>
            {moneyExact(aov)}
          </div>
        </Card>
        <Card>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5a524a' }}>
            Repeat customers
          </div>
          <div style={{ fontFamily: 'Newsreader, serif', fontSize: 28, lineHeight: 1, marginTop: 4 }}>
            {customers.filter((c) => c.orders >= 2).length}
          </div>
          <div style={{ fontSize: 12, color: '#5a524a', marginTop: 4 }}>≥ 2 orders in range</div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 18 }}>
        <RankList title="Top customers" rows={customers} valueLabel="revenue" />
        <RankList title="Top bundles" rows={bundles} valueLabel="items sold" valueKey="items" />
      </div>
    </div>
  );
}

function RankList({
  title,
  rows,
  valueLabel,
  valueKey = 'revenue',
}: {
  title: string;
  rows: Row[];
  valueLabel: string;
  valueKey?: 'revenue' | 'items';
}) {
  const max = Math.max(...rows.map((r) => (valueKey === 'items' ? r.items ?? 0 : r.revenue)), 1);
  return (
    <Card noPad>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          padding: '14px 18px',
          borderBottom: '1px solid #e6e1d4',
        }}
      >
        <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: 17, fontWeight: 500, margin: 0 }}>{title}</h2>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#5a524a',
          }}
        >
          By {valueLabel}
        </span>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: '#5a524a' }}>
          No data in this range.
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {rows.map((r, i) => {
            const val = valueKey === 'items' ? r.items ?? 0 : r.revenue;
            const pct = Math.min(100, (val / max) * 100);
            return (
              <li
                key={r.key}
                style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: '20px minmax(0, 1fr) auto auto',
                  gap: 10,
                  padding: '10px 18px',
                  alignItems: 'center',
                  fontSize: 13,
                  borderBottom: i === rows.length - 1 ? 'none' : '1px solid #f1efe8',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: `${pct}%`,
                    background: 'rgba(31,74,56,0.06)',
                    pointerEvents: 'none',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10,
                    color: '#5a524a',
                    zIndex: 1,
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ minWidth: 0, zIndex: 1 }}>
                  <div
                    style={{
                      fontFamily: 'Newsreader, serif',
                      fontSize: 15,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {r.label}
                  </div>
                  {r.sub && <div style={{ fontSize: 11, color: '#5a524a' }}>{r.sub}</div>}
                </div>
                <span style={{ fontSize: 11, color: '#5a524a', zIndex: 1 }}>
                  {r.orders} order{r.orders === 1 ? '' : 's'}
                </span>
                <span style={{ fontFamily: 'Newsreader, serif', fontSize: 15, zIndex: 1 }}>
                  {valueKey === 'items' ? r.items : moneyExact(r.revenue)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
