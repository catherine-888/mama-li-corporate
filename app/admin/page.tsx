import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { isMockMode } from '@/lib/mock';
import { PageHeader, Card, StatTile, Btn, Badge } from '@/components/admin-ui';
import { moneyExact } from '@/lib/order';
import type { OrderTotals } from '@/lib/types';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────
//  Admin overview — dashboard with key counts and quick links.
// ─────────────────────────────────────────────────────────────

type Stats = {
  pendingApplications: number;
  ordersToday: number;
  paidOrdersWeek: number;
  paidRevenueWeek: number;
  paidOrdersPrevWeek: number;
  paidRevenuePrevWeek: number;
  deliveriesToday: { id: string; postcode: string; total: number; slot: string }[];
  upcomingDeliveriesCount: number;
  weeklyOrders: { weekStart: string; orders: number; revenue: number }[];
  topItems: { id: string; name: string; qty: number; revenue: number }[];
  repeatRate: number;
};

function startOfWeek(d: Date): Date {
  // ISO week starts Monday
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // 0=Mon..6=Sun
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

function lastNWeeks(n: number): Date[] {
  const out: Date[] = [];
  const thisWeek = startOfWeek(new Date());
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(thisWeek);
    d.setDate(d.getDate() - i * 7);
    out.push(d);
  }
  return out;
}

