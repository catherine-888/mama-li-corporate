'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOrder } from '@/components/order-context';

import {
  buildDates,
  fmtLongDate,
  getEarliestDate,
  money,
  moneyExact,
} from '@/lib/order';
import { Btn, Logo } from '@/components/ui';
import { createClient } from '@/lib/supabase-browser';
import { isMockMode, MOCK_KEYS } from '@/lib/mock';
import type { DeliveryDetails, Timeslot, Location } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
//  Checkout client component. Receives timeslots / locations /
//  settings + per-date availability data as props from the
//  server-side parent.
// ─────────────────────────────────────────────────────────────

const MIN_SPEND_DEFAULT = 250;

export default function CheckoutClient({
  timeslots,
  locations,
  blockedDates,
  capacityByDateSlot,
  minSpend = MIN_SPEND_DEFAULT,
}: {
  timeslots: Timeslot[];
  locations: Location[];
  blockedDates: string[];
  capacityByDateSlot: Record<string, Record<string, number>>;
  minSpend?: number;
}) {
  const router = useRouter();
  const { postcode, cart, totals, delivery, setDelivery } = useOrder();

  // Auth state
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [account, setAccount] = useState({ email: '', name: '', company: '', phone: '' });

  useEffect(() => {
    // MOCK MODE: read user from localStorage
    if (isMockMode()) {
      try {
        const raw = localStorage.getItem(MOCK_KEYS.user);
        if (raw) {
          const u = JSON.parse(raw);
          setUser({ id: u.id, email: u.email });
          setAccount((a) => ({ ...a, email: u.email ?? '' }));
        }
      } catch {
        /* ignore */
      }
      setAuthChecked(true);
      return;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email });
        setAccount((a) => ({ ...a, email: data.user!.email ?? '' }));
      }
      setAuthChecked(true);
    });
  }, []);

  // Guard: must have cart and postcode
  useEffect(() => {
    if (!postcode) router.replace('/gate');
    else if (cart.length === 0) router.replace('/menu');
    else if (totals.subtotal < minSpend) router.replace('/menu');
  }, [postcode, cart.length, totals.subtotal, router]);

  // Initialise delivery defaults
  const earliest = useMemo(() => getEarliestDate(), []);
  useEffect(() => {
    if (!delivery.date) {
      setDelivery((d) => ({ ...d, date: earliest.toISOString().slice(0, 10) }));
    }
  }, [delivery.date, earliest, setDelivery]);

  const [step, setStep] = useState<0 | 1 | 2>(user?.email ? 1 : 0);
  useEffect(() => {
    if (user?.email && step === 0) setStep(1);
  }, [user?.email, step]);

  const isPickup = delivery.method === 'pickup';
  const deliveryReady =
    !!delivery.date &&
    !!delivery.slot &&
    (isPickup ? !!delivery.pickupLocation && !!delivery.recipient : !!delivery.address);

  const accountReady = !!account.email && !!account.company && !!account.name;

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const placeOrder = async () => {
    setSubmitting(true);
    setSubmitError('');

    // MOCK MODE: skip Stripe, fake a paid order, redirect to confirmation
    if (isMockMode()) {
      const fakeSessionId = 'mock_cs_' + Math.random().toString(36).slice(2, 14);
      const fakeOrder = {
        id: 'mock-' + Math.random().toString(36).slice(2, 10),
        account_id: null,
        postcode,
        cart,
        delivery,
        totals,
        status: 'paid' as const,
        stripe_session_id: fakeSessionId,
        stripe_payment_intent_id: 'mock_pi',
        contact_email: account.email || 'demo@mamali.co.uk',
        contact_name: account.name,
        contact_company: account.company,
        contact_phone: account.phone,
        created_at: new Date().toISOString(),
      };
      try {
        localStorage.setItem(MOCK_KEYS.lastOrder, JSON.stringify(fakeOrder));
      } catch {
        /* ignore */
      }
      // Brief "redirecting…" state then jump to confirmation
      setTimeout(() => {
        window.location.href = `/confirmation?session_id=${fakeSessionId}`;
      }, 800);
      return;
    }

    try {
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          delivery,
          postcode,
          totals,
          account, // forwarded for ops if user is signed in via magic-link
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Could not create checkout session.');
      }
      const { url } = await res.json();
      if (!url) throw new Error('No checkout URL returned.');
      window.location.href = url;
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  };

  if (!authChecked || !postcode || cart.length === 0) return null;

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <CheckoutHeader onBack={() => router.push('/menu')} />

      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: 'clamp(24px, 5vw, 40px) clamp(20px, 5vw, 60px) 80px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 380px',
          gap: 'clamp(28px, 5vw, 60px)',
          alignItems: 'flex-start',
        }}
        className="checkout-body"
      >
        <div>
          <Stepper steps={['Account', 'Delivery', 'Payment']} current={step} setCurrent={(i) => setStep(i)} />

          {step === 0 && (
            <>
              <StepAccount account={account} setAccount={setAccount} signedInEmail={user?.email} />
              <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
                <Btn variant="primary" size="lg" onClick={() => setStep(1)} disabled={!accountReady}>
                  Continue to delivery →
                </Btn>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <StepDelivery
                postcode={postcode}
                delivery={delivery}
                setDelivery={setDelivery}
                timeslots={timeslots}
                locations={locations}
                blockedDates={blockedDates}
                capacityByDateSlot={capacityByDateSlot}
              />
              <div
                style={{
                  marginTop: 32,
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <Btn variant="secondary" size="md" onClick={() => setStep(0)}>
                  ← Back
                </Btn>
                <Btn variant="primary" size="lg" onClick={() => setStep(2)} disabled={!deliveryReady}>
                  Continue to payment →
                </Btn>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <StepPayment total={totals.total} />
              {submitError && (
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'var(--alert)', marginTop: 16 }}>
                  {submitError}
                </p>
              )}
              <div
                style={{
                  marginTop: 32,
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <Btn variant="secondary" size="md" onClick={() => setStep(1)} disabled={submitting}>
                  ← Back
                </Btn>
                <Btn variant="accent" size="lg" onClick={placeOrder} disabled={submitting}>
                  {submitting ? 'Redirecting to Stripe…' : `Pay ${moneyExact(totals.total)} →`}
                </Btn>
              </div>
            </>
          )}
        </div>

        <OrderSummary
          postcode={postcode}
          delivery={delivery}
          cart={cart}
          totals={totals}
          timeslots={timeslots}
          locations={locations}
        />
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .checkout-body {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────

function CheckoutHeader({ onBack }: { onBack: () => void }) {
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
      }}
    >
      <Link href="/menu" style={{ textDecoration: 'none' }}>
        <Logo size={26} />
      </Link>
      <button
        onClick={onBack}
        style={{
          background: 'transparent',
          border: 'none',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 14,
          color: 'var(--ink)',
          cursor: 'pointer',
        }}
      >
        ← Back to menu
      </button>
    </header>
  );
}

