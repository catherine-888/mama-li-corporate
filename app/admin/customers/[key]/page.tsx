import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { isMockMode } from '@/lib/mock';
import { PageHeader, Card, Badge, DataTable, Empty, Btn } from '@/components/admin-ui';
import { moneyExact } from '@/lib/order';
import type { Order, CartItem, DeliveryDetails, OrderTotals } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
//  Single customer detail. URL key = lowercased company name.
// ─────────────────────────────────────────────────────────────

type CustomerOrder = Order & {
  contact_email: string | null;
  contact_name: string | null;
  contact_company: string | null;
  contact_phone: string | null;
};

type CustomerSummary = {
  company: string;
  email: string | null;
  contact: string | null;
  phone: string | null;
  total_spend: number;
  order_count: number;
  first_order: string | null;
  last_order: string | null;
  postcodes: string[];
  status: 'active' | 'inactive';
  orders: CustomerOrder[];
};

async function fetchCustomer(key: string): Promise<CustomerSummary | null> {
  if (isMockMode()) {
    // Reverse the key (lowercased company) to a display name + build mock history.
    const companies: Record<string, { name: string; email: string; contact: string; phone: string }> = {
      'allen & overy llp': { name: 'Allen & Overy LLP', email: 'priya.shah@allenovery.com', contact: 'Priya Shah', phone: '+44 20 3088 0100' },
      'goldman sachs international': { name: 'Goldman Sachs International', email: 'm.webb@gs.com', contact: 'Marcus Webb', phone: '+44 20 7774 1000' },
      'mckinsey & company': { name: 'McKinsey & Company', email: 'sara_lindqvist@mckinsey.com', contact: 'Sara Lindqvist', phone: '+44 20 7961 2000' },
      'morgan stanley': { name: 'Morgan Stanley', email: 'hannah.reeves@morganstanley.com', contact: 'Hannah Reeves', phone: '+44 20 7425 8000' },
      'clifford chance': { name: 'Clifford Chance', email: 'olu.adebayo@cliffordchance.com', contact: 'Olu Adebayo', phone: '+44 20 7006 1000' },
      'bcg': { name: 'BCG', email: 't.reilly@bcg.com', contact: 'Tom Reilly', phone: '+44 20 7753 5000' },
      'freshfields bruckhaus deringer': { name: 'Freshfields Bruckhaus Deringer', email: 'mira.bhatt@freshfields.com', contact: 'Mira Bhatt', phone: '+44 20 7936 4000' },
      'pwc uk': { name: 'PwC UK', email: 'james.whittle@pwc.com', contact: 'James Whittle', phone: '+44 20 7583 5000' },
      'ey london': { name: 'EY London', email: 'aisha.karim@uk.ey.com', contact: 'Aisha Karim', phone: '+44 20 7951 2000' },
      'monzo bank': { name: 'Monzo Bank', email: 'riley@monzo.com', contact: 'Riley Jones', phone: '+44 20 3322 0000' },
      'wise plc': { name: 'Wise plc', email: 'pavel@wise.com', contact: 'Pavel Ivanov', phone: '+44 20 3695 0999' },
    };
    const meta = companies[key];
    if (!meta) return null;

    // Build a plausible spread of historical orders.
    const orderCount = 4 + Math.floor((key.length * 3) % 7);
    const orders: CustomerOrder[] = [];
    for (let i = 0; i < orderCount; i++) {
      const daysAgo = (i + 1) * (3 + (i % 4));
      const created = new Date(Date.now() - daysAgo * 86400000);
      const deliveryDate = new Date(created.getTime() + 2 * 86400000).toISOString().slice(0, 10);
      const cart: CartItem[] = [
        { id: 'b-platter-classic', bundleId: 'b-platter-classic', name: 'Classic Siu Mei Platter', price: 185, qty: 1 + (i % 2), subtitle: 'Family-style' },
        { id: 'b-lunch-rice', bundleId: 'b-lunch-rice', name: 'Rice Box Lunch', price: 14.5, qty: 8 + i * 2, subtitle: 'Per person' },
      ];
      const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
      const deliveryFee = 15;
      const vat = (subtotal + deliveryFee) * 0.2;
      const total = subtotal + deliveryFee + vat;
      orders.push({
        id: 'mock-' + key.slice(0, 4) + '-' + i,
        account_id: null,
        postcode: 'EC2M 5TE',
        cart,
        delivery: {
          method: 'delivery',
          date: deliveryDate,
          slot: ['12-13', '13-14'][i % 2],
          pickupLocation: 'london-wall',
          building: 'Bishopsgate Tower',
          address: '150 Bishopsgate',
          recipient: 'Reception',
          contactPhone: meta.phone,
          notes: '',
        } as DeliveryDetails,
        totals: { subtotal, deliveryFee, vat, total } as OrderTotals,
        status: 'paid',
        stripe_session_id: null,
        stripe_payment_intent_id: null,
        created_at: created.toISOString(),
        contact_email: meta.email,
        contact_name: meta.contact,
        contact_company: meta.name,
        contact_phone: meta.phone,
      });
    }

    const totalSpend = orders.reduce((s, o) => s + Number(o.totals.total), 0);
    const isActive = orders.some(
      (o) => new Date(o.created_at).getTime() > Date.now() - 60 * 86400000
    );
    return {
      company: meta.name,
      email: meta.email,
      contact: meta.contact,
      phone: meta.phone,
      total_spend: totalSpend,
      order_count: orders.length,
      first_order: orders[orders.length - 1].created_at,
      last_order: orders[0].created_at,
      postcodes: ['EC2M 5TE'],
      status: isActive ? 'active' : 'inactive',
      orders,
    };
  }

  const admin = createAdminClient();
  // Match orders where the lowercased company matches the key.
  // Falls back to email match for companies named just by email.
  const { data, error } = await admin
    .from('orders')
    .select('*')
    .or(`contact_company.ilike.${key},contact_email.ilike.${key}`)
    .neq('status', 'failed')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('customer detail fetch failed:', error);
    return null;
  }
  const orders = (data ?? []) as CustomerOrder[];
  if (orders.length === 0) return null;

  const first = orders[orders.length - 1];
  const last = orders[0];
  const totalSpend = orders.filter((o) => o.status === 'paid').reduce((s, o) => s + Number(o.totals?.total ?? 0), 0);
  const postcodes = Array.from(new Set(orders.map((o) => o.postcode).filter(Boolean)));
  const isActive =
    new Date(last.created_at).getTime() > Date.now() - 60 * 86400000;

  return {
    company: last.contact_company ?? last.contact_email ?? 'Unknown',
    email: last.contact_email,
    contact: last.contact_name,
    phone: last.contact_phone,
    total_spend: totalSpend,
    order_count: orders.length,
    first_order: first.created_at,
    last_order: last.created_at,
    postcodes,
    status: isActive ? 'active' : 'inactive',
    orders,
  };
}

