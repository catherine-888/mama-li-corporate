'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOrder } from '@/components/order-context';
import { NavBar, Footer } from '@/components/site-chrome';
import { Btn, Tag } from '@/components/ui';
import { moneyExact } from '@/lib/order';
import type { CustomerOrder } from '@/lib/customer-orders';
import type { AccountUser } from '@/lib/customer-auth';
import type { SiteSettings } from '@/lib/content';

// ─────────────────────────────────────────────────────────────
//  Account / order history page. Shows a list of the customer's
//  past orders with a re-order button and a link to manage saved
//  addresses.
// ─────────────────────────────────────────────────────────────

export default function AccountClient({
  user,
  orders,
  settings,
}: {
  user: AccountUser;
  orders: CustomerOrder[];
  settings: SiteSettings;
}) {
  const router = useRouter();
  const { postcode, addToCart } = useOrder();

  const reorder = (order: CustomerOrder) => {
    // Drop all items from the order back into the cart, then go to checkout.
    for (const item of order.cart) {
      addToCart(item);
    }
    router.push('/menu');
  };

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <NavBar postcode={postcode} onChangePostcode={() => router.push('/gate')} onCart={() => router.push('/menu')} cartCount={0} showSignIn={false} />

      <main
        style={{
          padding: 'clamp(32px, 5vw, 60px) clamp(20px, 5vw, 60px)',
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 32,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                marginBottom: 14,
              }}
            >
              — Your account
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 400,
                fontSize: 'clamp(34px, 5vw, 52px)',
                lineHeight: 1,
                letterSpacing: '-0.025em',
                margin: 0,
                color: 'var(--ink)',
              }}
            >
              Welcome back.
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 15,
                color: 'var(--ink-soft)',
                marginTop: 12,
              }}
            >
              Signed in as <strong style={{ color: 'var(--ink)' }}>{user.email}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Btn variant="secondary" onClick={() => router.push('/account/addresses')}>
              Saved addresses
            </Btn>
            <Btn variant="accent" onClick={() => router.push('/menu')}>
              New order →
            </Btn>
          </div>
        </header>

        <section>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 500,
              fontSize: 22,
              margin: '0 0 18px',
              color: 'var(--ink)',
            }}
          >
            Order history
          </h2>

          {orders.length === 0 ? (
            <div
              style={{
                background: 'var(--paper-deep)',
                border: '1px dashed var(--rule)',
                padding: '40px 24px',
                textAlign: 'center',
                color: 'var(--ink-soft)',
              }}
            >
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)', margin: 0 }}>
                No orders yet.
              </p>
              <p style={{ fontSize: 13, margin: '8px 0 18px' }}>Your first order is waiting in the menu.</p>
              <Btn variant="primary" onClick={() => router.push('/menu')}>
                See the menu →
              </Btn>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {orders.map((order) => {
                const ref = 'ML-' + order.id.slice(0, 6).toUpperCase();
                const itemCount = order.cart.reduce((s, c) => s + c.qty, 0);
                const dateStr = new Date(order.created_at).toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                return (
                  <article
                    key={order.id}
                    style={{
                      background: 'var(--paper-deep)',
                      border: '1px solid var(--rule)',
                      padding: '18px 22px',
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      gap: 16,
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Link
                          href={`/account/orders/${encodeURIComponent(order.id)}`}
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: 19,
                            color: 'var(--ink)',
                            textDecoration: 'none',
                          }}
                        >
                          {ref}
                        </Link>
                        <Tag tone={order.status === 'paid' ? 'jade' : order.status === 'pending' ? 'gold' : 'accent'}>
                          {order.status}
                        </Tag>
                        <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{dateStr}</span>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-soft)' }}>
                        {itemCount} {itemCount === 1 ? 'item' : 'items'} ·{' '}
                        {order.cart
                          .slice(0, 2)
                          .map((c) => c.name)
                          .join(', ')}
                        {order.cart.length > 2 && ` and ${order.cart.length - 2} more`}
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: 20,
                            color: 'var(--ink)',
                          }}
                        >
                          {moneyExact(order.totals.total)}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                          Inc. VAT
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <Btn variant="secondary" size="md" onClick={() => router.push(`/account/orders/${encodeURIComponent(order.id)}`)}>
                          Details
                        </Btn>
                        {order.status === 'paid' && (
                          <Btn variant="primary" size="md" onClick={() => reorder(order)}>
                            Re-order
                          </Btn>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
