'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrder } from '@/components/order-context';
import { Logo, Btn, Stamp, LatticeBg, KnotMark } from '@/components/ui';
import { createClient } from '@/lib/supabase-browser';
import { isMockMode, MOCK_USER, MOCK_KEYS } from '@/lib/mock';

// ─────────────────────────────────────────────────────────────
//  Auth page — magic-link sign-in for existing accounts, and
//  application form for new corporate accounts (pending review).
//
//  Magic-link flow:
//   1) User enters email → /api/auth/sign-in sends magic link
//   2) Email contains a link → /api/auth/callback?code=…
//   3) Callback sets the cookie session, redirects to /menu
//
//  Sign-up flow:
//   1) User fills application form
//   2) POST /api/auth/apply creates a row in `account_applications`
//      with status='pending'
//   3) User is redirected to /pending
//   4) Mama Li ops team reviews in Supabase and clicks "approve"
//      which inserts a row into `auth.users` and flips status='verified'
//   5) Approved user receives magic link → can now sign in
// ─────────────────────────────────────────────────────────────

export default function AuthPage() {
  const router = useRouter();
  const { postcode } = useOrder();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Guard: must have completed gate first
  if (!postcode) {
    if (typeof window !== 'undefined') router.replace('/gate');
    return null;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--cream)',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 0.85fr) minmax(0, 1fr)',
      }}
    >
      <AuthAside postcode={postcode} mode={mode} onChangePostcode={() => router.push('/gate')} />
      <div
        style={{
          padding: 'clamp(28px, 5vw, 48px) clamp(20px, 5vw, 60px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
          }}
        >
          Step 02 / 03 — Your corporate account
        </div>
        <div style={{ maxWidth: 480, width: '100%' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: 2,
              background: 'var(--paper-deep)',
              borderRadius: 999,
              marginBottom: 32,
            }}
          >
            {[
              { id: 'signin' as const, l: 'Sign in' },
              { id: 'signup' as const, l: 'New account' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  background: mode === m.id ? 'var(--ink)' : 'transparent',
                  color: mode === m.id ? 'var(--cream)' : 'var(--ink)',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: 999,
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {m.l}
              </button>
            ))}
          </div>
          {mode === 'signin' ? (
            <SignInForm switchTo={() => setMode('signup')} />
          ) : (
            <SignUpForm switchTo={() => setMode('signin')} />
          )}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
            marginTop: 28,
          }}
        >
          <span>orders@mamali.co.uk</span>
          <span>+44 20 7946 0000</span>
        </div>
      </div>
    </div>
  );
}

function AuthAside({
  postcode,
  onChangePostcode,
  mode,
}: {
  postcode: string;
  onChangePostcode: () => void;
  mode: 'signin' | 'signup';
}) {
  return (
    <div
      className="desktop-only"
      style={{
        background: 'var(--accent)',
        color: 'var(--cream)',
        padding: 'clamp(28px, 5vw, 48px) clamp(28px, 5vw, 60px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Logo size={28} mono />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 460 }}>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            opacity: 0.75,
          }}
        >
          {mode === 'signup' ? '— Apply for an account' : '— Welcome back'}
        </span>
        <h1
          style={{
            fontFamily: 'Newsreader, serif',
            fontWeight: 400,
            fontStyle: 'italic',
            fontSize: 'clamp(40px, 5vw, 76px)',
            lineHeight: 0.95,
            letterSpacing: '-0.025em',
            margin: '18px 0 24px',
          }}
        >
          {mode === 'signup' ? (
            <>
              For verified <span style={{ fontStyle: 'normal' }}>offices&nbsp;only.</span>
            </>
          ) : (
            <>
              Pick up where you <span style={{ fontStyle: 'normal' }}>left&nbsp;off.</span>
            </>
          )}
        </h1>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 15.5,
            lineHeight: 1.6,
            opacity: 0.86,
            margin: 0,
          }}
        >
          We only ship to verified corporate clients — it keeps our kitchen running and our drivers
          getting to the right reception desk. New accounts are reviewed within one working day.
        </p>
        <div
          style={{
            marginTop: 36,
            padding: '14px 16px',
            border: '1px solid rgba(245,238,220,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <KnotMark size={28} color="var(--gold)" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                opacity: 0.7,
              }}
            >
              Delivering to
            </span>
            <span style={{ fontFamily: 'Newsreader, serif', fontSize: 18 }}>{postcode}</span>
          </div>
          <button
            onClick={onChangePostcode}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              color: 'var(--cream)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 12,
              cursor: 'pointer',
              opacity: 0.7,
              textDecoration: 'underline',
            }}
          >
            change
          </button>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 28,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          opacity: 0.6,
        }}
      >
        <span>燒臘 · Siu Mei</span>
        <span>Family-run</span>
        <span>EST. 2019</span>
      </div>
      <LatticeBg color="var(--cream)" opacity={0.06} />
      <div style={{ position: 'absolute', right: -50, bottom: 80, opacity: 0.35 }}>
        <Stamp color="var(--gold)" size={200}>
          Verified
          <br />
          Office
          <br />
          Only
        </Stamp>
      </div>
    </div>
  );
}

