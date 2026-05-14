import type { Order } from '@/lib/types';
import { LOCATIONS, TIMESLOTS } from '@/lib/menu';

// ─────────────────────────────────────────────────────────────
//  Email templates — plain HTML strings (Resend supports raw
//  HTML; React-email could be added later for nicer DX).
//  Kept on-brand: warm cream / jade / minimal.
// ─────────────────────────────────────────────────────────────

function escape(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(n: number): string {
  return '£' + n.toFixed(2);
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

type OrderWithContact = Order & {
  contact_email?: string;
  contact_name?: string;
  contact_company?: string;
  contact_phone?: string;
};

const SHELL = (title: string, body: string) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escape(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5eedc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1c1813;">
    <div style="max-width:620px;margin:0 auto;padding:40px 24px;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-style:italic;font-weight:500;letter-spacing:-0.01em;">
        Mama Li
        <span style="font-family:monospace;font-size:10px;font-style:normal;letter-spacing:0.18em;text-transform:uppercase;color:#5a524a;display:block;margin-top:4px;">Corporate</span>
      </div>
      ${body}
      <hr style="border:none;border-top:1px solid #d9cfb6;margin:40px 0 16px;" />
      <p style="font-size:11px;color:#5a524a;letter-spacing:0.12em;text-transform:uppercase;">
        Mama Li Catering Ltd · Co. No. 11879302 · London EC2
      </p>
    </div>
  </body>
</html>`;

// ─────────────────────────────────────────────────────────────
//  CUSTOMER: order confirmation
// ─────────────────────────────────────────────────────────────

export function renderCustomerEmail(order: OrderWithContact, customerName: string): string {
  const orderRef = 'ML-' + order.id.slice(0, 6).toUpperCase();
  const isPickup = order.delivery.method === 'pickup';
  const slot = TIMESLOTS.find((s) => s.id === order.delivery.slot);
  const loc = LOCATIONS.find((l) => l.id === order.delivery.pickupLocation);
  const greeting = customerName ? `Hi ${escape(customerName.split(' ')[0])},` : 'Hello,';

  const items = order.cart
    .map(
      (it) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px dashed #d9cfb6;font-family:monospace;font-size:12px;color:#5a524a;vertical-align:top;width:30px;">${it.qty}×</td>
        <td style="padding:10px 0;border-bottom:1px dashed #d9cfb6;font-family:Georgia,serif;font-size:15px;vertical-align:top;">
          ${escape(it.name)}
          ${it.subtitle ? `<div style="font-family:-apple-system,sans-serif;font-size:12px;color:#5a524a;margin-top:2px;">${escape(it.subtitle)}</div>` : ''}
        </td>
        <td style="padding:10px 0;border-bottom:1px dashed #d9cfb6;font-family:Georgia,serif;font-size:15px;text-align:right;vertical-align:top;white-space:nowrap;">${money(it.price * it.qty)}</td>
      </tr>`
    )
    .join('');

  const body = `
    <div style="margin-top:32px;padding:10px 14px;display:inline-block;background:#3a6b53;color:#f5eedc;font-family:monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">
      ✓ Order confirmed
    </div>
    <h1 style="font-family:Georgia,serif;font-weight:400;font-size:32px;line-height:1.1;margin:18px 0 0;letter-spacing:-0.02em;">
      ${greeting}<br/>your order is in the kitchen.
    </h1>
    <p style="font-size:15px;line-height:1.55;color:#5a524a;margin:18px 0 0;">
      Reference <strong style="color:#1c1813;">${orderRef}</strong>. We&apos;ll prep everything fresh on the day, and our driver will call about 15 minutes before ${isPickup ? 'your pickup window' : 'delivery'}.
    </p>

    <div style="margin-top:32px;padding:18px 20px;background:#ede4cc;border:1px solid #d9cfb6;">
      <div style="font-family:monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#5a524a;margin-bottom:6px;">${isPickup ? 'Pickup' : 'Delivering'}</div>
      <div style="font-family:Georgia,serif;font-size:18px;">${formatDate(order.delivery.date)}</div>
      <div style="font-size:13px;color:#5a524a;margin-top:4px;">
        ${slot ? escape(slot.label) : ''} ·
        ${isPickup ? (loc ? `from ${escape(loc.name)}, ${escape(loc.addr)}` : '') : `to ${escape(order.postcode)}`}
      </div>
      ${
        !isPickup && order.delivery.address
          ? `<div style="font-size:13px;color:#5a524a;margin-top:6px;">${escape(order.delivery.building)}${order.delivery.building ? ', ' : ''}${escape(order.delivery.address)}</div>`
          : ''
      }
      ${order.delivery.recipient ? `<div style="font-size:13px;color:#5a524a;margin-top:6px;">For: ${escape(order.delivery.recipient)}</div>` : ''}
    </div>

    <h2 style="font-family:Georgia,serif;font-weight:500;font-size:18px;margin:32px 0 12px;">Your order</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tbody>${items}</tbody>
    </table>

    <table style="width:100%;margin-top:18px;font-size:14px;color:#5a524a;">
      <tr><td style="padding:4px 0;">Subtotal</td><td style="text-align:right;color:#1c1813;">${money(order.totals.subtotal)}</td></tr>
      ${order.totals.deliveryFee > 0 ? `<tr><td style="padding:4px 0;">Delivery</td><td style="text-align:right;color:#1c1813;">${money(order.totals.deliveryFee)}</td></tr>` : ''}
      <tr><td style="padding:4px 0;">VAT (20%)</td><td style="text-align:right;color:#1c1813;">${money(order.totals.vat)}</td></tr>
      <tr><td style="padding:14px 0 0;border-top:1px solid #1c1813;font-family:Georgia,serif;font-size:20px;color:#1c1813;"><strong>Total</strong></td><td style="padding:14px 0 0;border-top:1px solid #1c1813;font-family:Georgia,serif;font-size:20px;color:#1c1813;text-align:right;">${money(order.totals.total)}</td></tr>
    </table>

    <p style="font-size:14px;line-height:1.5;color:#5a524a;margin-top:32px;">
      Need to make a change? Just reply to this email — it comes straight to our kitchen team.
    </p>
    <p style="font-family:Georgia,serif;font-style:italic;font-size:16px;color:#1c1813;margin-top:32px;">
      Thank you for choosing Mama Li.
    </p>
  `;

  return SHELL('Mama Li order confirmation', body);
}

// ─────────────────────────────────────────────────────────────
//  OPS: kitchen-team notification
// ─────────────────────────────────────────────────────────────

export function renderOpsEmail(order: OrderWithContact): string {
  const orderRef = 'ML-' + order.id.slice(0, 6).toUpperCase();
  const isPickup = order.delivery.method === 'pickup';
  const slot = TIMESLOTS.find((s) => s.id === order.delivery.slot);
  const loc = LOCATIONS.find((l) => l.id === order.delivery.pickupLocation);

  const items = order.cart
    .map(
      (it) => `
      <tr>
        <td style="padding:8px 12px;border:1px solid #d9cfb6;font-family:monospace;font-weight:bold;width:40px;">${it.qty}×</td>
        <td style="padding:8px 12px;border:1px solid #d9cfb6;">
          <strong>${escape(it.name)}</strong>
          ${it.subtitle ? `<div style="font-size:12px;color:#5a524a;margin-top:2px;">${escape(it.subtitle)}</div>` : ''}
        </td>
        <td style="padding:8px 12px;border:1px solid #d9cfb6;text-align:right;white-space:nowrap;">${money(it.price * it.qty)}</td>
      </tr>`
    )
    .join('');

  const body = `
    <h1 style="font-family:Georgia,serif;font-weight:400;font-size:24px;margin:24px 0 6px;">
      New paid order · <strong>${orderRef}</strong>
    </h1>
    <p style="font-size:14px;color:#5a524a;margin:0 0 24px;">
      Status: <strong style="color:#3a6b53;">PAID</strong> · Total <strong>${money(order.totals.total)}</strong>
    </p>

    <h2 style="font-family:Georgia,serif;font-size:16px;margin:24px 0 8px;">Customer</h2>
    <table style="width:100%;font-size:13px;">
      <tr><td style="padding:4px 0;color:#5a524a;width:140px;">Name</td><td>${escape(order.contact_name ?? '—')}</td></tr>
      <tr><td style="padding:4px 0;color:#5a524a;">Company</td><td>${escape(order.contact_company ?? '—')}</td></tr>
      <tr><td style="padding:4px 0;color:#5a524a;">Email</td><td>${escape(order.contact_email ?? '—')}</td></tr>
      <tr><td style="padding:4px 0;color:#5a524a;">Phone</td><td>${escape(order.contact_phone ?? '—')}</td></tr>
    </table>

    <h2 style="font-family:Georgia,serif;font-size:16px;margin:24px 0 8px;">${isPickup ? 'Pickup' : 'Delivery'}</h2>
    <table style="width:100%;font-size:13px;">
      <tr><td style="padding:4px 0;color:#5a524a;width:140px;">Date</td><td><strong>${formatDate(order.delivery.date)}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#5a524a;">Window</td><td><strong>${slot ? escape(slot.label) : '—'}</strong></td></tr>
      ${
        isPickup
          ? `<tr><td style="padding:4px 0;color:#5a524a;">Location</td><td>${loc ? `${escape(loc.name)} · ${escape(loc.addr)}` : '—'}</td></tr>
             <tr><td style="padding:4px 0;color:#5a524a;">Recipient</td><td>${escape(order.delivery.recipient)}</td></tr>
             <tr><td style="padding:4px 0;color:#5a524a;">Contact</td><td>${escape(order.delivery.contactPhone)}</td></tr>`
          : `<tr><td style="padding:4px 0;color:#5a524a;">Building</td><td>${escape(order.delivery.building)}</td></tr>
             <tr><td style="padding:4px 0;color:#5a524a;">Address</td><td>${escape(order.delivery.address)}, ${escape(order.postcode)}</td></tr>
             <tr><td style="padding:4px 0;color:#5a524a;">Recipient</td><td>${escape(order.delivery.recipient)}</td></tr>
             <tr><td style="padding:4px 0;color:#5a524a;">Contact</td><td>${escape(order.delivery.contactPhone)}</td></tr>`
      }
      ${order.delivery.notes ? `<tr><td style="padding:4px 0;color:#5a524a;vertical-align:top;">Notes</td><td><em>${escape(order.delivery.notes)}</em></td></tr>` : ''}
    </table>

    <h2 style="font-family:Georgia,serif;font-size:16px;margin:24px 0 8px;">Items</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tbody>${items}</tbody>
    </table>

    <table style="width:100%;margin-top:16px;font-size:13px;">
      <tr><td style="padding:3px 0;color:#5a524a;">Subtotal</td><td style="text-align:right;">${money(order.totals.subtotal)}</td></tr>
      ${order.totals.deliveryFee > 0 ? `<tr><td style="padding:3px 0;color:#5a524a;">Delivery</td><td style="text-align:right;">${money(order.totals.deliveryFee)}</td></tr>` : ''}
      <tr><td style="padding:3px 0;color:#5a524a;">VAT</td><td style="text-align:right;">${money(order.totals.vat)}</td></tr>
      <tr><td style="padding:8px 0 0;border-top:1px solid #1c1813;"><strong>Total</strong></td><td style="padding:8px 0 0;border-top:1px solid #1c1813;text-align:right;"><strong>${money(order.totals.total)}</strong></td></tr>
    </table>
  `;

  return SHELL(`New paid order ${orderRef}`, body);
}
