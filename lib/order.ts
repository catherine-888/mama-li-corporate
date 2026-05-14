import type { CartItem, OrderTotals } from './types';
import { VAT_RATE, DELIVERY_FEE } from './menu';

// ─────────────────────────────────────────────────────────────
//  Pure helpers for cart math, currency formatting, and date
//  arithmetic. No React, no DOM — safe to use from server code.
// ─────────────────────────────────────────────────────────────

export function calcSubtotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

export function calcTotals(cart: CartItem[], method: 'delivery' | 'pickup'): OrderTotals {
  const subtotal = calcSubtotal(cart);
  const deliveryFee = method === 'pickup' ? 0 : DELIVERY_FEE;
  const vat = (subtotal + deliveryFee) * VAT_RATE;
  const total = subtotal + deliveryFee + vat;
  return { subtotal, deliveryFee, vat, total };
}

export function money(n: number): string {
  return '£' + n.toFixed(2).replace(/\.00$/, '');
}

export function moneyExact(n: number): string {
  return '£' + n.toFixed(2);
}

// Earliest delivery date: 2 working days from now, weekends skipped.
export function getEarliestDate(): Date {
  const d = new Date();
  let added = 0;
  while (added < 2) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
}

export function buildDates(start: Date, count = 14): Date[] {
  const out: Date[] = [];
  const cur = new Date(start);
  while (out.length < count) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function fmtLongDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Postcode check — matches "EC2M 5TE", "EC2", "EC2M", etc. Allowed
// areas are EC1–EC4. Tightens if the input is gibberish.
export function postcodeAllowed(raw: string, allowed: string[]): boolean {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z]{1,2}\d[A-Z\d]?/.test(cleaned)) return false;
  return allowed.some((area) => cleaned.startsWith(area));
}
