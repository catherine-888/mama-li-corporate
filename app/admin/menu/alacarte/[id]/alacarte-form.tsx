'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Btn, Field, TextInput, NumberInput, Checkbox } from '@/components/admin-ui';
import { isMockMode } from '@/lib/mock';
import type { AlacarteFormShape } from './page';

export default function AlacarteForm({
  initial,
  mode,
}: {
  initial: AlacarteFormShape;
  mode: 'edit' | 'new';
}) {
  const router = useRouter();
  const [form, setForm] = useState<AlacarteFormShape>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = <K extends keyof AlacarteFormShape>(k: K, v: AlacarteFormShape[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      if (isMockMode()) {
        await new Promise((r) => setTimeout(r, 400));
        router.push('/admin/menu');
        return;
      }
      const url = mode === 'new' ? `/admin/api/alacarte` : `/admin/api/alacarte/${encodeURIComponent(form.id)}`;
      const method = mode === 'new' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Save failed');
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
    if (!confirm(`Delete "${form.name}"?`)) return;
    setSaving(true);
    if (!isMockMode()) {
      await fetch(`/admin/api/alacarte/${encodeURIComponent(form.id)}`, { method: 'DELETE' });
    }
    router.push('/admin/menu');
    router.refresh();
  };

  return (
    <form onSubmit={submit}>
      <Card style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'new' && (
            <Field label="ID" hint="Lowercase letters, numbers, hyphens.">
              <TextInput
                value={form.id}
                onChange={(v) => set('id', v.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="e.g. a-soda"
              />
            </Field>
          )}
          <Field label="Name">
            <TextInput value={form.name} onChange={(v) => set('name', v)} />
          </Field>
          <Field label="Section" hint="Groups items on the menu, e.g. 'Sides', 'Drinks', 'Pantry'.">
            <TextInput value={form.cat} onChange={(v) => set('cat', v)} />
          </Field>
          <Field label="Price (£, ex-VAT)">
            <NumberInput value={form.price} onChange={(v) => set('price', v)} min={0} step={0.5} />
          </Field>
          <Field label="Sort order" hint="Lower numbers appear first.">
            <NumberInput value={form.sort_order} onChange={(v) => set('sort_order', v)} step={10} />
          </Field>
          <Checkbox checked={form.visible} onChange={(v) => set('visible', v)} label="Show on the live menu" />
        </div>
      </Card>
      {err && (
        <Card style={{ marginTop: 14, background: '#fbeeec', borderColor: '#f0c1bb', color: '#b43e2e' }}>
          {err}
        </Card>
      )}
      <div style={{ marginTop: 18, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        {mode === 'edit' ? (
          <Btn variant="danger" onClick={remove} disabled={saving}>
            Delete
          </Btn>
        ) : (
          <span />
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" href="/admin/menu">
            Cancel
          </Btn>
          <Btn variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Btn>
        </div>
      </div>
    </form>
  );
}
