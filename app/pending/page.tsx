'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { Logo, Btn, Stamp, LatticeBg, KnotMark, PulseDot } from '@/components/ui';

// ─────────────────────────────────────────────────────────────
//  Pending verification screen. The user has applied; they're
//  parked here until ops approves the account. After approval
//  they receive an email with a magic-link to sign in.
//
//  The "Approve account" preview button from the prototype is
//  removed — approval happens in the Supabase dashboard.
// ─────────────────────────────────────────────────────────────

function PendingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const name = params.get('name') ?? '';

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
        <button
          onClick={() => router.push('/gate')}
          style={{
            background: 'transparent',
            border: 'none',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14,
            color: 'var(--ink)',
            cursor: 'pointer',
          }}
        >
          Sign out →
        </button>
      </header>

      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: 'clamp(40px, 8vw, 80px) clamp(20px, 5vw, 60px)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
          gap: 60,
          alignItems: 'center',
        }}
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
              color: 'var(--gold)',
              marginBottom: 18,
            }}
          >
            <PulseDot color="var(--gold)" />
            Verification in progress
          </div>
          <h1
            style={{
              fontFamily: 'Newsreader, serif',
              fontWeight: 400,
              fontSize: 'clamp(40px, 5vw, 68px)',
              lineHeight: 1,
              letterSpacing: '-0.025em',
              margin: 0,
              color: 'var(--ink)',
            }}
          >
            Thanks {name?.split(' ')[0] || 'there'} — we've got your{' '}
            <em style={{ color: 'var(--accent)' }}>application.</em>
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
            One of our team will check your details and approve the account within{' '}
            <strong style={{ color: 'var(--ink)' }}>one working day</strong>. We'll send a welcome
            email to <strong style={{ color: 'var(--ink)' }}>{email || 'your work email'}</strong>{' '}
            with your sign-in link and a £20 starter credit for the first order.
          </p>

          <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { state: 'done', t: 'Application received', s: 'Just now' },
              { state: 'current', t: 'Manual review by the Mama Li team', s: 'Within 1 working day' },
              { state: 'pending', t: 'Welcome email + sign-in link sent', s: 'After approval' },
              { state: 'pending', t: 'Place your first corporate order', s: 'Once you sign in' },
            ].map((s, i, arr) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 1fr',
                  gap: 14,
                  alignItems: 'flex-start',
                  paddingBottom: 20,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background:
                      s.state === 'done'
                        ? 'var(--jade)'
                        : s.state === 'current'
                          ? 'var(--gold)'
                          : 'var(--paper-deep)',
                    color: s.state === 'pending' ? 'var(--ink-soft)' : 'var(--cream)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Newsreader, serif',
                    fontSize: 14,
                    flexShrink: 0,
                    zIndex: 1,
                  }}
                >
                  {s.state === 'done' ? '✓' : i + 1}
                </div>
                {i < arr.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 28,
                      left: 13,
                      bottom: -4,
                      width: 2,
                      background: 'var(--rule)',
                    }}
                  />
                )}
                <div style={{ paddingTop: 2 }}>
                  <div
                    style={{
                      fontFamily: 'Newsreader, serif',
                      fontSize: 19,
                      color: s.state === 'pending' ? 'var(--ink-soft)' : 'var(--ink)',
                    }}
                  >
                    {s.t}
                  </div>
                  <div
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 13,
                      color: 'var(--ink-soft)',
                      marginTop: 2,
                    }}
                  >
                    {s.s}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
            <Btn variant="ghost" size="md" onClick={() => router.push('/gate')}>
              ← Back to mamali.co.uk
            </Btn>
          </div>
        </div>

        {/* Visual side */}
        <div
          className="desktop-only"
          style={{
            background: 'var(--accent)',
            color: 'var(--cream)',
            padding: 40,
            position: 'relative',
            overflow: 'hidden',
            minHeight: 460,
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
                fontSize: 28,
                lineHeight: 1.3,
                marginTop: 32,
                maxWidth: 360,
              }}
            >
              "Thank you for trusting us with your team's lunch. We take the same care with
              corporate orders as we do with the restaurant — every box leaves our kitchen the same
              day."
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
              — Catherine Hua, founder
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              opacity: 0.6,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <span>家 · Family</span>
            <span>20+ Years</span>
            <span>Hong Kong</span>
          </div>
          <div style={{ position: 'absolute', right: -40, top: '36%', opacity: 0.18, zIndex: 0 }}>
            <Stamp color="var(--cream)" size={220}>
              Pending
              <br />
              Review
              <br />— 1 day
            </Stamp>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PendingPage() {
  return (
    <Suspense fallback={null}>
      <PendingInner />
    </Suspense>
  );
}
