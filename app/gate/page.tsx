'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrder } from '@/components/order-context';
import { Logo, Stamp } from '@/components/ui';

// ─────────────────────────────────────────────────────────────
//  Postcode gate — first screen of the flow. Validates against
//  postcodes.io and the EC1–EC4 allowlist. On pass, stores the
//  postcode in OrderContext and navigates to /auth.
// ─────────────────────────────────────────────────────────────

export default function GatePage() {
  const router = useRouter();
  const { postcode: existingPostcode, setPostcode } = useOrder();

  const [pc, setPc] = useState(existingPostcode);
  const [err, setErr] = useState('');
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const fail = (msg: string) => {
    setErr(msg);
    setShake(true);
    setChecking(false);
    setTimeout(() => setShake(false), 400);
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = pc.trim().toUpperCase().replace(/\s+/g, ' ');
    if (!/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/.test(trimmed)) {
      return fail("That doesn't look like a UK postcode — try again.");
    }
    setErr('');
    setChecking(true);
    try {
      const res = await fetch(
        'https://api.postcodes.io/postcodes/' + encodeURIComponent(trimmed)
      );
      if (!res.ok) {
        return fail("We couldn't find that postcode. Double-check and try again?");
      }
      const data = await res.json();
      const outcode: string | undefined = data.result?.outcode;
      if (!outcode || !/^EC[1-4]/i.test(outcode)) {
        return fail(
          `We don't deliver to ${outcode || trimmed} yet — we only cover the Square Mile (EC1–EC4).`
        );
      }
      const validated: string = data.result.postcode;
      setPostcode(validated);
      router.push('/auth');
    } catch (err) {
      console.warn('postcodes.io check failed, falling back:', err);
      if (/^EC[1-4]/i.test(trimmed)) {
        setPostcode(trimmed);
        router.push('/auth');
      } else {
        fail("That's not an EC postcode — we only cover the Square Mile.");
      }
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--cream)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        position: 'relative',
      }}
      className="gate"
    >
      {/* Left — visual */}
      <div
        className="desktop-only"
        style={{
          background: 'var(--jade)',
          color: 'var(--cream)',
          padding: '48px 60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Logo size={28} mono />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              opacity: 0.7,
            }}
          >
            — Corporate Catering
          </span>
          <h1
            style={{
              fontFamily: 'Newsreader, serif',
              fontWeight: 400,
              fontStyle: 'italic',
              fontSize: 'clamp(48px, 6vw, 88px)',
              lineHeight: 0.95,
              letterSpacing: '-0.025em',
              margin: '18px 0 24px',
            }}
          >
            From&nbsp;our<br />kitchen<br />to&nbsp;your<br />boardroom.
          </h1>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 16,
              lineHeight: 1.6,
              maxWidth: 380,
              opacity: 0.82,
              margin: 0,
            }}
          >
            Hong Kong–style siu mei, family-style platters and proper working lunches —
            delivered to offices across the Square Mile.
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 32,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            opacity: 0.6,
          }}
        >
          <span>Est. 2019</span>
          <span>燒臘 · Siu Mei</span>
          <span>London EC</span>
        </div>

        <div style={{ position: 'absolute', right: -40, top: '38%', opacity: 0.18 }}>
          <Stamp color="var(--cream)" size={260}>
            Min. £250<br />Order
          </Stamp>
        </div>
      </div>

      {/* Right — form (full-width on mobile) */}
      <div
        style={{
          padding: 'clamp(28px, 5vw, 48px) clamp(20px, 5vw, 60px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '100vh',
          gridColumn: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
          }}
        >
          <span className="mobile-only">
            <Logo size={22} />
          </span>
          <span>Step 01 / 03 — Where to?</span>
        </div>

        <div style={{ maxWidth: 460, width: '100%' }}>
          <h2
            style={{
              fontFamily: 'Newsreader, serif',
              fontWeight: 400,
              fontSize: 'clamp(28px, 3vw, 40px)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              margin: 0,
              color: 'var(--ink)',
            }}
          >
            Let's check if we deliver to your office.
          </h2>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 15,
              lineHeight: 1.6,
              color: 'var(--ink-soft)',
              marginTop: 14,
            }}
          >
            We currently deliver across the City of London — EC1, EC2, EC3 and EC4. Pop in your
            postcode below and we'll get you to the menu.
          </p>

          <form
            onSubmit={submit}
            className={shake ? 'shake' : ''}
            style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <label
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--ink-soft)',
              }}
            >
              Office postcode
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 0,
                border: '1px solid var(--ink)',
                borderRadius: 2,
              }}
            >
              <input
                ref={inputRef}
                value={pc}
                onChange={(e) => {
                  setPc(e.target.value);
                  setErr('');
                }}
                placeholder="e.g. EC2M 5TE"
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  padding: '16px 18px',
                  fontFamily: 'Newsreader, serif',
                  fontSize: 22,
                  letterSpacing: '0.03em',
                  color: 'var(--ink)',
                  textTransform: 'uppercase',
                  minWidth: 0,
                }}
              />
              <button
                type="submit"
                disabled={checking}
                style={{
                  background: 'var(--ink)',
                  color: 'var(--cream)',
                  border: 'none',
                  padding: '0 28px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 500,
                  fontSize: 14,
                  letterSpacing: '0.04em',
                  cursor: checking ? 'wait' : 'pointer',
                  opacity: checking ? 0.7 : 1,
                }}
              >
                {checking ? 'Checking…' : 'Check →'}
              </button>
            </div>
            <div
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13,
                color: err ? 'var(--alert)' : 'var(--ink-soft)',
                minHeight: 18,
              }}
            >
              {err || 'We deliver Monday–Friday, 11am–4pm.'}
            </div>
          </form>

          <div
            style={{
              marginTop: 40,
              padding: '20px 22px',
              background: 'oklch(0.92 0.02 80)',
              borderLeft: '3px solid var(--accent)',
            }}
          >
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                marginBottom: 8,
              }}
            >
              The fine print
            </div>
            <ul
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13.5,
                lineHeight: 1.7,
                color: 'var(--ink)',
                margin: 0,
                paddingLeft: 18,
              }}
            >
              <li>£250 minimum spend, excl. VAT</li>
              <li>Two working days' notice — no same-day, sorry</li>
              <li>Delivery in two-hour windows, 8am–4pm Mon–Fri</li>
            </ul>
          </div>
        </div>

        <div
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>orders@mamali.co.uk</span>
          <span>+44 20 7946 0000</span>
        </div>
      </div>
    </div>
  );
}
