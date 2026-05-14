import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { isMockMode } from '@/lib/mock';
import { PageHeader } from '@/components/admin-ui';
import CustomersClient from './customers-client';
import type { OrderTotals } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
//  Admin customers — aggregate of orders grouped by company /
//  email. Click a row to see that customer's full history.
//  No separate customers table — we derive from orders.
// ─────────────────────────────────────────────────────────────

export type CustomerRow = {
  key: string;             // normalised company name (lowercased)
  company: string;         // display name
  email: string | null;
  contact: string | null;
  phone: string | null;
  total_spend: number;
  order_count: number;
  last_order: string | null;
  postcodes: string[];
  status: 'active' | 'inactive';
};

async function fetchCustomers(): Promise<CustomerRow[]> {
  if (isMockMode()) {
    const companies = [
      { name: 'Allen & Overy LLP', contact: 'Priya Shah', email: 'priya.shah@allenovery.com', phone: '+44 20 3088 0100', spend: 8240, orders: 14, last: 3, pc: ['EC2M 5TE'] },
      { name: 'Goldman Sachs International', contact: 'Marcus Webb', email: 'm.webb@gs.com', phone: '+44 20 7774 1000', spend: 6520, orders: 11, last: 5, pc: ['EC4M 7AA'] },
      { name: 'McKinsey & Company', contact: 'Sara Lindqvist', email: 'sara_lindqvist@mckinsey.com', phone: '+44 20 7961 2000', spend: 5180, orders: 9, last: 6, pc: ['EC2M 5TE', 'EC2N'] },
      { name: 'Morgan Stanley', contact: 'Hannah Reeves', email: 'hannah.reeves@morganstanley.com', phone: '+44 20 7425 8000', spend: 4320, orders: 8, last: 12, pc: ['EC2N'] },
      { name: 'Clifford Chance', contact: 'Olu Adebayo', email: 'olu.adebayo@cliffordchance.com', phone: '+44 20 7006 1000', spend: 3960, orders: 7, last: 9, pc: ['EC3M'] },
      { name: 'BCG', contact: 'Tom Reilly', email: 't.reilly@bcg.com', phone: '+44 20 7753 5000', spend: 2840, orders: 6, last: 18, pc: ['EC2N'] },
      { name: 'Freshfields Bruckhaus Deringer', contact: 'Mira Bhatt', email: 'mira.bhatt@freshfields.com', phone: '+44 20 7936 4000', spend: 2150, orders: 5, last: 22, pc: ['EC4M'] },
      { name: 'PwC UK', contact: 'James Whittle', email: 'james.whittle@pwc.com', phone: '+44 20 7583 5000', spend: 1820, orders: 5, last: 16, pc: ['EC3M'] },
      { name: 'EY London', contact: 'Aisha Karim', email: 'aisha.karim@uk.ey.com', phone: '+44 20 7951 2000', spend: 1620, orders: 4, last: 28, pc: ['EC4M'] },
      { name: 'Monzo Bank', contact: 'Riley Jones', email: 'riley@monzo.com', phone: '+44 20 3322 0000', spend: 940, orders: 3, last: 42, pc: ['EC1V'] },
      { name: 'Wise plc', contact: 'Pavel Ivanov', email: 'pavel@wise.com', phone: '+44 20 3695 0999', spend: 720, orders: 2, last: 55, pc: ['EC2N'] },
    ];
    const today = Date.now();
    return companies.map((c) => ({
      key: c.name.toLowerCase(),
      company: c.name,
      email: c.email,
      contact: c.contact,
      phone: c.phone,
      total_spend: c.spend,
      order_count: c.orders,
      last_order: new Date(today - c.last * 86400000).toISOString(),
      postcodes: c.pc,
      status: c.last <= 30 ? 'active' : 'inactive',
    }));
  }

  const admin = createAdminClient();
  // Pull last ~12 months of orders to derive customers
  const cutoff = new Date(Date.now() - 365 * 86400000).toISOString();
  const { data, error } = await admin
    .from('orders')
    .select('contact_company,contact_email,contact_name,contact_phone,postcode,totals,created_at,status')
    .gte('created_at', cutoff)
    .neq('status', 'failed')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('customers fetch failed:', error);
    return [];
  }

  const byKey = new Map<string, CustomerRow>();
  for (const o of (data ?? []) as {
    contact_company: string | null;
    contact_email: string | null;
    contact_name: string | null;
    contact_phone: string | null;
    postcode: string;
    totals: OrderTotals;
    created_at: string;
    status: string;
  }[]) {
    const company = o.contact_company?.trim() || o.contact_email?.trim() || 'Unknown';
    const key = company.toLowerCase();
    const row = byKey.get(key) ?? {
      key,
      company,
      email: o.contact_email,
      contact: o.contact_name,
      phone: o.contact_phone,
      total_spend: 0,
      order_count: 0,
      last_order: null,
      postcodes: [],
      status: 'inactive' as const,
    };
    if (o.status === 'paid') {
      row.total_spend += Number(o.totals?.total ?? 0);
    }
    row.order_count += 1;
    if (!row.last_order || o.created_at > row.last_order) row.last_order = o.created_at;
    if (o.postcode && !row.postcodes.includes(o.postcode)) row.postcodes.push(o.postcode);
    byKey.set(key, row);
  }

  const cutoffDate = new Date(Date.now() - 60 * 86400000).toISOString();
  return [...byKey.values()].map((r) => ({
    ...r,
    status: r.last_order && r.last_order > cutoffDate ? 'active' : 'inactive',
  }));
}

export default async function CustomersPage() {
  await requireAdmin();
  const customers = await fetchCustomers();
  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Companies that have placed an order in the last year. Sorted by total spend."
      />
      <CustomersClient initial={customers} />
    </div>
  );
}