function Stepper({
  steps,
  current,
  setCurrent,
}: {
  steps: string[];
  current: number;
  setCurrent: (i: 0 | 1 | 2) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
      {steps.map((s, i) => (
        <button
          key={s}
          onClick={() => i < current && setCurrent(i as 0 | 1 | 2)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            padding: '0 0 18px',
            borderBottom:
              i === current ? '3px solid var(--ink)' : i < current ? '3px solid var(--jade)' : '3px solid var(--rule)',
            textAlign: 'left',
            cursor: i < current ? 'pointer' : 'default',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: i === current ? 'var(--accent)' : 'var(--ink-soft)',
            }}
          >
            Step 0{i + 1}
          </span>
          <span
            style={{
              fontFamily: 'Newsreader, serif',
              fontSize: 22,
              color: i === current ? 'var(--ink)' : 'var(--ink-soft)',
              letterSpacing: '-0.01em',
            }}
          >
            {s}
            {i < current && <span style={{ color: 'var(--jade)', marginLeft: 8 }}>✓</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

function SectionHead({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          marginBottom: 10,
        }}
      >
        — {kicker}
      </div>
      <h2
        style={{
          fontFamily: 'Newsreader, serif',
          fontWeight: 400,
          fontSize: 32,
          letterSpacing: '-0.02em',
          margin: 0,
          color: 'var(--ink)',
          lineHeight: 1.1,
        }}
      >
        {title}
      </h2>
      {sub && (
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14.5,
            lineHeight: 1.55,
            color: 'var(--ink-soft)',
            margin: '10px 0 0',
            maxWidth: 580,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function FieldGroup({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  locked,
  tag,
}: {
  label: string;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  locked?: boolean;
  tag?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
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
        <span>{label}</span>
        {tag && <span style={{ color: 'var(--jade)' }}>✓ {tag}</span>}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => !locked && onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={locked}
        style={{
          background: locked ? 'oklch(0.94 0.01 80)' : 'var(--paper-deep)',
          border: '1px solid var(--rule)',
          padding: '14px 16px',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 15,
          color: 'var(--ink)',
          borderRadius: 2,
          outline: 'none',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--ink)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--rule)')}
      />
    </div>
  );
}

function StepAccount({
  account,
  setAccount,
  signedInEmail,
}: {
  account: { email: string; name: string; company: string; phone: string };
  setAccount: (a: typeof account) => void;
  signedInEmail?: string;
}) {
  return (
    <section>
      <SectionHead
        kicker="Step 01"
        title="Corporate account"
        sub="Required for invoicing, reorders and dietary preferences across the team."
      />
      {signedInEmail && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 16px',
            background: 'oklch(0.94 0.03 155)',
            borderLeft: '3px solid var(--jade)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 13,
            color: 'var(--ink)',
          }}
        >
          Signed in as <strong>{signedInEmail}</strong>.
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginTop: 20,
        }}
      >
        <FieldGroup
          label="Work email"
          value={account.email}
          onChange={(v) => setAccount({ ...account, email: v })}
          placeholder="you@company.com"
          type="email"
          locked={!!signedInEmail}
          tag={signedInEmail ? 'verified' : undefined}
        />
        <FieldGroup
          label="Full name"
          value={account.name}
          onChange={(v) => setAccount({ ...account, name: v })}
          placeholder="e.g. Priya Shah"
        />
        <FieldGroup
          label="Company"
          value={account.company}
          onChange={(v) => setAccount({ ...account, company: v })}
          placeholder="e.g. Allen & Overy"
        />
        <FieldGroup
          label="Phone"
          value={account.phone}
          onChange={(v) => setAccount({ ...account, phone: v })}
          placeholder="+44 7…"
          type="tel"
        />
      </div>
    </section>
  );
}

function StepDelivery({
  postcode,
  delivery,
  setDelivery,
  timeslots,
  locations,
  blockedDates,
  capacityByDateSlot,
}: {
  postcode: string;
  delivery: DeliveryDetails;
  setDelivery: (d: DeliveryDetails | ((prev: DeliveryDetails) => DeliveryDetails)) => void;
  timeslots: Timeslot[];
  locations: Location[];
  blockedDates: string[];
  capacityByDateSlot: Record<string, Record<string, number>>;
}) {
  const earliest = useMemo(() => getEarliestDate(), []);
  const blockedSet = useMemo(() => new Set(blockedDates), [blockedDates]);
  const dates = useMemo(() => buildDates(earliest, 21).filter((d) => !blockedSet.has(d.toISOString().slice(0, 10))).slice(0, 14), [earliest, blockedSet]);
  const isPickup = delivery.method === 'pickup';

  // Resolve per-date capacity for the currently-selected date.
  // If a slot's capacity is 0 (override) it's disabled.
  const selectedDateStr = delivery.date;
  const dateOverrides = selectedDateStr ? capacityByDateSlot[selectedDateStr] ?? {} : {};
  return (
    <section>
      <SectionHead
        kicker="Step 02"
        title={isPickup ? 'Pickup — when and where' : 'Delivery — when and where'}
        sub="Two-day notice, please — we need time to roast properly. Hourly windows, weekday lunches only."
      />

      {/* Method toggle */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12,
          marginTop: 24,
        }}
      >
        {(
          [
            { id: 'delivery' as const, t: 'Deliver to my office', sub: `£15 to ${postcode} · within 2hr window`, mark: '⌖ Deliver' },
            { id: 'pickup' as const, t: 'Pickup from a Mama Li store', sub: 'Free · collect at your slot', mark: '◉ Pickup' },
          ]
        ).map((m) => {
          const sel = delivery.method === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setDelivery((d) => ({ ...d, method: m.id, slot: '' }))}
              style={{
                background: sel ? 'var(--ink)' : 'var(--paper-deep)',
                color: sel ? 'var(--cream)' : 'var(--ink)',
                border: '1px solid ' + (sel ? 'var(--ink)' : 'var(--rule)'),
                padding: '20px 22px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                borderRadius: 2,
              }}
            >
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  opacity: 0.65,
                }}
              >
                {m.mark}
              </span>
              <span style={{ fontFamily: 'Newsreader, serif', fontSize: 22 }}>{m.t}</span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, opacity: 0.75 }}>{m.sub}</span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          margin: '22px 0 18px',
          padding: '14px 18px',
          background: 'oklch(0.93 0.04 80)',
          borderLeft: '3px solid var(--gold)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 13.5,
          color: 'var(--ink)',
        }}
      >
        <span style={{ fontFamily: 'Newsreader, serif', fontSize: 16, fontStyle: 'italic' }}>ⓘ</span>
        <span>
          Earliest available: <strong>{fmtLongDate(earliest)}</strong>. We take one corporate{' '}
          {isPickup ? 'pickup' : 'delivery'} per hour.
        </span>
      </div>

      {/* Pickup location */}
      {isPickup && (
        <>
          <SubLabel>Pickup location</SubLabel>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 10,
            }}
          >
            {locations.map((loc) => {
              const sel = delivery.pickupLocation === loc.id;
              return (
                <button
                  key={loc.id}
                  onClick={() => setDelivery((d) => ({ ...d, pickupLocation: loc.id }))}
                  style={{
                    background: sel ? 'var(--jade)' : 'var(--paper-deep)',
                    color: sel ? 'var(--cream)' : 'var(--ink)',
                    border: '1px solid ' + (sel ? 'var(--jade)' : 'var(--rule)'),
                    padding: '16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    borderRadius: 2,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Newsreader, serif', fontSize: 18 }}>{loc.name}</span>
                    <span style={{ fontFamily: 'Newsreader, serif', fontSize: 13, opacity: sel ? 0.8 : 0.55 }}>
                      {loc.cn}
                    </span>
                  </span>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, opacity: sel ? 0.85 : 0.7 }}>
                    {loc.addr}
                  </span>
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      opacity: sel ? 0.8 : 0.55,
                      marginTop: 4,
                    }}
                  >
                    {loc.pickup}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Date strip */}
      <SubLabel>Choose a date</SubLabel>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
          gap: 8,
        }}
      >
        {dates.map((d) => {
          const iso = d.toISOString().slice(0, 10);
          const sel = selectedDateStr === iso;
          return (
            <button
              key={iso}
              onClick={() => setDelivery((dd) => ({ ...dd, date: iso, slot: '' }))}
              style={{
                background: sel ? 'var(--ink)' : 'var(--paper-deep)',
                color: sel ? 'var(--cream)' : 'var(--ink)',
                border: '1px solid ' + (sel ? 'var(--ink)' : 'var(--rule)'),
                padding: '14px 8px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                alignItems: 'center',
                borderRadius: 2,
              }}
            >
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  opacity: sel ? 0.8 : 0.6,
                }}
              >
                {d.toLocaleDateString('en-GB', { weekday: 'short' })}
              </span>
              <span style={{ fontFamily: 'Newsreader, serif', fontSize: 22, lineHeight: 1 }}>{d.getDate()}</span>
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 9,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  opacity: sel ? 0.7 : 0.5,
                }}
              >
                {d.toLocaleDateString('en-GB', { month: 'short' })}
              </span>
            </button>
          );
        })}
      </div>

      {/* Slots */}
      <SubLabel>{isPickup ? 'Pickup window — hourly' : 'Delivery window — hourly'}</SubLabel>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 10,
        }}
      >
        {timeslots.map((s) => {
          const sel = delivery.slot === s.id;
          // If this date has a capacity override of 0 for this slot, disable.
          const overrideCap = dateOverrides[s.id];
          const disabled = overrideCap === 0;
          return (
            <button
              key={s.id}
              disabled={disabled}
              onClick={() => !disabled && setDelivery((d) => ({ ...d, slot: s.id }))}
              style={{
                background: disabled ? 'oklch(0.91 0.005 80)' : sel ? 'var(--jade)' : 'var(--paper-deep)',
                color: disabled ? 'var(--ink-soft)' : sel ? 'var(--cream)' : 'var(--ink)',
                border: '1px solid ' + (sel ? 'var(--jade)' : 'var(--rule)'),
                padding: '16px 14px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.55 : 1,
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                borderRadius: 2,
              }}
            >
              <span style={{ fontFamily: 'Newsreader, serif', fontSize: 17 }}>{s.label}</span>
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  opacity: sel ? 0.8 : 0.55,
                }}
              >
                {disabled ? 'Unavailable' : s.tag}
              </span>
            </button>
          );
        })}
      </div>

      {/* Address (delivery only) */}
      {!isPickup && (
        <>
          <SubLabel>Delivery address</SubLabel>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            <FieldGroup
              label="Company / building"
              value={delivery.building}
              onChange={(v) => setDelivery((d) => ({ ...d, building: v }))}
              placeholder="e.g. Bishopsgate Tower, Lvl 14"
            />
            <FieldGroup
              label="Street address"
              value={delivery.address}
              onChange={(v) => setDelivery((d) => ({ ...d, address: v }))}
              placeholder="150 Bishopsgate"
            />
            <FieldGroup label="Postcode" value={postcode} locked tag="EC verified" />
            <FieldGroup
              label="Recipient on the day"
              value={delivery.recipient}
              onChange={(v) => setDelivery((d) => ({ ...d, recipient: v }))}
              placeholder="Name on reception desk"
            />
            <FieldGroup
              label="Contact phone"
              value={delivery.contactPhone}
              onChange={(v) => setDelivery((d) => ({ ...d, contactPhone: v }))}
              placeholder="+44 …"
              type="tel"
            />
          </div>
        </>
      )}

      {/* Pickup contact */}
      {isPickup && (
        <>
          <SubLabel>Who&apos;s collecting</SubLabel>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            <FieldGroup
              label="Name on collection"
              value={delivery.recipient}
              onChange={(v) => setDelivery((d) => ({ ...d, recipient: v }))}
              placeholder="Name we'll ask for at the counter"
            />
            <FieldGroup
              label="Contact phone"
              value={delivery.contactPhone}
              onChange={(v) => setDelivery((d) => ({ ...d, contactPhone: v }))}
              placeholder="+44 …"
              type="tel"
            />
          </div>
        </>
      )}

      <div style={{ marginTop: 24 }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
            marginBottom: 8,
          }}
        >
          {isPickup ? 'Pickup notes / dietaries' : 'Delivery notes / dietaries'}
        </label>
        <textarea
          value={delivery.notes}
          onChange={(e) => setDelivery((d) => ({ ...d, notes: e.target.value }))}
          placeholder={
            isPickup
              ? 'Allergens, names on boxes, anything else our team should know…'
              : 'Loading bay info, lift code, allergens, names on boxes…'
          }
          rows={3}
          style={{
            width: '100%',
            background: 'var(--paper-deep)',
            border: '1px solid var(--rule)',
            padding: '14px 16px',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14,
            color: 'var(--ink)',
            borderRadius: 2,
            resize: 'vertical',
          }}
        />
      </div>
    </section>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--ink-soft)',
        margin: '32px 0 12px',
      }}
    >
      {children}
    </div>
  );
}

