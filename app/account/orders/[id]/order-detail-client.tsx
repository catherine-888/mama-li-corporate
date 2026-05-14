'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOrder } from '@/components/order-context';
import { NavBar, Footer } from '@/components/site-chrome';
import { Btn, Tag } from '@/components/ui';
import { moneyExact, fmtLongDate } from '@/lib/order';
import type { CustomerOrder } from '@/lib/customer-orders';
import type { Timeslot, Location } from '@/lib/types';

export default function OrderDetailClient({
  order,
  timeslots,
  locations,
}: {
  order: CustomerOrder;
  timeslots: Timeslot[];
  locations: Location[];
}) {
  const router = useRouter();
  const { postcode, addToCart } = useOrder();

  const slot = timeslots.find((s) => s.id === order.delivery.slot);
  const loc = locations.find((l) => l.id === order.delivery.pickupLocation);
  const ref = 'ML-' + order.id.slice(0, 6).toUpperCase();
  const isPickup = order.delivery.method === 'pickup';

  const reorder = () => {
    for (const item of order.cart) {
      addToCart(item);
    }
    router.push('/menu');
  };

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <NavBar
        postcode={postcode}
        onChangePostcode={() => router.push('/gate')}
        onCart={() => router.push('/menu')}
        cartCount={0}
        showSignIn={false}
      />

      <main
        style={{
          padding: 'clamp(32px, 5vw, 60px) clamp(20px, 5vw, 60px)',
          maxWidth: 920,
          margin: '0 auto',
        }}
      >
        <Link
          href="/account"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
            textDecoration: 'none',
          }}
        >
          ← Back to orders
        </Link>

        <header style={{ marginTop: 18, marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 400,
                fontSize: 'clamp(32px, 5vw, 48px)',
                lineHeight: 1,
                letterSpacing: '-0.025em',
                margin: 0,
                color: 'var(--ink)',
              }}
            >
              {ref}
            </h1>
            <Tag tone={order.status === 'paid' ? 'jade' : order.status === 'pending' ? 'gold' : 'accent'}>
              {order.status}
            </Tag>
          </div>
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              color: 'var(--ink-soft)',
              marginTop: 8,
            }}
          >
            Placed{' '}
            {new Date(order.created_at).toLocaleString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </header>

        <StatusTimeline status={order.status} />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
            gap: 24,
            marginTop: 28,
          }}
          className="detail-grid"
        >
          <section>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 500,
                fontSize: 19,
                margin: '0 0 14px',
                color: 'var(--ink)',
              }}
            >
              Items
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <tbody>
                {order.cart.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px dashed var(--rule)' }}>
                    <td
                      style={{
                        padding: '12px 0',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        color: 'var(--ink-soft)',
                        width: 40,
                        verticalAlign: 'top',
                      }}
                    >
                      {c.qty}×
                    </td>
                    <td style={{ padding: '12px 6px', verticalAlign: 'top' }}>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--ink)' }}>
                        {c.name}
                      </div>
                      {c.subtitle && (
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                          {c.subtitle}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        padding: '12px 0',
                        textAlign: 'right',
                        fontFamily: 'var(--font-serif)',
                        fontSize: 16,
                        verticalAlign: 'top',
                      }}
                    >
                      {moneyExact(c.price * c.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table style={{ width: '100%', marginTop: 20, fontSize: 13 }}>
              <tbody>
                <tr>
                  <td style={{ color: 'var(--ink-soft)', padding: '4px 0' }}>Subtotal</td>
                  <td style={{ textAlign: 'right', padding: '4px 0' }}>
                    {moneyExact(order.totals.subtotal)}
                  </td>
                </tr>
                {order.totals.deliveryFee > 0 && (
                  <tr>
                    <td style={{ color: 'var(--ink-soft)', padding: '4px 0' }}>Delivery</td>
                    <td style={{ textAlign: 'right', padding: '4px 0' }}>
                      {moneyExact(order.totals.deliveryFee)}
                    </td>
                  </tr>
                )}
                <tr>
                  <td style={{ color: 'var(--ink-soft)', padding: '4px 0' }}>VAT (20%)</td>
                  <td style={{ textAlign: 'right', padding: '4px 0' }}>{moneyExact(order.totals.vat)}</td>
                </tr>
                <tr>
                  <td
                    style={{
                      paddingTop: 10,
                      borderTop: '1px solid var(--ink)',
                      fontFamily: 'var(--font-serif)',
                      fontSize: 18,
                    }}
                  >
                    Total
                  </td>
                  <td
                    style={{
                      paddingTop: 10,
                      borderTop: '1px solid var(--ink)',
                      textAlign: 'right',
                      fontFamily: 'var(--font-serif)',
                      fontSize: 18,
                    }}
                  >
                    {moneyExact(order.totals.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <aside
            style={{
              background: 'var(--paper-deep)',
              border: '1px solid var(--rule)',
              padding: 22,
              alignSelf: 'start',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--ink-soft)',
                marginBottom: 6,
              }}
            >
              {isPickup ? 'Pickup' : 'Delivery'}
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)' }}>
              {fmtLongDate(new Date(order.delivery.date + 'T00:00:00'))}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
              {slot?.label ?? order.delivery.slot}
            </div>

            <div style={{ borderTop: '1px solid var(--rule)', marginTop: 16, paddingTop: 14, fontSize: 13 }}>
              {isPickup ? (
                <>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--ink)' }}>
                    {loc?.name ?? 'Pickup location'}
                  </div>
                  {loc?.addr && (
                    <div style={{ color: 'var(--ink-soft)', marginTop: 2 }}>{loc.addr}</div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--ink)' }}>
                    {order.delivery.recipient || '—'}
                  </div>
                  <div style={{ color: 'var(--ink-soft)', marginTop: 2 }}>
                    {order.delivery.building && <div>{order.delivery.building}</div>}
                    {order.delivery.address && <div>{order.delivery.address}</div>}
                    <div>{order.postcode}</div>
                  </div>
                  {order.delivery.contactPhone && (
                    <div style={{ color: 'var(--ink-soft)', marginTop: 6 }}>
                      ☎ {order.delivery.contactPhone}
                    </div>
                  )}
                  {order.delivery.notes && (
                    <div
                      style={{
                        marginTop: 12,
                        fontStyle: 'italic',
                        color: 'var(--ink-soft)',
                        fontSize: 12,
                      }}
                    >
                      &ldquo;{order.delivery.notes}&rdquo;
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {order.status === 'paid' && (
                <Btn variant="accent" size="lg" onClick={reorder}>
                  Re-order these items →
                </Btn>
              )}
              <Link
                href={`/account/orders/${order.id}/print`}
                style={{
                  display: 'inline-block',
                  textAlign: 'center',
                  padding: '10px 16px',
                  border: '1px solid var(--rule)',
                  borderRadius: 2,
                  fontSize: 13,
                  color: 'var(--ink)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Print invoice →
              </Link>
              <a
                href={`mailto:orders@mamali.co.uk?subject=Order%20${encodeURIComponent(ref)}`}
                style={{
                  display: 'inline-block',
                  textAlign: 'center',
                  padding: '6px 16px',
                  fontSize: 12,
                  color: 'var(--ink-soft)',
                  textDecoration: 'underline',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Need help? Email us
              </a>
            </div>
          </aside>
        </div>

        <style jsx>{`
          @media (max-width: 760px) {
            .detail-grid {
              grid-template-columns: minmax(0, 1fr) !important;
            }
          }
        `}</style>
      </main>

      <Footer />
    </div>
  );
}

// Status timeline. Production only has paid / pending / cancelled / failed,
// but customers benefit from seeing the progression. Map "paid" → "confirmed"
// and step through the kitchen workflow. (In a future iteration, the order
// state machine in the DB can include real preparing/out_for_delivery states.)
function StatusTimeline({ status }: { status: 'pending' | 'paid' | 'cancelled' | 'failed' }) {
  if (status === 'cancelled' || status === 'failed') {
    return (
      <div
        style={{
          padding: '16px 22px',
          background: 'oklch(0.96 0.02 30)',
          border: '1px solid oklch(0.84 0.06 30)',
          fontSize: 14,
          color: 'var(--alert)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          fontFamily: 'var(--font-sans)',
        }}
      >
        <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16 }}>ⓘ</span>
        This order {status === 'failed' ? 'failed to process' : 'was cancelled'}. Email{' '}
        <a href="mailto:orders@mamali.co.uk" style={{ color: 'var(--alert)' }}>
          orders@mamali.co.uk
        </a>{' '}
        for any queries.
      </div>
    );
  }

  const steps = [
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'preparing', label: 'In the kitchen' },
    { id: 'out', label: 'Out for delivery' },
    { id: 'delivered', label: 'Delivered' },
  ];
  // Pending = before confirmed; paid = at confirmed (we don't yet track the rest).
  const currentIdx = status === 'pending' ? -1 : 0;

  return (
    <div
      style={{
        background: 'var(--paper-deep)',
        border: '1px solid var(--rule)',
        padding: '20px 22px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        position: 'relative',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 38,
          right: 38,
          top: 33,
          height: 2,
          background: 'var(--rule)',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 38,
          width: `calc((100% - 76px) * ${Math.max(0, currentIdx) / 3})`,
          top: 33,
          height: 2,
          background: 'var(--jade)',
        }}
      />
      {steps.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div
            key={s.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: done ? 'var(--jade)' : active ? 'var(--accent)' : 'var(--cream)',
                border: `2px solid ${done || active ? 'var(--accent)' : 'var(--rule)'}`,
                color: done || active ? 'var(--cream)' : 'var(--ink-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                zIndex: 1,
              }}
            >
              {done ? '✓' : i + 1}
            </span>
            <span
              style={{
                marginTop: 10,
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                color: active ? 'var(--ink)' : 'var(--ink-soft)',
                fontWeight: active ? 500 : 400,
                textAlign: 'center',
              }}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
