'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SiteSettings } from '@/lib/content';
import {
  Card,
  Btn,
  Field,
  TextInput,
  NumberInput,
  TextArea,
  Select,
} from '@/components/admin-ui';
import ImageField from '@/components/admin-image-field';
import { isMockMode } from '@/lib/mock';

// ─────────────────────────────────────────────────────────────
//  Curated font + palette options. Customers don't get a full
//  font picker — these are pre-vetted pairings that all look
//  good with the design.
// ─────────────────────────────────────────────────────────────

const FONT_OPTIONS = [
  {
    value: 'editorial',
    label: 'Editorial',
    description: 'Newsreader + DM Sans',
    sample: 'Mama Li',
    serif: '"Newsreader", Georgia, serif',
    sans: '"DM Sans", system-ui, sans-serif',
  },
  {
    value: 'classic',
    label: 'Classic',
    description: 'Playfair + Lora',
    sample: 'Mama Li',
    serif: '"Playfair Display", Georgia, serif',
    sans: '"Lora", Georgia, serif',
  },
  {
    value: 'modern',
    label: 'Modern',
    description: 'Fraunces + Inter',
    sample: 'Mama Li',
    serif: '"Fraunces", Georgia, serif',
    sans: '"Inter", system-ui, sans-serif',
  },
  {
    value: 'sans',
    label: 'Clean sans',
    description: 'Inter throughout',
    sample: 'Mama Li',
    serif: '"Inter", system-ui, sans-serif',
    sans: '"Inter", system-ui, sans-serif',
  },
] as const;

const PALETTE_OPTIONS = [
  {
    value: 'jade',
    label: 'Jade',
    description: 'The current brand. Warm cream + imperial green.',
    swatches: ['#f5eedc', '#ede4cc', '#1c1813', '#1f4a38'],
  },
  {
    value: 'coral',
    label: 'Coral',
    description: 'Warmer, brighter. Reads more friendly than corporate.',
    swatches: ['#fbf2eb', '#f3e3d4', '#1c1813', '#b54a2f'],
  },
  {
    value: 'charcoal',
    label: 'Charcoal',
    description: 'Subtler, more editorial. Closest to neutral.',
    swatches: ['#f1efe8', '#e6e3d8', '#1a1a18', '#2c2c2a'],
  },
  {
    value: 'gold',
    label: 'Gold',
    description: 'Premium, restaurant-evening feel. Bronze accent.',
    swatches: ['#f6efde', '#ede4c8', '#1c1813', '#a67428'],
  },
] as const;

