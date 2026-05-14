'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { CustomerRow } from './page';
import { Card, Badge, Btn, DataTable, Empty } from '@/components/admin-ui';
import { moneyExact } from '@/lib/order';

type Tab = 'all' | 'active' | 'top';
type Sort = 'spend_desc' | 'orders_desc' | 'recent';

export default function CustomersClient({ initial }: { initial: CustomerRow[] }) {
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('spend_desc');

  const filtered = useMemo(() => {
    let list = initial.slice();
    if (tab === 'active') list = list.filter((c) => c.status === 'active');
    if (tab === 'top') list = list.filter((c) => c.total_spend > 1500);
    if (q) {
      const qq = q.toLowerCase();
      list = list.filter(
        (c) =>
          c.company.toLowerCase().includes(qq) ||
          (c.contact ?? '').toLowerCase().includes(qq) ||
          (c.email ?? '').toLowerCase().includes(qq)
      );
    }
    if (sort === 'spend_desc') list.sort((a, b) => b.total_spend - a.total_spend);
    if (sort === 'orders_desc') list.sort((a, b) => b.order_count - a.order_count);
    if (sort === 'recent')
      list.sort((a, b) => (b.last_order ?? '').localeCompare(a.last_order ?? ''));
    return list;
  }, [initial, tab, q, sort]);

  const counts = {
    all: initial.length,
    active: initial.filter((c) => c.status === 'active').length,
    top: initial.filter((c) => c.total_spend > 1500).length,
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(
            [
              { id: 'all' as Tab, label: 'All', count: counts.all },
              { id: 'active' as Tab, label: 'Active (60d)', count: counts.active },
              { id: 'top' as Tab, label: 'Top spenders', count: counts.top },
            ]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? '#1c1813' : '#ffffff',
                color: tab === t.id ? '#fafaf7' : '#1c1813',
                border: '1px solid ' + (tab === t.id ? '#1c1813' : '#d9cfb6'),
                padding: '6px 12px',
                borderRadius: 3,
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'inherit',
              }}
            >
              {t.label}{' '}
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9.5,
                  opacity: 0.55,
                  marginLeft: 3,
                }}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by company, name, email…"
            style={{
              background: '#ffffff',
              border: '1px solid #d9cfb6',
              padding: '6px 10px',
              fontSize: 12,
              borderRadius: 3,
              fontFamily: 'inherit',
              width: 240,
              outline: 'none',
            }}
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            style={{
              background: '#ffffff',
              border: '1px solid #d9cfb6',
              padding: '6px 10px',
              fontSize: 12,
              borderRadius: 3,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            <option value="spend_desc">Sort: top spend</option>
            <option value="orders_desc">Sort: most orders</option>
            <option value="recent">Sort: most recent</option>
          </select>
        </div>
      </div>

      <Card noPad>
        {filtered.length === 0 ? (
          <Empty title="No customers" hint="Nothing matches the current filter." />
        ) : (
          <DataTable
            columns={[
              { key: 'company', label: 'Company' },
              { key: 'contact', label: 'Contact' },
              { key: 'orders', label: 'Orders', align: 'right' },
              { key: 'spend', label: 'Spend', align: 'right' },
              { key: 'last', label: 'Last order', align: 'right' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: '', align: 'right' },
            ]}
            rows={filtered.map((c) => ({
              id: c.key,
              cells: [
                <div key="company">
                  <div style={{ fontFamily: 'Newsreader, serif', fontSize: 15 }}>{c.company}</div>
                  <div style={{ fontSize: 11, color: '#5a524a' }}>
                    {c.postcodes.length > 0 ? c.postcodes.join(', ') : '—'}
                  </div>
                </div>,
                <div key="contact">
                  <div style={{ fontSize: 13 }}>{c.contact ?? '—'}</div>
                  <div style={{ fontSize: 11, color: '#5a524a' }}>{c.email ?? '—'}</div>
                </div>,
                <span key="orders" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                  {c.order_count}
                </span>,
                <span key="spend" style={{ fontFamily: 'Newsreader, serif', fontSize: 15 }}>
                  {moneyExact(c.total_spend)}
                </span>,
                <span key="last" style={{ fontSize: 12, color: '#5a524a' }}>
                  {c.last_order
                    ? new Date(c.last_order).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit',
                      })
                    : '—'}
                </span>,
                <Badge key="status" tone={c.status === 'active' ? 'good' : 'neutral'}>
                  {c.status}
                </Badge>,
                <Btn key="actions" size="sm" variant="secondary" href={`/admin/customers/${encodeURIComponent(c.key)}`}>
                  Open
                </Btn>,
              ],
            }))}
          />
        )}
      </Card>
    </div>
  );
}