async function fetchStats(): Promise<Stats> {
  if (isMockMode()) {
    const weeks = lastNWeeks(12);
    const weeklyOrders = weeks.map((w, i) => ({
      weekStart: w.toISOString().slice(0, 10),
      orders: 6 + Math.round(Math.sin(i * 0.7) * 3 + i * 0.5),
      revenue: 2100 + Math.round(Math.sin(i * 0.7) * 800 + i * 120),
    }));
    return {
      pendingApplications: 3,
      ordersToday: 7,
      paidOrdersWeek: 24,
      paidRevenueWeek: 8240,
      paidOrdersPrevWeek: 19,
      paidRevenuePrevWeek: 6420,
      deliveriesToday: [
        { id: 'demo-1', postcode: 'EC2M 5TE', total: 412.5, slot: '12-13' },
        { id: 'demo-2', postcode: 'EC3R 5AQ', total: 268.0, slot: '13-14' },
      ],
      upcomingDeliveriesCount: 5,
      weeklyOrders,
      topItems: [
       { id: 'b-platter-feast', name: 'Hong Kong Feast', qty: 62, revenue: 19840 },
        { id: 'b-platter-classic', name: 'Classic Siu Mei Platter', qty: 98, revenue: 18130 },
        { id: 'b-lunch-rice', name: 'Rice Box Lunch', qty: 412, revenue: 5974 },
        { id: 'b-platter-veg', name: 'Garden Platter', qty: 37, revenue: 5365 },
        { id: 'b-canape-classic', name: 'Reception Canapés', qty: 240, revenue: 4320 },
      ],
      repeatRate: 64,
    };
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * 86400000).toISOString();
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();

  const [appsRes, ordersTodayRes, paidWeekRes, todayDelRes, upcomingRes, recent12wRes, prevWeekRes, recent90dRes] =
    await Promise.all([
      admin.from('account_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      admin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today + 'T00:00:00')
        .neq('status', 'failed'),
      admin
        .from('orders')
        .select('totals')
        .gte('created_at', weekAgo)
        .eq('status', 'paid'),
      admin
        .from('orders')
        .select('id,postcode,totals,delivery')
        .eq('status', 'paid')
        .gte('delivery->>date', today)
        .lte('delivery->>date', today)
        .order('delivery->>slot'),
      admin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'paid')
        .gte('delivery->>date', today),
      admin
        .from('orders')
        .select('created_at,totals')
        .gte('created_at', twelveWeeksAgo)
        .eq('status', 'paid'),
      admin
        .from('orders')
        .select('totals')
        .gte('created_at', twoWeeksAgo)
        .lt('created_at', weekAgo)
        .eq('status', 'paid'),
      admin
        .from('orders')
        .select('cart,contact_company,contact_email')
        .gte('created_at', ninetyDaysAgo)
        .eq('status', 'paid'),
    ]);

  const paidRevenueWeek =
    paidWeekRes.data?.reduce((sum, o: any) => sum + Number(o.totals?.total ?? 0), 0) ?? 0;
  const paidRevenuePrevWeek =
    prevWeekRes.data?.reduce((sum, o: any) => sum + Number(o.totals?.total ?? 0), 0) ?? 0;

  // Top items by revenue, last 90 days
  const itemTally = new Map<string, { name: string; qty: number; revenue: number }>();
  const companySeen = new Set<string>();
  const companyOrderCount = new Map<string, number>();
  for (const o of (recent90dRes.data ?? []) as {
    cart: { id: string; name: string; price: number; qty: number }[];
    contact_company: string | null;
    contact_email: string | null;
  }[]) {
    for (const c of o.cart ?? []) {
      const e = itemTally.get(c.id) ?? { name: c.name, qty: 0, revenue: 0 };
      e.qty += c.qty;
      e.revenue += c.qty * c.price;
      itemTally.set(c.id, e);
    }
    const k = (o.contact_company ?? o.contact_email ?? 'unknown').toLowerCase();
    companySeen.add(k);
    companyOrderCount.set(k, (companyOrderCount.get(k) ?? 0) + 1);
  }
  const topItems = Array.from(itemTally.entries())
    .map(([id, e]) => ({ id, ...e }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const repeaters = Array.from(companyOrderCount.values()).filter((n) => n >= 2).length;
  const repeatRate = companySeen.size === 0 ? 0 : Math.round((repeaters / companySeen.size) * 100);

  // Bucket recent orders by ISO week
  const weeks = lastNWeeks(12);
  const buckets = new Map<string, { orders: number; revenue: number }>();
  for (const w of weeks) {
    buckets.set(w.toISOString().slice(0, 10), { orders: 0, revenue: 0 });
  }
  for (const o of (recent12wRes.data ?? []) as { created_at: string; totals: OrderTotals }[]) {
    const wkKey = startOfWeek(new Date(o.created_at)).toISOString().slice(0, 10);
    const b = buckets.get(wkKey);
    if (b) {
      b.orders += 1;
      b.revenue += Number(o.totals?.total ?? 0);
    }
  }
  const weeklyOrders = weeks.map((w) => {
    const key = w.toISOString().slice(0, 10);
    const b = buckets.get(key)!;
    return { weekStart: key, orders: b.orders, revenue: b.revenue };
  });

  return {
    pendingApplications: appsRes.count ?? 0,
    ordersToday: ordersTodayRes.count ?? 0,
    paidOrdersWeek: paidWeekRes.data?.length ?? 0,
    paidRevenueWeek,
    paidOrdersPrevWeek: prevWeekRes.data?.length ?? 0,
    paidRevenuePrevWeek,
    deliveriesToday:
      todayDelRes.data?.map((d: any) => ({
        id: d.id,
        postcode: d.postcode,
        total: Number(d.totals?.total ?? 0),
        slot: d.delivery?.slot ?? '',
      })) ?? [],
    upcomingDeliveriesCount: upcomingRes.count ?? 0,
    weeklyOrders,
    topItems,
    repeatRate,
  };
}

export default async function AdminDashboardPage() {
  await requireAdmin();
  const stats = await fetchStats();

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Today's orders, deliveries and outstanding actions."
        actions={
          <>
            <Btn href="/admin/menu" variant="secondary">
              Edit menu
            </Btn>
            <Btn href="/admin/settings" variant="primary">
              Site settings
            </Btn>
          </>
        }
      />

      {/* Top stat row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 28,
        }}
      >
        <StatTile
          label="Applications"
          value={stats.pendingApplications}
          hint={stats.pendingApplications === 0 ? 'All caught up' : 'Awaiting review'}
          tone={stats.pendingApplications > 0 ? 'attention' : 'good'}
          href="/admin/applications"
        />
        <StatTile
          label="Orders today"
          value={stats.ordersToday}
          hint="Created (any status)"
          href="/admin/orders"
        />
        <StatTile
          label="Paid this week"
          value={stats.paidOrdersWeek}
          hint={moneyExact(stats.paidRevenueWeek)}
          tone="good"
          href="/admin/orders?status=paid"
        />
        <StatTile
          label="Upcoming deliveries"
          value={stats.upcomingDeliveriesCount}
          hint="Paid, scheduled"
          href="/admin/orders?status=paid"
        />
      </div>

      {/* Weekly orders chart */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: 19, margin: 0 }}>
            Orders per week — last 12 weeks
          </h2>
          <Link
            href="/admin/insights"
            style={{ fontSize: 12, color: '#5a524a', textDecoration: 'underline' }}
          >
            See insights →
          </Link>
        </div>
        <WeeklyChart data={stats.weeklyOrders} />
      </Card>

      {/* Top items / Repeat rate / Week-over-week */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr)',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <Card>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
            }}
          >
            <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: 17, margin: 0 }}>
              Top items (90 days)
            </h2>
            <span style={{ fontSize: 10, color: '#5a524a', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              By revenue
            </span>
          </div>
          {stats.topItems.length === 0 ? (
            <p style={{ fontSize: 13, color: '#5a524a', margin: 0 }}>No paid orders in the last 90 days.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {(() => {
                const maxRevenue = Math.max(...stats.topItems.map((x) => x.revenue), 1);
                return stats.topItems.map((it, i) => {
                  const pct = Math.min(100, (it.revenue / maxRevenue) * 100);
                return (
                  <li
                    key={it.id}
                    style={{
                      position: 'relative',
                      display: 'grid',
                      gridTemplateColumns: '18px minmax(0, 1fr) auto auto',
                      gap: 10,
                      padding: '8px 0',
                      alignItems: 'center',
                      fontSize: 13,
                      borderBottom: i === stats.topItems.length - 1 ? 'none' : '1px solid #f1efe8',
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
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#5a524a', zIndex: 1 }}>
                      {i + 1}
                    </span>
                    <span style={{ fontFamily: 'Newsreader, serif', fontSize: 14, zIndex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {it.name}
                    </span>
                    <span style={{ fontSize: 11, color: '#5a524a', zIndex: 1 }}>{it.qty}</span>
                    <span style={{ fontFamily: 'Newsreader, serif', fontSize: 14, zIndex: 1 }}>
                      {moneyExact(it.revenue)}
                    </span>
                  </li>
                );
                });
              })()}
            </ul>
          )}
        </Card>

        <Card>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#5a524a',
            }}
          >
            Repeat customers
          </div>
          <div style={{ fontFamily: 'Newsreader, serif', fontSize: 38, lineHeight: 1, marginTop: 6 }}>
            {stats.repeatRate}%
          </div>
          <div style={{ fontSize: 12, color: '#5a524a', marginTop: 8, lineHeight: 1.5 }}>
            of customers placing 2+ orders in the last 90 days
          </div>
        </Card>

        <Card>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#5a524a',
            }}
          >
            Week-on-week
          </div>
          {(() => {
            const delta = stats.paidRevenuePrevWeek === 0 ? 0 : ((stats.paidRevenueWeek - stats.paidRevenuePrevWeek) / stats.paidRevenuePrevWeek) * 100;
            const up = delta >= 0;
            return (
              <>
                <div
                  style={{
                    fontFamily: 'Newsreader, serif',
                    fontSize: 32,
                    lineHeight: 1,
                    marginTop: 6,
                    color: up ? '#1f4a38' : '#b43e2e',
                  }}
                >
                  {up ? '↑' : '↓'} {Math.abs(Math.round(delta))}%
                </div>
                <div style={{ fontSize: 12, color: '#5a524a', marginTop: 8, lineHeight: 1.5 }}>
                  {moneyExact(stats.paidRevenueWeek)} this week<br />
                  vs {moneyExact(stats.paidRevenuePrevWeek)} prior
                </div>
              </>
            );
          })()}
        </Card>
      </div>

      {/* Two-column body */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
          gap: 20,
        }}
      >
        <Card>
          <h2
            style={{
              fontFamily: 'Newsreader, serif',
              fontWeight: 500,
              fontSize: 19,
              margin: '0 0 12px',
              letterSpacing: '-0.01em',
            }}
          >
            Today&apos;s deliveries
          </h2>
          {stats.deliveriesToday.length === 0 ? (
            <p style={{ color: '#5a524a', fontSize: 13, margin: 0 }}>
              No deliveries scheduled for today.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {stats.deliveriesToday.map((d) => (
                <li
                  key={d.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto auto',
                    gap: 16,
                    padding: '10px 0',
                    borderBottom: '1px dashed #e6e1d4',
                    alignItems: 'center',
                    fontSize: 13,
                  }}
                >
                  <Badge tone="info">{d.slot}</Badge>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                    {d.postcode}
                  </span>
                  <span style={{ fontFamily: 'Newsreader, serif', fontSize: 15 }}>
                    {moneyExact(d.total)}
                  </span>
                  <Link
                    href={`/admin/orders?id=${d.id}`}
                    style={{ fontSize: 12, color: '#1c1813', textDecoration: 'underline' }}
                  >
                    Open →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2
            style={{
              fontFamily: 'Newsreader, serif',
              fontWeight: 500,
              fontSize: 19,
              margin: '0 0 12px',
              letterSpacing: '-0.01em',
            }}
          >
            Quick actions
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { href: '/admin/menu', t: 'Add or edit a menu item', d: 'Bundles, à la carte, prices, photos' },
              { href: '/admin/delivery', t: 'Block out a date', d: 'Holidays, kitchen closures' },
              { href: '/admin/delivery', t: 'Adjust slot capacity', d: 'Per-day capacity overrides' },
              { href: '/admin/settings', t: 'Change logo, hero, contact details', d: 'Site-wide settings' },
              { href: '/admin/applications', t: 'Review new account applications', d: 'Approve / reject pending' },
            ].map((q) => (
              <li key={q.t}>
                <Link
                  href={q.href}
                  style={{
                    display: 'block',
                    padding: '12px 14px',
                    border: '1px solid #e6e1d4',
                    borderRadius: 4,
                    textDecoration: 'none',
                    color: '#1c1813',
                  }}
                >
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{q.t}</div>
                  <div style={{ fontSize: 12, color: '#5a524a', marginTop: 2 }}>{q.d}</div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function WeeklyChart({ data }: { data: { weekStart: string; orders: number; revenue: number }[] }) {
  const max = Math.max(...data.map((d) => d.orders), 1);
  const barW = 36;
  const gap = 12;
  const chartH = 140;
  const labelH = 28;
  const width = data.length * (barW + gap);
  const height = chartH + labelH + 20;
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={width} height={height} role="img" aria-label="Weekly orders chart">
        {data.map((d, i) => {
          const h = (d.orders / max) * chartH;
          const x = i * (barW + gap);
          const y = chartH - h + 8;
          const wkLabel = new Date(d.weekStart + 'T00:00:00').toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          });
          return (
            <g key={d.weekStart}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 2)}
                fill={i === data.length - 1 ? '#1f4a38' : '#3a6b53'}
                rx={2}
              />
              <text
                x={x + barW / 2}
                y={y - 4}
                fontSize={11}
                fontFamily="Newsreader, serif"
                fill="#1c1813"
                textAnchor="middle"
              >
                {d.orders}
              </text>
              <text
                x={x + barW / 2}
                y={chartH + 22}
                fontSize={10}
                fontFamily="JetBrains Mono, monospace"
                fill="#5a524a"
                textAnchor="middle"
              >
                {wkLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
