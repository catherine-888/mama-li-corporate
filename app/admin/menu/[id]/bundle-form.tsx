'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Bundle } from '@/lib/types';
import { Card, Btn, Field, TextInput, NumberInput, TextArea, Select, Checkbox } from '@/components/admin-ui';
import ImageField from '@/components/admin-image-field';
import { isMockMode } from '@/lib/mock';

// ─────────────────────────────────────────────────────────────
//  Bundle form — used for both edit and new.
//
//  Modifier-group editing is intentionally simplified:
//   - You can edit option labels, sub-labels, and price deltas.
//   - You cannot (yet) add new modifier groups from this UI;
//     for that, edit lib/menu.ts via a developer and re-seed.
//     (Most bundles need price/photo/description tweaks, not
//     structural changes.)
// ─────────────────────────────────────────────────────────────

type Form = Bundle & { sort_order: number; visible: boolean };

export default function BundleForm({
  initial,
  mode,
}: {
  initial: Form;
  mode: 'edit' | 'new';
}) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      if (isMockMode()) {
        await new Promise((r) => setTimeout(r, 500));
        router.push('/admin/menu');
        return;
      }
      const url = mode === 'new' ? `/admin/api/bundles` : `/admin/api/bundles/${encodeURIComponent(form.id)}`;
      const method = mode === 'new' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Save failed.');
      }
      router.push('/admin/menu');
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete "${form.name}"? This hides it from the live site immediately.`)) return;
    setSaving(true);
    try {
      if (!isMockMode()) {
        await fetch(`/admin/api/bundles/${encodeURIComponent(form.id)}`, { method: 'DELETE' });
      }
      router.push('/admin/menu');
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card>
            <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: 18, margin: '0 0 16px' }}>
              Basics
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {mode === 'new' && (
                <Field label="ID" hint="Used in URLs and order data. Lowercase letters, numbers, hyphens.">
                  <TextInput value={form.id} onChange={(v) => set('id', v.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="e.g. b-platter-new" />
                </Field>
              )}
              <Field label="Name" span={2}>
                <TextInput value={form.name} onChange={(v) => set('name', v)} />
              </Field>
              <Field label="Subtitle">
                <TextInput value={form.subtitle} onChange={(v) => set('subtitle', v)} />
              </Field>
              <Field label="Serves" hint="e.g. '8–10', 'per person'">
                <TextInput value={form.serves} onChange={(v) => set('serves', v)} />
              </Field>
              <Field label="Category">
                <Select<'platters' | 'lunchboxes' | 'canapes'>
                  value={form.cat}
                  onChange={(v) => set('cat', v)}
                  options={[
                    { value: 'platters', label: 'Sharing platters' },
                    { value: 'lunchboxes', label: 'Lunch boxes' },
                    { value: 'canapes', label: 'Canapés' },
                  ]}
                />
              </Field>
              <Field label="Price (£, ex-VAT)">
                <NumberInput value={form.price} onChange={(v) => set('price', v)} min={0} step={0.5} />
              </Field>
              <Field label="Tag" hint="Optional pill, e.g. 'Bestseller', 'Vegan'">
                <TextInput value={form.tag ?? ''} onChange={(v) => set('tag', v || undefined)} />
              </Field>
              <Field label="Chinese name" hint="Shown as a small overlay, e.g. 燒臘">
                <TextInput value={form.cn ?? ''} onChange={(v) => set('cn', v || undefined)} />
              </Field>
            </div>
          </Card>

          <Card>
            <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: 18, margin: '0 0 16px' }}>
              Description
            </h2>
            <Field label="Long description">
              <TextArea value={form.description} onChange={(v) => set('description', v)} rows={4} />
            </Field>
            <div style={{ marginTop: 14 }}>
              <Field label="What's in the box" hint="Press Enter to add an item. Click ✕ to remove.">
                <TagListInput value={form.contains} onChange={(v) => set('contains', v)} />
              </Field>
            </div>
          </Card>

          {form.modifiers && form.modifiers.length > 0 && (
            <Card>
              <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: 18, margin: '0 0 6px' }}>
                Options
              </h2>
              <p style={{ fontSize: 13, color: '#5a524a', margin: '0 0 16px' }}>
                Edit option labels and price deltas. Adding new option groups requires a developer.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {form.modifiers.map((g, gi) => (
                  <div key={gi} style={{ borderTop: '1px solid #e6e1d4', paddingTop: 16 }}>
                    <div
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 10,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: '#5a524a',
                        marginBottom: 6,
                      }}
                    >
                      {g.label} {g.required && '· required'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {g.options.map((o, oi) => (
                        <div
                          key={oi}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1.4fr 1.8fr 0.8fr',
                            gap: 8,
                            alignItems: 'center',
                          }}
                        >
                          <TextInput
                            value={o.label}
                            onChange={(v) =>
                              setForm((f) => {
                                const next = structuredClone(f);
                                next.modifiers![gi].options[oi].label = v;
                                return next;
                              })
                            }
                          />
                          <TextInput
                            value={o.sub ?? ''}
                            onChange={(v) =>
                              setForm((f) => {
                                const next = structuredClone(f);
                                next.modifiers![gi].options[oi].sub = v || undefined;
                                return next;
                              })
                            }
                            placeholder="Description (optional)"
                          />
                          <NumberInput
                            value={o.delta ?? 0}
                            onChange={(v) =>
                              setForm((f) => {
                                const next = structuredClone(f);
                                next.modifiers![gi].options[oi].delta = v;
                                return next;
                              })
                            }
                            step={0.5}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card>
            <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: 18, margin: '0 0 16px' }}>
              Photo
            </h2>
            <ImageField value={form.img} onChange={(v) => set('img', v ?? undefined)} />
          </Card>

          <Card>
            <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: 18, margin: '0 0 16px' }}>
              Visibility & order
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Checkbox
                checked={form.visible}
                onChange={(v) => set('visible', v)}
                label="Show on the live menu"
              />
              <Field label="Sort order" hint="Lower numbers appear first.">
                <NumberInput value={form.sort_order} onChange={(v) => set('sort_order', v)} step={10} />
              </Field>
            </div>
          </Card>

          {err && (
            <Card style={{ background: '#fbeeec', borderColor: '#f0c1bb', color: '#b43e2e' }}>{err}</Card>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
            {mode === 'edit' ? (
              <Btn variant="danger" onClick={remove} disabled={saving}>
                Delete
              </Btn>
            ) : (
              <Btn variant="ghost" href="/admin/menu">
                Cancel
              </Btn>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost" href="/admin/menu">
                Cancel
              </Btn>
              <Btn variant="primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

function TagListInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('');
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {value.map((tag, i) => (
          <span
            key={i}
            style={{
              background: '#f1efe8',
              color: '#1c1813',
              padding: '4px 8px',
              borderRadius: 3,
              fontSize: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#5a524a',
                padding: 0,
                fontSize: 12,
                lineHeight: 1,
              }}
              aria-label={`Remove ${tag}`}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const v = draft.trim();
            if (v) {
              onChange([...value, v]);
              setDraft('');
            }
          }
        }}
        placeholder="Press Enter to add"
        style={{
          background: '#ffffff',
          border: '1px solid #d9cfb6',
          padding: '10px 12px',
          fontSize: 14,
          borderRadius: 4,
          fontFamily: 'inherit',
          color: '#1c1813',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}
