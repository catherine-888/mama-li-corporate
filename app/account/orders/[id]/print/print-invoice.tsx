'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { moneyExact } from '@/lib/order';
import type { CustomerOrder } from '@/lib/customer-orders';
import type { SiteSettings } from '@/lib/content';

// ─────────────────────────────────────────────────────────────
//  Print-friendly invoice. Customers' accounts teams can use the
//  browser's "Print → Save as PDF" to get a PDF. Layout is A4-
//  friendly; nav/footer chrome hides via @media print.
//
//  Not a real VAT invoice with sequential numbering. For that
//  you need: (a) HMRC-compliant invoice numbering scheme,
//  (b) registered VAT number on every invoice, (c) the proper
//  "Tax point" date. Get that built by your developer when you
//  pass the VAT-registration threshold.
// ─────────────────────────────────────────────────────────────

export default function PrintInvoice({
  order,
  settings,
}: {
  order: CustomerOrder;
  settings: SiteSettings;
}) {
  const ref = 'ML-' + order.id.slice(0, 6).toUpperCase();

  // Auto-open the print dialog on mount, so customers land directly in print.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        window.print();
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(t);
  }, []);

  const created = new Date(order.created_at);
  const deliveryDate = new Date(order.delivery.date + 'T00:00:00');

  return (
    <div className="invoice-shell">
      {/* On-screen toolbar (hidden when printing) */}
      <div className="invoice-toolbar no-print">
        <Link
          href={`/account/orders/${order.id}`}
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#5a524a',
            textDecoration: 'none',
          }}
        >
          ← Back to order
        </Link>
        <button onClick={() => window.print()} className="invoice-print-btn">
          Print / Save as PDF
        </button>
      </div>

      <article className="invoice">
        {/* Header */}
        <header className="invoice-header">
          <div>
            <div
              style={{
                fontFamily: 'Newsreader, serif',
                fontStyle: 'italic',
                fontSize: 30,
                lineHeight: 1,
                color: '#1c1813',
              }}
            >
              {settings.brand_name}
            </div>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#5a524a',
                marginTop: 4,
              }}
            >
              Corporate catering
            </div>
            <address
              style={{
                fontStyle: 'normal',
                fontSize: 11,
                color: '#5a524a',
                marginTop: 12,
                lineHeight: 1.55,
              }}
            >
              49 London Wall<br />
              London EC2M 5TE<br />
              {settings.contact_email}<br />
              VAT no.: GB 000 0000 00 <span style={{ opacity: 0.6 }}>(placeholder)</span>
            </address>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1
              style={{
                fontFamily: 'Newsreader, serif',
                fontWeight: 400,
                fontSize: 36,
                letterSpacing: '-0.02em',
                margin: 0,
                color: '#1c1813',
              }}
            >
              Invoice
            </h1>
            <dl className="invoice-meta">
              <dt>Invoice no.</dt>
              <dd>{ref}</dd>
              <dt>Issue date</dt>
              <dd>{created.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
              <dt>Delivery date</dt>
              <dd>{deliveryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
              <dt>Status</dt>
              <dd
                style={{
                  color: order.status === 'paid' ? '#1f4a38' : '#a67428',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                }}
              >
                {order.status === 'paid' ? 'PAID' : order.status}
              </dd>
            </dl>
          </div>
        </header>

        {/* Bill to */}
        <section className="invoice-billto">
          <div>
            <div className="invoice-label">Bill to</div>
            <div style={{ fontFamily: 'Newsreader, serif', fontSize: 17, color: '#1c1813' }}>
              {order.contact_company ?? order.contact_name ?? '—'}
            </div>
            {order.contact_name && order.contact_company && (
              <div style={{ fontSize: 12, color: '#5a524a' }}>{order.contact_name}</div>
            )}
            {order.contact_email && (
              <div style={{ fontSize: 12, color: '#5a524a' }}>{order.contact_email}</div>
            )}
          </div>
          <div>
            <div className="invoice-label">Deliver to</div>
            <div style={{ fontFamily: 'Newsreader, serif', fontSize: 17, color: '#1c1813' }}>
              {order.delivery.recipient || '—'}
            </div>
            <div style={{ fontSize: 12, color: '#5a524a', lineHeight: 1.6 }}>
              {order.delivery.building && (
                <>
                  {order.delivery.building}
                  <br />
                </>
              )}
              {order.delivery.address && (
                <>
                  {order.delivery.address}
                  <br />
                </>
              )}
              {order.postcode}
            </div>
          </div>
        </section>

        {/* Line items */}
        <table className="invoice-items">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Description</th>
              <th style={{ width: 50, textAlign: 'right' }}>Qty</th>
              <th style={{ width: 80, textAlign: 'right' }}>Unit</th>
              <th style={{ width: 90, textAlign: 'right' }}>Net</th>
            </tr>
          </thead>
          <tbody>
            {order.cart.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ fontFamily: 'Newsreader, serif', fontSize: 14, color: '#1c1813' }}>{c.name}</div>
                  {c.subtitle && (
                    <div style={{ fontSize: 11, color: '#5a524a' }}>{c.subtitle}</div>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>{c.qty}</td>
                <td style={{ textAlign: 'right' }}>{moneyExact(c.price)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'Newsreader, serif', fontSize: 14 }}>
                  {moneyExact(c.price * c.qty)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <section className="invoice-totals">
          <div className="invoice-totals-stack">
            <div className="invoice-total-row">
              <span>Subtotal</span>
              <span>{moneyExact(order.totals.subtotal)}</span>
            </div>
            {order.totals.deliveryFee > 0 && (
              <div className="invoice-total-row">
                <span>Delivery</span>
                <span>{moneyExact(order.totals.deliveryFee)}</span>
              </div>
            )}
            <div className="invoice-total-row">
              <span>VAT (20%)</span>
              <span>{moneyExact(order.totals.vat)}</span>
            </div>
            <div className="invoice-total-row invoice-total-grand">
              <span>Total due</span>
              <span>{moneyExact(order.totals.total)}</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="invoice-footer">
          {order.status === 'paid' ? (
            <p>
              Paid via Stripe on{' '}
              {created.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              . No further action required.
            </p>
          ) : (
            <p>Payment pending — settled at checkout.</p>
          )}
          <p style={{ marginTop: 10, opacity: 0.7 }}>
            For any queries about this invoice, contact {settings.contact_email}.
          </p>
        </footer>
      </article>

      <style jsx global>{`
        body { background: #fafaf7; }
        .invoice-shell {
          max-width: 900px;
          margin: 0 auto;
          padding: 32px 24px 80px;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .invoice-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .invoice-print-btn {
          background: #1c1813;
          color: #fafaf7;
          border: none;
          padding: 10px 22px;
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          border-radius: 2px;
        }
        .invoice {
          background: white;
          padding: 56px 64px;
          box-shadow: 0 4px 32px rgba(28,24,19,0.08);
        }
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 28px;
          border-bottom: 2px solid #1c1813;
        }
        .invoice-meta {
          display: grid;
          grid-template-columns: auto auto;
          gap: 4px 14px;
          margin: 14px 0 0;
          font-size: 12px;
        }
        .invoice-meta dt {
          color: #5a524a;
          text-align: right;
          margin: 0;
        }
        .invoice-meta dd {
          margin: 0;
          color: #1c1813;
          font-family: 'JetBrains Mono', monospace;
        }
        .invoice-billto {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin: 36px 0 32px;
        }
        .invoice-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #5a524a;
          margin-bottom: 8px;
        }
        .invoice-items {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .invoice-items th {
          border-bottom: 1px solid #1c1813;
          padding: 10px 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #5a524a;
          font-weight: 500;
        }
        .invoice-items td {
          padding: 14px 6px;
          border-bottom: 1px dashed #e6e1d4;
          vertical-align: top;
        }
        .invoice-totals {
          display: flex;
          justify-content: flex-end;
          margin-top: 18px;
        }
        .invoice-totals-stack {
          width: 320px;
          font-size: 13px;
        }
        .invoice-total-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
        }
        .invoice-total-row span:first-child { color: #5a524a; }
        .invoice-total-grand {
          font-family: 'Newsreader', serif;
          font-size: 18px;
          color: #1c1813;
          border-top: 2px solid #1c1813;
          margin-top: 6px;
          padding-top: 10px;
        }
        .invoice-total-grand span:first-child { color: #1c1813 !important; }
        .invoice-footer {
          margin-top: 48px;
          padding-top: 20px;
          border-top: 1px solid #e6e1d4;
          font-size: 12px;
          color: #5a524a;
        }
        @media print {
          body { background: white; }
          .no-print, header, nav, footer:not(.invoice-footer) { display: none !important; }
          .invoice-shell {
            padding: 0;
            max-width: none;
          }
          .invoice {
            box-shadow: none;
            padding: 36px 40px;
          }
          @page {
            size: A4;
            margin: 14mm;
          }
        }
      `}</style>
    </div>
  );
}