export default function SettingsClient({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const [form, setForm] = useState<SiteSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr('');
    setSavedMessage('');
    try {
      if (isMockMode()) {
        await new Promise((r) => setTimeout(r, 500));
        setSavedMessage('Saved. (Mock mode — no real change.)');
      } else {
        const res = await fetch('/admin/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || 'Save failed.');
        }
        setSavedMessage('Saved. The live site will reflect changes within a minute.');
        router.refresh();
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card>
          <h2
            style={{
              fontFamily: 'Newsreader, serif',
              fontWeight: 500,
              fontSize: 18,
              margin: '0 0 16px',
            }}
          >
            Brand
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
              gap: 20,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Brand name">
                <TextInput value={form.brand_name} onChange={(v) => set('brand_name', v)} />
              </Field>
              <Field label="Tagline" hint="Small text under the brand name in the nav.">
                <TextInput
                  value={form.brand_tagline}
                  onChange={(v) => set('brand_tagline', v)}
                />
              </Field>
            </div>
            <ImageField
              label="Logo"
              value={form.logo_url}
              onChange={(v) => set('logo_url', v ?? null)}
            />
          </div>
        </Card>

        <Card>
          <h2
            style={{
              fontFamily: 'Newsreader, serif',
              fontWeight: 500,
              fontSize: 18,
              margin: '0 0 16px',
            }}
          >
            Theme
          </h2>

          {/* Palette swatches */}
          <div style={{ marginBottom: 26 }}>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#5a524a',
                marginBottom: 10,
              }}
            >
              Palette
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 10,
              }}
            >
              {PALETTE_OPTIONS.map((p) => {
                const selected = form.palette === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => set('palette', p.value as SiteSettings['palette'])}
                    style={{
                      background: '#ffffff',
                      border: '1px solid ' + (selected ? '#1c1813' : '#e6e1d4'),
                      boxShadow: selected ? '0 0 0 1px #1c1813' : 'none',
                      padding: 14,
                      borderRadius: 5,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 4 }}>
                      {p.swatches.map((c, i) => (
                        <span
                          key={i}
                          style={{
                            width: 24,
                            height: 24,
                            background: c,
                            borderRadius: 2,
                            border: '1px solid rgba(0,0,0,0.05)',
                          }}
                        />
                      ))}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Newsreader, serif', fontSize: 16, color: '#1c1813' }}>
                        {p.label}
                      </div>
                      <div style={{ fontSize: 11, color: '#5a524a', marginTop: 2, lineHeight: 1.45 }}>
                        {p.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font pairings */}
          <div>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#5a524a',
                marginBottom: 10,
              }}
            >
              Font pairing
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 10,
              }}
            >
              {FONT_OPTIONS.map((f) => {
                const selected = form.font_pairing === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => set('font_pairing', f.value as SiteSettings['font_pairing'])}
                    style={{
                      background: '#ffffff',
                      border: '1px solid ' + (selected ? '#1c1813' : '#e6e1d4'),
                      boxShadow: selected ? '0 0 0 1px #1c1813' : 'none',
                      padding: 14,
                      borderRadius: 5,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: f.serif,
                        fontSize: 30,
                        lineHeight: 1,
                        color: '#1c1813',
                        fontStyle: 'italic',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {f.sample}
                    </div>
                    <div
                      style={{
                        fontFamily: f.sans,
                        fontSize: 11,
                        color: '#5a524a',
                        lineHeight: 1.4,
                      }}
                    >
                      The quick brown fox jumps.
                    </div>
                    <div
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 10,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: '#5a524a',
                        marginTop: 4,
                      }}
                    >
                      {f.label} · {f.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <Card>
          <h2
            style={{
              fontFamily: 'Newsreader, serif',
              fontWeight: 500,
              fontSize: 18,
              margin: '0 0 16px',
            }}
          >
            Hero (homepage)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Kicker (small caps line above headline)">
              <TextInput value={form.hero_kicker} onChange={(v) => set('hero_kicker', v)} />
            </Field>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 10,
              }}
            >
              <Field label="Headline — line 1">
                <TextInput
                  value={form.hero_headline_1}
                  onChange={(v) => set('hero_headline_1', v)}
                />
              </Field>
              <Field label="Headline — line 2 (italic accent)">
                <TextInput
                  value={form.hero_headline_2}
                  onChange={(v) => set('hero_headline_2', v)}
                />
              </Field>
              <Field label="Headline — line 3">
                <TextInput
                  value={form.hero_headline_3}
                  onChange={(v) => set('hero_headline_3', v)}
                />
              </Field>
            </div>
            <Field label="Body paragraph">
              <TextArea value={form.hero_body} onChange={(v) => set('hero_body', v)} rows={3} />
            </Field>
            <ImageField
              label="Hero image"
              value={form.hero_img}
              onChange={(v) => set('hero_img', v ?? null)}
            />
          </div>
        </Card>

        <Card>
          <h2
            style={{
              fontFamily: 'Newsreader, serif',
              fontWeight: 500,
              fontSize: 18,
              margin: '0 0 16px',
            }}
          >
            Commerce
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 14,
            }}
          >
            <Field label="Minimum order (£)" hint="Cart total below this blocks checkout.">
              <NumberInput
                value={form.min_spend}
                onChange={(v) => set('min_spend', v)}
                min={0}
                step={10}
              />
            </Field>
            <Field label="Delivery fee (£)">
              <NumberInput
                value={form.delivery_fee}
                onChange={(v) => set('delivery_fee', v)}
                min={0}
                step={1}
              />
            </Field>
            <Field label="VAT rate" hint="As a decimal, e.g. 0.20 for 20%.">
              <NumberInput
                value={form.vat_rate}
                onChange={(v) => set('vat_rate', v)}
                min={0}
                max={1}
                step={0.01}
              />
            </Field>
            <Field
              label="Allowed postcode areas"
              hint="Comma-separated, e.g. 'EC1, EC2, EC3, EC4'."
            >
              <TextInput
                value={form.postcode_areas.join(', ')}
                onChange={(v) =>
                  set(
                    'postcode_areas',
                    v.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
                  )
                }
              />
            </Field>
          </div>
        </Card>

        <Card>
          <h2
            style={{
              fontFamily: 'Newsreader, serif',
              fontWeight: 500,
              fontSize: 18,
              margin: '0 0 16px',
            }}
          >
            Contact &amp; footer
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 14,
              }}
            >
              <Field label="Contact email">
                <TextInput
                  value={form.contact_email}
                  onChange={(v) => set('contact_email', v)}
                />
              </Field>
              <Field label="Contact phone">
                <TextInput
                  value={form.contact_phone}
                  onChange={(v) => set('contact_phone', v)}
                />
              </Field>
            </div>
            <Field label="Footer blurb">
              <TextArea
                value={form.footer_blurb}
                onChange={(v) => set('footer_blurb', v)}
                rows={2}
              />
            </Field>
            <Field
              label="Trust strip companies"
              hint="Comma-separated names that scroll across the trust strip."
            >
              <TextInput
                value={form.trust_logos.join(', ')}
                onChange={(v) =>
                  set('trust_logos', v.split(',').map((s) => s.trim()).filter(Boolean))
                }
              />
            </Field>
          </div>
        </Card>

        {err && (
          <Card style={{ background: '#fbeeec', borderColor: '#f0c1bb', color: '#b43e2e' }}>
            {err}
          </Card>
        )}
        {savedMessage && (
          <Card style={{ background: '#eaf3ee', borderColor: '#b9d6c4', color: '#1f4a38' }}>
            {savedMessage}
          </Card>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Btn>
        </div>
      </div>
    </form>
  );
}