function SignInForm({ switchTo }: { switchTo: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setErrorMsg('Please enter a valid email.');
      setStatus('error');
      return;
    }
    setStatus('sending');
    setErrorMsg('');

    // MOCK MODE: skip magic-link, sign in directly
    if (isMockMode()) {
      try {
        localStorage.setItem(
          MOCK_KEYS.user,
          JSON.stringify({ ...MOCK_USER, email })
        );
      } catch {
        /* localStorage disabled — still proceed */
      }
      // Small delay so the "sending…" state is visible
      setTimeout(() => router.push('/'), 600);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/`,
          shouldCreateUser: false, // verified accounts only
        },
      });
      if (error) throw error;
      setStatus('sent');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      // Supabase returns a generic error if user doesn't exist — translate
      // to clearer copy.
      if (message.toLowerCase().includes('signups not allowed')) {
        setErrorMsg("We can't find a verified account for that email. Apply for an account →");
      } else {
        setErrorMsg(message);
      }
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div>
        <h2
          style={{
            fontFamily: 'Newsreader, serif',
            fontWeight: 400,
            fontSize: 'clamp(26px, 3vw, 36px)',
            lineHeight: 1.1,
            margin: 0,
            color: 'var(--ink)',
          }}
        >
          Check your inbox.
        </h2>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 15,
            lineHeight: 1.6,
            color: 'var(--ink-soft)',
            margin: '14px 0 0',
          }}
        >
          We've sent a sign-in link to <strong style={{ color: 'var(--ink)' }}>{email}</strong>. Click it
          to sign in. The link is valid for one hour.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
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
        Sign in to your corporate account.
      </h2>
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 14.5,
          lineHeight: 1.55,
          color: 'var(--ink-soft)',
          margin: '14px 0 28px',
        }}
      >
        We'll email you a one-time sign-in link — no passwords to remember.
      </p>
      <AuthField
        label="Work email"
        value={email}
        onChange={setEmail}
        placeholder="you@company.com"
        type="email"
      />
      {errorMsg && (
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 13,
            color: 'var(--alert)',
            marginTop: 10,
            marginBottom: 14,
          }}
        >
          {errorMsg}
        </p>
      )}
      <Btn full size="lg" variant="primary" disabled={status === 'sending'} type="submit">
        {status === 'sending' ? 'Sending link…' : 'Email me a sign-in link →'}
      </Btn>
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 13,
          color: 'var(--ink-soft)',
          margin: '20px 0 0',
        }}
      >
        First time?{' '}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            switchTo();
          }}
          style={{ color: 'var(--ink)' }}
        >
          Apply for a corporate account →
        </a>
      </p>
    </form>
  );
}

function SignUpForm({ switchTo }: { switchTo: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({
    company: '',
    companyType: 'Law',
    email: '',
    name: '',
    phone: '',
    frequency: 'Monthly',
    billing: '',
    agree: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const valid =
    form.company &&
    form.email &&
    form.name &&
    form.phone &&
    form.agree &&
    /@/.test(form.email);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError('');

    // MOCK MODE: skip the API call, fake success and route to /pending
    if (isMockMode()) {
      setTimeout(() => {
        const params = new URLSearchParams({ email: form.email, name: form.name });
        router.push('/pending?' + params.toString());
      }, 600);
      return;
    }

    try {
      const res = await fetch('/api/auth/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Application failed.');
      }
      // Carry the email + name into the pending screen via query.
      const params = new URLSearchParams({ email: form.email, name: form.name });
      router.push('/pending?' + params.toString());
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : 'Something went wrong.';
      setError(m);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h2
        style={{
          fontFamily: 'Newsreader, serif',
          fontWeight: 400,
          fontSize: 'clamp(26px, 3vw, 36px)',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          margin: 0,
          color: 'var(--ink)',
        }}
      >
        Apply for a corporate account.
      </h2>
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 14.5,
          lineHeight: 1.55,
          color: 'var(--ink-soft)',
          margin: '12px 0 24px',
        }}
      >
        We review every new account within one working day to protect against fake orders. You'll
        get an email when we're ready to receive your first booking.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <AuthField
          label="Company name"
          value={form.company}
          onChange={(v) => setForm({ ...form, company: v })}
          placeholder="e.g. Allen & Overy LLP"
          full
        />
        <AuthField
          label="Work email"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
          placeholder="you@company.com"
          type="email"
        />
        <AuthField
          label="Your name"
          value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
          placeholder="Full name"
        />
        <AuthField
          label="Direct phone"
          value={form.phone}
          onChange={(v) => setForm({ ...form, phone: v })}
          placeholder="+44 …"
          type="tel"
        />
        <AuthSelect
          label="Sector"
          value={form.companyType}
          onChange={(v) => setForm({ ...form, companyType: v })}
          options={['Law', 'Finance', 'Tech', 'Consulting', 'Media', 'Public sector', 'Other']}
        />
        <AuthSelect
          label="Expected order frequency"
          value={form.frequency}
          onChange={(v) => setForm({ ...form, frequency: v })}
          options={['Weekly', 'Fortnightly', 'Monthly', 'One-off', 'Not sure yet']}
        />
        <AuthField
          label="Billing / accounts email"
          value={form.billing}
          onChange={(v) => setForm({ ...form, billing: v })}
          placeholder="accounts@company.com"
          type="email"
          full
        />
      </div>
      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          marginTop: 20,
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 13,
          color: 'var(--ink-soft)',
          lineHeight: 1.5,
        }}
      >
        <input
          type="checkbox"
          checked={form.agree}
          onChange={(e) => setForm({ ...form, agree: e.target.checked })}
          style={{ marginTop: 4 }}
        />
        <span>
          I confirm I'm placing orders on behalf of my company and agree to the{' '}
          <a href="/terms" style={{ color: 'var(--ink)' }}>
            terms of corporate supply
          </a>{' '}
          and{' '}
          <a href="/privacy" style={{ color: 'var(--ink)' }}>
            privacy policy
          </a>
          .
        </span>
      </label>
      {error && (
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'var(--alert)', marginTop: 12 }}>
          {error}
        </p>
      )}
      <div style={{ marginTop: 22 }}>
        <Btn full size="lg" variant="primary" disabled={!valid || submitting} type="submit">
          {submitting ? 'Submitting…' : 'Submit for verification →'}
        </Btn>
      </div>
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 13,
          color: 'var(--ink-soft)',
          margin: '14px 0 0',
        }}
      >
        Already verified?{' '}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            switchTo();
          }}
          style={{ color: 'var(--ink)' }}
        >
          Sign in →
        </a>
      </p>
    </form>
  );
}

function AuthField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  full?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        gridColumn: full ? '1 / -1' : 'auto',
        marginBottom: 4,
      }}
    >
      <label
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--ink-soft)',
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: 'var(--paper-deep)',
          border: '1px solid var(--rule)',
          padding: '14px 16px',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 15,
          color: 'var(--ink)',
          borderRadius: 2,
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--ink)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--rule)')}
      />
    </div>
  );
}

function AuthSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
      <label
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--ink-soft)',
        }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: 'var(--paper-deep)',
          border: '1px solid var(--rule)',
          padding: '14px 16px',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 15,
          color: 'var(--ink)',
          borderRadius: 2,
          appearance: 'none',
          cursor: 'pointer',
        }}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
