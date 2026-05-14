'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOrder } from '@/components/order-context';
import { NavBar, Footer } from '@/components/site-chrome';
import { Btn, Tag } from '@/components/ui';
import type { SavedAddress } from '@/lib/saved-addresses';
import type { AccountUser } from '@/lib/customer-auth';
import { isMockMode } from '@/lib/mock';

export default function AddressesClient({
  user,
  initial,
}: {
  user: AccountUser;
  initial: SavedAddress[];
}) {
  const router = useRouter();
  const { postcode } = useOrder();
  const [addresses, setAddresses] = useState(initial);
  const [editing, setEditing] = useState<SavedAddress | null>(null);

  const openNew = () =>
    setEditing({
      id: '',
      label: '',
      recipient: '',
      building: '',
      address: '',
      postcode: postcode ?? '',
      contact_phone: '',
      notes: '',
      is_default: addresses.length === 0,
    });

  const remove = async (id: string) => {
    if (!confirm('Remove this saved address?')) return;
    if (!isMockMode()) {
      await fetch(`/api/account/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } else {
      await fetch(`/api/account/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' });
    }
    setAddresses((a) => a.filter((x) => x.id !== id));
  };

  const setDefault = async (id: string) => {
    await fetch(`/api/account/addresses/${encodeURIComponent(id)}/default`, { method: 'POST' });
    setAddresses((a) => a.map((x) => ({ ...x, is_default: x.id === id })));
  };

  const saved = (next: SavedAddress, isNew: boolean) => {
    if (next.is_default) {
      setAddresses((a) => {
        const others = a.map((x) => ({ ...x, is_default: false }));
        return isNew ? [...others, next] : others.map((x) => (x.id === next.id ? next : x));
      });
    } else {
      setAddresses((a) => (isNew ? [...a, next] : a.map((x) => (x.id === next.id ? next : x))));
    }
    setEditing(null);
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
          ← Back to account
        </Link>

        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            marginTop: 18,
            marginBottom: 28,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 400,
                fontSize: 'clamp(30px, 4vw, 44px)',
                lineHeight: 1,
                letterSpacing: '-0.025em',
                margin: 0,
                color: 'var(--ink)',
              }}
            >
              Saved addresses
            </h1>
            <p style={{ marginTop: 10, color: 'var(--ink-soft)', fontSize: 14 }}>
              Save commonly used delivery details so checkout is one tap. We&apos;ll never share these.
            </p>
          </div>
          <Btn variant="accent" onClick={openNew}>
            + Add new
          </Btn>
        </header>

        {addresses.length === 0 ? (
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
              No saved addresses yet.
            </p>
            <p style={{ fontSize: 13, margin: '8px 0 0' }}>
              Add one now or after your first delivery.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {addresses.map((a) => (
              <article
                key={a.id}
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
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)' }}>
                      {a.label || a.recipient || 'Address'}
                    </div>
                    {a.is_default && <Tag tone="jade">Default</Tag>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4, lineHeight: 1.55 }}>
                    {a.recipient && <span>{a.recipient} · </span>}
                    {a.building && <span>{a.building}, </span>}
                    {a.address && <span>{a.address}, </span>}
                    {a.postcode}
                    {a.contact_phone && (
                      <div style={{ fontSize: 12, marginTop: 2 }}>☎ {a.contact_phone}</div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {!a.is_default && (
                    <Btn variant="ghost" onClick={() => setDefault(a.id)} size="md">
                      Make default
                    </Btn>
                  )}
                  <Btn variant="secondary" onClick={() => setEditing(a)} size="md">
                    Edit
                  </Btn>
                  <Btn variant="ghost" onClick={() => remove(a.id)} size="md">
                    Remove
                  </Btn>
                </div>
              </article>
            ))}
          </div>
        )}

        {editing && <AddressForm initial={editing} onClose={() => setEditing(null)} onSaved={saved} />}
      </main>

      <Footer />
    </div>
  );
}

function AddressForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: SavedAddress;
  onClose: () => void;
  onSaved: (a: SavedAddress, isNew: boolean) => void;
}) {
  const isNew = !initial.id;
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      const url = isNew ? '/api/account/addresses' : `/api/account/addresses/${encodeURIComponent(form.id)}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Save failed.');
      }
      const j = await res.json().catch(() => ({}));
      onSaved(j.address ?? form, isNew);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: 'var(--cream)',
    border: '1px solid var(--rule)',
    padding: '10px 12px',
    fontSize: 14,
    borderRadius: 2,
    fontFamily: 'var(--font-sans)',
    color: 'var(--ink)',
    width: '100%',
    boxSizing: 'border-box' as const,
    outline: 'none',
  };
  const labelStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: 'var(--ink-soft)',
    marginBottom: 6,
    display: 'block',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(28,24,19,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 20,
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        style={{
          background: 'var(--cream)',
          padding: 28,
          maxWidth: 520,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          border: '1px solid var(--rule)',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            fontSize: 22,
            margin: '0 0 18px',
            color: 'var(--ink)',
          }}
        >
          {isNew ? 'New address' : 'Edit address'}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label>
            <span style={labelStyle}>Label (yours, internal)</span>
            <input
              style={inputStyle}
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. Bishopsgate Tower 14F"
            />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label>
              <span style={labelStyle}>Recipient</span>
              <input
                style={inputStyle}
                value={form.recipient}
                onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                placeholder="Reception desk"
              />
            </label>
            <label>
              <span style={labelStyle}>Contact phone</span>
              <input
                style={inputStyle}
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                placeholder="+44 7700 900000"
              />
            </label>
          </div>
          <label>
            <span style={labelStyle}>Building</span>
            <input
              style={inputStyle}
              value={form.building}
              onChange={(e) => setForm({ ...form, building: e.target.value })}
            />
          </label>
          <label>
            <span style={labelStyle}>Street address</span>
            <input
              style={inputStyle}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </label>
          <label>
            <span style={labelStyle}>Postcode</span>
            <input
              style={{ ...inputStyle, textTransform: 'uppercase' }}
              value={form.postcode}
              onChange={(e) => setForm({ ...form, postcode: e.target.value.toUpperCase() })}
            />
          </label>
          <label>
            <span style={labelStyle}>Notes for the driver</span>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Side door, please ring bell."
            />
          </label>
          <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
            />
            Use as default at checkout
          </label>
        </div>
        {err && (
          <div style={{ color: 'var(--alert, #b43e2e)', fontSize: 13, marginTop: 14 }}>{err}</div>
        )}
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="accent" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Btn>
        </div>
      </form>
    </div>
  );
}
