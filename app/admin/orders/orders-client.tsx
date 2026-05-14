'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminOrder, DateRange } from './page';
import { Card, Btn, Badge, DataTable, Empty } from '@/components/admin-ui';
import { moneyExact } from '@/lib/order';

const STATUS_FILTERS = [
  { id: 'paid', label: 'Paid' },
  { id: 'pending', label: 'Pending' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'failed', label: 'Failed' },
  { id: 'all', label: 'All' },
] as const;

const PRESETS = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: '12m', label: 'Last 12 months' },
  { id: 'all', label: 'All time' },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]['id'];

export default function OrdersClient({
  initial,
  initialFilter = 'paid',
  highlightId,
  range,
}: {
  initial: AdminOrder[];
  initialFilter?: string;
  highlightId?: string;
  range: DateRange;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>(
    (STATUS_FILTERS.find((f) => f.id === initialFilter)?.id ?? 'paid') as StatusFilter
  );
  const [selected, setSelected] = useState<AdminOrder | null>(null);

  const applyPreset = (preset: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('range', preset);
    url.searchParams.delete('from');
    url.searchParams.delete('to');
    router.push(url.pathname + '?' + url.searchParams.toString());
  };

  const applyCustomRange = (from: string, to: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('from', from);
    url.searchParams.set('to', to);
    url.searchParams.delete('range');
    router.push(url.pathname + '?' + url.searchParams.toString());
  };

  const downloadCsv = () => {
    const rows = [
      ['Reference', 'Created', 'Status', 'Company', 'Name', 'Email', 'Phone', 'Delivery date', 'Slot', 'Method', 'Postcode', 'Items', 'Subtotal', 'Delivery', 'VAT', 'Total'],
      ...filtered.map((o) => [
        'ML-' + o.id.slice(0, 6).toUpperCase(),
        new Date(o.created_at).toISOString(),
        o.status,
        o.contact_company ?? '',
        o.contact_name ?? '',
        o.contact_email ?? '',
        o.contact_phone ?? '',
        o.delivery.date,
        o.delivery.slot,
        o.delivery.method,
        o.postcode,
        o.cart.reduce((s, c) => s + c.qty, 0).toString(),
        o.totals.subtotal.toFixed(2),
        o.totals.deliveryFee.toFixed(2),
        o.totals.vat.toFixed(2),
        o.totals.total.toFixed(2),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mama-li-orders-${range.from}_to_${range.to}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (highlightId) {
      const o = initial.find((x) => x.id === highlightId);
      if (o) setSelected(o);
    }
  }, [highlightId, initial]);

  const filtered = useMemo(
    () => (filter === 'all' ? initial : initial.filter((o) => o.status === filter)),
    [initial, filter]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const o of initial) c[o.status] = (c[o.status] ?? 0) + 1;
    c.all = initial.length;
    return c;
  }, [initial]);

  const statusTone = (s: AdminOrder['status']) =>
    s === 'paid' ? 'good' : s === 'pending' ? 'attention' : s === 'cancelled' ? 'warn' : 'warn';

  return (
    <div>
      {/* Date range row */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 14,
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              style={{
                background: '#ffffff',
                color: '#1c1813',
                border: '1px solid #d9cfb6',
                padding: '6px 12px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'inherit',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="date"
            value={range.from}
            onChange={(e) => applyCustomRange(e.target.value, range.to)}
            style={{
              background: '#ffffff',
              border: '1px solid #d9cfb6',
              padding: '6px 10px',
              fontSize: 12,
              borderRadius: 4,
              fontFamily: 'inherit',
            }}
          />
          <span style={{ color: '#5a524a', fontSize: 12 }}>→</span>
          <input
            type="date"
            value={range.to}
            onChange={(e) => applyCustomRange(range.from, e.target.value)}
            style={{
              background: '#ffffff',
              border: '1px solid #d9cfb6',
              padding: '6px 10px',
              fontSize: 12,
              borderRadius: 4,
              fontFamily: 'inherit',
            }}
          />
          <Btn variant="secondary" size="sm" onClick={downloadCsv}>
            ↓ Export CSV
          </Btn>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                background: active ? '#1c1813' : '#ffffff',
                color: active ? '#fafaf7' : '#1c1813',
                border: '1px solid ' + (active ? '#1c1813' : '#d9cfb6'),
                padding: '7px 14px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            >
              {f.label}{' '}
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, opacity: 0.55, marginLeft: 4 }}>
                {counts[f.id] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <Card noPad>
        {filtered.length === 0 ? (
          <Empty title="No orders" hint="Nothing matches the current filter." />
        ) : (
          <DataTable
            columns={[
              { key: 'ref', label: 'Ref' },
              { key: 'company', label: 'Company' },
              { key: 'delivery', label: 'Delivery' },
              { key: 'items', label: 'Items', align: 'right' },
              { key: 'total', label: 'Total', align: 'right' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: '', align: 'right' },
            ]}
            rows={filtered.map((o) => {
              const ref = 'ML-' + o.id.slice(0, 6).toUpperCase();
              const itemCount = o.cart.reduce((s, c) => s + c.qty, 0);
              return {
                id: o.id,
                cells: [
                  <span key="ref" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                    {ref}
                  </span>,
                  <div key="company">
                    <div style={{ fontFamily: 'Newsreader, serif', fontSize: 15 }}>
                      {o.contact_company ?? '—'}
                    </div>
                    <div style={{ fontSize: 11, color: '#5a524a' }}>{o.contact_name ?? o.contact_email ?? '—'}</div>
                  </div>,
                  <div key="delivery">
                    <div style={{ fontSize: 13 }}>
                      {new Date(o.delivery.date + 'T00:00:00').toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </div>
                    <div style={{ fontSize: 11, color: '#5a524a' }}>
                      {o.delivery.slot} · {o.delivery.method === 'pickup' ? 'pickup' : o.postcode}
                    </div>
                  </div>,
                  <span key="items" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                    {itemCount}
                  </span>,
                  <span key="total" style={{ fontFamily: 'Newsreader, serif', fontSize: 15 }}>
                    {moneyExact(o.totals.total)}
                  </span>,
                  <span key="status">
                    <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                  </span>,
                  <Btn key="actions" size="sm" variant="ghost" onClick={() => setSelected(o)}>
                    Details
                  </Btn>,
                ],
              };
            })}
          />
        )}
      </Card>

      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(28,24,19,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 6,
              padding: 28,
              maxWidth: 640,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: 22, margin: 0 }}>
                Order ML-{selected.id.slice(0, 6).toUpperCase()}
              </h2>
              <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
            </div>
            <p style={{ color: '#5a524a', margin: '6px 0 20px', fontSize: 13 }}>
              Created {new Date(selected.created_at).toLocaleString('en-GB')}
            </p>

            <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 8, columnGap: 12, fontSize: 13 }}>
              <dt style={{ color: '#5a524a' }}>Customer</dt>
              <dd style={{ margin: 0 }}>
                {selected.contact_name ?? '—'}
                <div style={{ fontSize: 11, color: '#5a524a' }}>{selected.contact_email ?? '—'}</div>
              </dd>
              <dt style={{ color: '#5a524a' }}>Company</dt>
              <dd style={{ margin: 0 }}>{selected.contact_company ?? '—'}</dd>
              <dt style={{ color: '#5a524a' }}>Phone</dt>
              <dd style={{ margin: 0 }}>{selected.contact_phone ?? selected.delivery.contactPhone ?? '—'}</dd>
              <dt style={{ color: '#5a524a' }}>
                {selected.delivery.method === 'pickup' ? 'Pickup' : 'Delivery'}
              </dt>
              <dd style={{ margin: 0 }}>
                {new Date(selected.delivery.date + 'T00:00:00').toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}{' '}
                · {selected.delivery.slot}
                <div style={{ fontSize: 11, color: '#5a524a' }}>
                  {selected.delivery.method === 'pickup'
                    ? `from ${selected.delivery.pickupLocation}`
                    : `${selected.delivery.building ? selected.delivery.building + ', ' : ''}${selected.delivery.address || '(no address)'}, ${selected.postcode}`}
                </div>
              </dd>
              <dt style={{ color: '#5a524a' }}>Recipient</dt>
              <dd style={{ margin: 0 }}>{selected.delivery.recipient || '—'}</dd>
              {selected.delivery.notes && (
                <>
                  <dt style={{ color: '#5a524a' }}>Notes</dt>
                  <dd style={{ margin: 0, fontStyle: 'italic' }}>{selected.delivery.notes}</dd>
                </>
              )}
            </dl>

            <h3 style={{ fontFamily: 'Newsreader, serif', fontSize: 17, fontWeight: 500, marginTop: 28, marginBottom: 10 }}>
              Items
            </h3>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <tbody>
                {selected.cart.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px dashed #e6e1d4' }}>
                    <td style={{ padding: '8px 0', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#5a524a', width: 30 }}>
                      {c.qty}×
                    </td>
                    <td style={{ padding: '8px 4px', fontFamily: 'Newsreader, serif', fontSize: 14 }}>
                      {c.name}
                      {c.subtitle && (
                        <div style={{ fontSize: 11, color: '#5a524a', fontFamily: 'DM Sans, sans-serif' }}>
                          {c.subtitle}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'Newsreader, serif', fontSize: 14 }}>
                      {moneyExact(c.price * c.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table style={{ width: '100%', marginTop: 14, fontSize: 13 }}>
              <tbody>
                <tr>
                  <td style={{ color: '#5a524a' }}>Subtotal</td>
                  <td style={{ textAlign: 'right' }}>{moneyExact(selected.totals.subtotal)}</td>
                </tr>
                {selected.totals.deliveryFee > 0 && (
                  <tr>
                    <td style={{ color: '#5a524a' }}>Delivery</td>
                    <td style={{ textAlign: 'right' }}>{moneyExact(selected.totals.deliveryFee)}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ color: '#5a524a' }}>VAT</td>
                  <td style={{ textAlign: 'right' }}>{moneyExact(selected.totals.vat)}</td>
                </tr>
                <tr>
                  <td style={{ paddingTop: 8, borderTop: '1px solid #1c1813', fontFamily: 'Newsreader, serif', fontSize: 16 }}>
                    Total
                  </td>
                  <td style={{ paddingTop: 8, borderTop: '1px solid #1c1813', textAlign: 'right', fontFamily: 'Newsreader, serif', fontSize: 16 }}>
                    {moneyExact(selected.totals.total)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="ghost" onClick={() => setSelected(null)}>
                Close
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