export default async function CustomerDetailPage({ params }: { params: { key: string } }) {
  await requireAdmin();
  const decodedKey = decodeURIComponent(params.key);
  const customer = await fetchCustomer(decodedKey);
  if (!customer) notFound();

  const aov = customer.order_count === 0 ? 0 : customer.total_spend / customer.order_count;

  return (
    <div>
      <Link
        href="/admin/customers"
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#5a524a',
          textDecoration: 'none',
          display: 'inline-block',
          marginBottom: 12,
        }}
      >
        ← All customers
      </Link>
      <PageHeader
        title={customer.company}
        subtitle={`${customer.contact ?? 'No contact'} · ${customer.email ?? '—'} · ${customer.phone ?? '—'}`}
        actions={
          customer.email ? (
            <Btn href={`mailto:${customer.email}`} variant="secondary">
              ✉ Email contact
            </Btn>
          ) : undefined
        }
      />

      {/* Stat tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 10,
          marginBottom: 20,
        }}
      >
        <Card style={{ background: '#eaf3ee', borderColor: '#b9d6c4' }}>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#1f4a38',
            }}
          >
            Total spend
          </div>
          <div
            style={{
              fontFamily: 'Newsreader, serif',
              fontSize: 24,
              color: '#1f4a38',
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            {moneyExact(customer.total_spend)}
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
            Orders
          </div>
          <div style={{ fontFamily: 'Newsreader, serif', fontSize: 24, lineHeight: 1, marginTop: 4 }}>
            {customer.order_count}
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
            Avg order
          </div>
          <div style={{ fontFamily: 'Newsreader, serif', fontSize: 24, lineHeight: 1, marginTop: 4 }}>
            {moneyExact(aov)}
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
            Status
          </div>
          <div style={{ marginTop: 6 }}>
            <Badge tone={customer.status === 'active' ? 'good' : 'neutral'}>{customer.status}</Badge>
          </div>
          {customer.last_order && (
            <div style={{ fontSize: 11, color: '#5a524a', marginTop: 4 }}>
              Last order{' '}
              {new Date(customer.last_order).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
            </div>
          )}
        </Card>
      </div>

      <Card noPad>
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #e6e1d4',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: 17, margin: 0 }}>
            Order history
          </h2>
          {customer.postcodes.length > 0 && (
            <span style={{ fontSize: 11, color: '#5a524a' }}>
              Delivers to: {customer.postcodes.join(', ')}
            </span>
          )}
        </div>
        {customer.orders.length === 0 ? (
          <Empty title="No orders" />
        ) : (
          <DataTable
            columns={[
              { key: 'ref', label: 'Ref' },
              { key: 'placed', label: 'Placed', align: 'right' },
              { key: 'delivery', label: 'Delivery' },
              { key: 'items', label: 'Items', align: 'right' },
              { key: 'total', label: 'Total', align: 'right' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: '', align: 'right' },
            ]}
            rows={customer.orders.map((o) => {
              const ref = 'ML-' + o.id.slice(0, 6).toUpperCase();
              const itemCount = o.cart.reduce((s, c) => s + c.qty, 0);
              return {
                id: o.id,
                cells: [
                  <span key="ref" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                    {ref}
                  </span>,
                  <span key="placed" style={{ fontSize: 12, color: '#5a524a' }}>
                    {new Date(o.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: '2-digit',
                    })}
                  </span>,
                  <div key="delivery">
                    <div style={{ fontSize: 13 }}>
                      {new Date(o.delivery.date + 'T00:00:00').toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </div>
                    <div style={{ fontSize: 11, color: '#5a524a' }}>{o.delivery.slot}</div>
                  </div>,
                  <span key="items" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                    {itemCount}
                  </span>,
                  <span key="total" style={{ fontFamily: 'Newsreader, serif', fontSize: 14 }}>
                    {moneyExact(o.totals.total)}
                  </span>,
                  <Badge
                    key="status"
                    tone={
                      o.status === 'paid'
                        ? 'good'
                        : o.status === 'pending'
                          ? 'attention'
                          : 'warn'
                    }
                  >
                    {o.status}
                  </Badge>,
                  <Btn key="actions" size="sm" variant="ghost" href={`/admin/orders?id=${encodeURIComponent(o.id)}`}>
                    Open →
                  </Btn>,
                ],
              };
            })}
          />
        )}
      </Card>
    </div>
  );
}
