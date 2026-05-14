'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useOrder } from '@/components/order-context';
import { Logo, Btn, Stamp, LatticeBg, KnotMark } from '@/components/ui';
import { Footer } from '@/components/site-chrome';
import { moneyExact, fmtLongDate } from '@/lib/order';

import { isMockMode, MOCK_KEYS } from '@/lib/mock';
import type { Order, Timeslot, Location } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
//  Confirmation page — Stripe redirects here with ?session_id=
//  We poll the order endpoint until the webhook flips status to
//  'paid' (usually within 1-2 seconds), then show confirmation
//  with the order reference and details.
// ─────────────────────────────────────────────────────────────

function ConfirmationInner({
  timeslots,
  locations,
}: {
  timeslots: Timeslot[];
  locations: Location[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  const { clearCart } = useOrder();

  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'timeout'>('loading');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    // MOCK MODE: read the fake order from localStorage
    if (isMockMode()) {
      try {
        const raw = localStorage.getItem(MOCK_KEYS.lastOrder);
        if (raw) {
          const fake = JSON.parse(raw);
          if (fake.stripe_session_id === sessionId) {
            setOrder(fake);
            setStatus('ready');
            clearCart();
            return;
          }
        }
        setStatus('error');
      } catch {
        setStatus('error');
      }
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/checkout/session/${encodeURIComponent(sessionId)}`);
        if (res.ok) {
          const data: Order = await res.json();
          if (cancelled) return;
          if (data.status === 'paid') {
            setOrder(data);
            setStatus('ready');
            clearCart();
            return;
          }
        }
      } catch {
        /* retry */
      }
      if (attempts >= 10) {
        setStatus('timeout');
        return;
      }
      setTimeout(poll, 1500);
    };

    poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (status === 'loading') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
          background: 'var(--cream)',
          padding: 20,
          textAlign: 'center',
        }}
      >
        <KnotMark size={48} color="var(--accent)" />
        <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: 28, margin: 0 }}>
          Confirming your order…
        </h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--ink-soft)', maxWidth: 400 }}>
          Just a moment — we&apos;re finalising your booking with our kitchen.
        </p>
      </div>
    );
  }

  if (status === 'error' || status === 'timeout') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
          background: 'var(--cream)',
          padding: 20,
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: 28, margin: 0 }}>
          We&apos;re still processing your payment.
        </h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', color: 'var(--ink-soft)', maxWidth: 460 }}>
          Your card may have been charged. You&apos;ll receive a confirmation email shortly. If you don&apos;t
          hear from us within an hour, please contact{' '}
          <a href="mailto:orders@mamali.co.uk" style={{ color: 'var(--ink)' }}>
            orders@mamali.co.uk
          </a>
          .
        </p>
        <Btn variant="primary" size="md" onClick={() => router.push('/menu')}>
          Back to menu
        </Btn>
      </div>
    );
  }

  if (!order) return null;

  const slot = timeslots.find((s) => s.id === order.delivery.slot);
  const isPickup = order.delivery.method === 'pickup';
  const loc = locations.find((l) => l.id === order.delivery.pickupLocation);
  const dateObj = order.delivery.date ? new Date(order.delivery.date + 'T00:00:00') : null;
  const orderRef = 'ML-' + order.id.slice(0, 6).toUpperCase();

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px clamp(20px, 5vw, 60px)',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <Logo size={26} />
        <a
          href="mailto:orders@mamali.co.uk"
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14,
            color: 'var(--ink)',
            textDecoration: 'none',
          }}
        >
          orders@mamali.co.uk
        </a>
      </header>

      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: 'clamp(40px, 6vw, 80px) clamp(20px, 5vw, 60px)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
          gap: 60,
          alignItems: 'flex-start',
        }}
        className="confirm-body"
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--jade)',
              marginBottom: 18,
            }}
          >
            ✓ Order confirmed
          </div>
          <h1
            style={{
              fontFamily: 'Newsreader, serif',
              fontWeight: 400,
              fontSize: 'clamp(40px, 5vw, 64px)',
              lineHeight: 1,
              letterSpacing: '-0.025em',
              margin: 0,
              color: 'var(--ink)',
            }}
          >
            Thanks — your order is <em style={{ color: 'var(--accent)' }}>in the kitchen.</em>
          </h1>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 16,
              lineHeight: 1.6,
              color: 'var(--ink-soft)',
              marginTop: 22,
              maxWidth: 560,
            }}
          >
            We&apos;ve sent a confirmation to your inbox. Our kitchen will prep everything fresh on the day,
            and our driver will call about 15 minutes before {isPickup ? 'your pickup window' : 'delivery'}.
          </p>

          <div
            style={{
              marginTop: 32,
              padding: '20px 24px',
              background: 'var(--paper-deep)',
              border: '1px solid var(--rule)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 24,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-soft)',
                  marginBottom: 6,
                }}
              >
                Order ref
              </div>
              <div style={{ fontFamily: 'Newsreader, serif', fontSize: 22 }}>{orderRef}</div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-soft)',
                  marginBottom: 6,
                }}
              >
                {isPickup ? 'Pickup' : 'Delivering'}
              </div>
              <div style={{ fontFamily: 'Newsreader, serif', fontSize: 16 }}>
                {dateObj ? fmtLongDate(dateObj) : '—'}
              </div>
              <div
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 13,
                  color: 'var(--ink-soft)',
                  marginTop: 2,
                }}
              >
                {slot ? slot.label : '—'} ·{' '}
                {isPickup ? (loc ? loc.name : '—') : `to ${order.postcode}`}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-soft)',
                  marginBottom: 6,
                }}
              >
                Total
              </div>
              <div style={{ fontFamily: 'Newsreader, serif', fontSize: 22 }}>
                {moneyExact(order.totals.total)}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 36 }}>
            <h3
              style={{
                fontFamily: 'Newsreader, serif',
                fontSize: 22,
                fontWeight: 500,
                margin: 0,
                marginBottom: 12,
              }}
            >
              Your order
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {order.cart.map((it) => (
                <li
                  key={it.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 14,
                    padding: '12px 0',
                    borderBottom: '1px dashed var(--rule)',
                  }}
                >
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--ink-soft)' }}>
                    {it.qty}×
                  </span>
                  <div>
                    <div style={{ fontFamily: 'Newsreader, serif', fontSize: 16 }}>{it.name}</div>
                    {it.subtitle && (
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--ink-soft)' }}>
                        {it.subtitle}
                      </div>
                    )}
                  </div>
                  <span style={{ fontFamily: 'Newsreader, serif', fontSize: 16 }}>
                    {moneyExact(it.price * it.qty)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: 36, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Btn variant="primary" size="md" onClick={() => router.push('/menu')}>
              Place another order
            </Btn>
            <Btn variant="ghost" size="md" onClick={() => window.print()}>
              Print receipt
            </Btn>
          </div>
        </div>

        <aside
          className="desktop-only"
          style={{
            background: 'var(--accent)',
            color: 'var(--cream)',
            padding: 40,
            position: 'relative',
            overflow: 'hidden',
            minHeight: 440,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <LatticeBg color="var(--cream)" opacity={0.05} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <KnotMark size={48} color="var(--gold)" />
            <div
              style={{
                fontFamily: 'Newsreader, serif',
                fontStyle: 'italic',
                fontSize: 26,
                lineHeight: 1.3,
                marginTop: 32,
                maxWidth: 360,
              }}
            >
              We&apos;ll see you on the day. If anything changes, just reply to your confirmation email — it
              comes straight to our kitchen.
            </div>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                marginTop: 22,
                opacity: 0.75,
              }}
            >
              — Mama Li Corporate team
            </div>
          </div>
          <div style={{ position: 'absolute', right: -40, top: '36%', opacity: 0.18, zIndex: 0 }}>
            <Stamp color="var(--cream)" size={220}>
              Order
              <br />
              Confirmed
            </Stamp>
          </div>
        </aside>
      </div>

      <Footer />

      <style jsx>{`
        @media (max-width: 900px) {
          .confirm-body {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function ConfirmationClient({
  timeslots,
  locations,
}: {
  timeslots: Timeslot[];
  locations: Location[];
}) {
  return (
    <Suspense fallback={null}>
      <ConfirmationInner timeslots={timeslots} locations={locations} />
    </Suspense>
  );
}