function StepPayment({ total }: { total: number }) {
  return (
    <section>
      <SectionHead
        kicker="Step 03"
        title="Payment"
        sub="We use Stripe for secure card payment. You'll be taken to Stripe's checkout — your card details never touch our server. After you pay, you'll get a confirmation email and our kitchen will start prepping."
      />
      <div
        style={{
          marginTop: 24,
          padding: '24px 24px',
          background: 'var(--paper-deep)',
          border: '1px solid var(--rule)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
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
            Total to pay
          </div>
          <div style={{ fontFamily: 'Newsreader, serif', fontSize: 36, lineHeight: 1 }}>
            {moneyExact(total)}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 13,
            color: 'var(--ink-soft)',
          }}
        >
          <span
            style={{
              padding: '6px 10px',
              background: 'var(--ink)',
              color: 'var(--cream)',
              borderRadius: 2,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            Stripe
          </span>
          Visa · Mastercard · Amex · Apple Pay · Google Pay
        </div>
      </div>
      <p
        style={{
          marginTop: 16,
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 13,
          color: 'var(--ink-soft)',
          lineHeight: 1.5,
        }}
      >
        Invoices are sent automatically to your billing address. For corporate accounts on monthly billing terms,
        contact <a href="mailto:orders@mamali.co.uk" style={{ color: 'var(--ink)' }}>orders@mamali.co.uk</a>.
      </p>
    </section>
  );
}

function OrderSummary({
  cart,
  totals,
  delivery,
  postcode,
  timeslots,
  locations,
}: {
  cart: ReturnType<typeof useOrder>['cart'];
  totals: ReturnType<typeof useOrder>['totals'];
  delivery: DeliveryDetails;
  postcode: string;
  timeslots: Timeslot[];
  locations: Location[];
}) {
  const slot = timeslots.find((s) => s.id === delivery.slot);
  const isPickup = delivery.method === 'pickup';
  const loc = locations.find((l) => l.id === delivery.pickupLocation);
  const dateObj = delivery.date ? new Date(delivery.date + 'T00:00:00') : null;

  return (
    <aside
      style={{
        position: 'sticky',
        top: 90,
        background: 'var(--paper-deep)',
        padding: '28px 24px',
        border: '1px solid var(--rule)',
      }}
    >
      <h3
        style={{
          fontFamily: 'Newsreader, serif',
          fontWeight: 500,
          fontSize: 22,
          margin: 0,
          letterSpacing: '-0.01em',
        }}
      >
        Your order
      </h3>

      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '18px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxHeight: 260,
          overflowY: 'auto',
        }}
      >
        {cart.map((it) => (
          <li
            key={it.id}
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              gap: 10,
              alignItems: 'baseline',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13,
              color: 'var(--ink)',
              paddingBottom: 8,
              borderBottom: '1px dashed var(--rule)',
            }}
          >
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-soft)' }}>
              {it.qty}×
            </span>
            <span style={{ fontFamily: 'Newsreader, serif', fontSize: 15 }}>{it.name}</span>
            <span style={{ fontFamily: 'Newsreader, serif', fontSize: 15 }}>{moneyExact(it.price * it.qty)}</span>
          </li>
        ))}
      </ul>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>
        <Row k="Subtotal" v={moneyExact(totals.subtotal)} />
        <Row
          k={isPickup ? 'Pickup — free' : 'Delivery — EC zone'}
          v={isPickup ? '—' : moneyExact(totals.deliveryFee)}
        />
        <Row k="VAT (20%)" v={moneyExact(totals.vat)} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: 14,
            marginTop: 6,
            borderTop: '1px solid var(--ink)',
            fontFamily: 'Newsreader, serif',
            fontSize: 22,
            color: 'var(--ink)',
          }}
        >
          <span>Total</span>
          <span>{moneyExact(totals.total)}</span>
        </div>
      </div>

      <div
        style={{
          marginTop: 22,
          padding: 14,
          background: 'var(--cream)',
          border: '1px solid var(--rule)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
          }}
        >
          {isPickup ? 'Pickup' : 'Delivering'}
        </span>
        <span style={{ fontFamily: 'Newsreader, serif', fontSize: 16 }}>
          {dateObj ? fmtLongDate(dateObj) : 'Pick a date'}
        </span>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'var(--ink-soft)' }}>
          {slot ? slot.label : 'Pick a window'} ·{' '}
          {isPickup ? (loc ? `from ${loc.name}` : 'pick a store') : `to ${postcode}`}
        </span>
      </div>
    </aside>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-soft)' }}>
      <span>{k}</span>
      <span style={{ color: 'var(--ink)' }}>{v}</span>
    </div>
  );
}
