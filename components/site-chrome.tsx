'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui';

// ─────────────────────────────────────────────────────────────
//  Site nav bar + footer. Used on landing, menu, checkout, and
//  confirmation pages. Cart count is read from OrderContext by
//  callers and passed in.
// ─────────────────────────────────────────────────────────────

export function NavBar({
  postcode,
  cartCount = 0,
  onCart,
  onChangePostcode,
  showSignIn = true,
}: {
  postcode?: string;
  cartCount?: number;
  onCart?: () => void;
  onChangePostcode?: () => void;
  showSignIn?: boolean;
}) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px clamp(20px, 5vw, 60px)',
        borderBottom: '1px solid var(--rule)',
        background: 'var(--cream)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <Link href="/menu" style={{ textDecoration: 'none' }}>
        <Logo size={26} />
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        {postcode && (
          <button
            onClick={onChangePostcode}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ink-soft)',
              background: 'transparent',
              border: '1px solid var(--rule)',
              padding: '8px 12px',
              borderRadius: 2,
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                background: 'var(--jade)',
                borderRadius: '50%',
                display: 'inline-block',
              }}
            />
            {postcode}
          </button>
        )}
        {showSignIn && (
          <Link
            href="/auth"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 14,
              color: 'var(--ink)',
              textDecoration: 'none',
            }}
          >
            Sign in
          </Link>
        )}
        {!showSignIn && (
          <Link
            href="/account"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 14,
              color: 'var(--ink)',
              textDecoration: 'none',
            }}
          >
            Account
          </Link>
        )}
        {onCart && (
          <button
            onClick={onCart}
            style={{
              background: 'var(--ink)',
              color: 'var(--cream)',
              border: 'none',
              padding: '10px 18px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13,
              cursor: 'pointer',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            Basket
            <span
              style={{
                background: 'var(--cream)',
                color: 'var(--ink)',
                fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace',
                padding: '2px 6px',
                borderRadius: 2,
              }}
            >
              {cartCount || 0}
            </span>
          </button>
        )}
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer
      style={{
        background: 'var(--ink)',
        color: 'var(--cream)',
        padding: '60px clamp(20px, 5vw, 60px) 28px',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 40,
        }}
      >
        <div>
          <Logo size={28} mono />
          <p
            style={{
              fontFamily: 'Newsreader, serif',
              fontStyle: 'italic',
              fontSize: 18,
              lineHeight: 1.4,
              opacity: 0.7,
              maxWidth: 320,
              marginTop: 24,
            }}
          >
            From Hong Kong to London, with love. Family-run, twenty-plus years in roasted
            Cantonese meats.
          </p>
        </div>
        {[
          { h: 'Corporate', l: ['Bundles', 'À la carte', 'Recurring orders', 'Bespoke events'] },
          { h: 'Visit', l: ['London Wall · EC2', 'Tower Hill · EC3', 'Canary Wharf · E14'] },
          { h: 'Contact', l: ['hello@mamali.co.uk', 'orders@mamali.co.uk', '+44 20 7946 0000'] },
        ].map((c) => (
          <div key={c.h}>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                opacity: 0.55,
                marginBottom: 16,
              }}
            >
              {c.h}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {c.l.map((x) => (
                <li key={x} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, opacity: 0.85 }}>
                  {x}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div
        style={{
          maxWidth: 1280,
          margin: '40px auto 0',
          paddingTop: 24,
          borderTop: '1px solid rgba(245,238,220,0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          opacity: 0.55,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <span>© 2026 Mama Li Catering Ltd · No. 11879302</span>
        <span>燒臘 · Made with care in EC2</span>
      </div>
    </footer>
  );
}
