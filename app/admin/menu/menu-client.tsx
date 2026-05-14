'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { BundleRow, AlacarteRow } from './page';
import { Card, Badge, Btn, DataTable, Empty } from '@/components/admin-ui';
import { money } from '@/lib/order';
import { isMockMode } from '@/lib/mock';

type Tab = 'bundles' | 'alacarte';

export default function MenuClient({
  bundles,
  alacarte,
}: {
  bundles: BundleRow[];
  alacarte: AlacarteRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('bundles');
  const [items, setItems] = useState({ bundles, alacarte });
  const [busy, setBusy] = useState<string | null>(null);

  const toggleVisible = async (kind: 'bundle' | 'alacarte', id: string, current: boolean) => {
    setBusy(id);
    const next = !current;
    // Optimistic
    if (kind === 'bundle') {
      setItems((s) => ({
        ...s,
        bundles: s.bundles.map((b) => (b.id === id ? { ...b, visible: next } : b)),
      }));
    } else {
      setItems((s) => ({
        ...s,
        alacarte: s.alacarte.map((a) => (a.id === id ? { ...a, visible: next } : a)),
      }));
    }
    if (!isMockMode()) {
      try {
        const url =
          kind === 'bundle'
            ? `/admin/api/bundles/${encodeURIComponent(id)}`
            : `/admin/api/alacarte/${encodeURIComponent(id)}`;
        const res = await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visible: next }),
        });
        if (!res.ok) throw new Error('Save failed');
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Save failed.');
        // Revert
        if (kind === 'bundle') {
          setItems((s) => ({
            ...s,
            bundles: s.bundles.map((b) => (b.id === id ? { ...b, visible: current } : b)),
          }));
        } else {
          setItems((s) => ({
            ...s,
            alacarte: s.alacarte.map((a) => (a.id === id ? { ...a, visible: current } : a)),
          }));
        }
      }
    }
    setBusy(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {(
          [
            { id: 'bundles' as Tab, label: 'Bundles', count: items.bundles.length },
            { id: 'alacarte' as Tab, label: 'À la carte', count: items.alacarte.length },
          ]
        ).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: active ? '#1c1813' : '#ffffff',
                color: active ? '#fafaf7' : '#1c1813',
                border: '1px solid ' + (active ? '#1c1813' : '#d9cfb6'),
                padding: '7px 14px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            >
              {t.label}{' '}
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, opacity: 0.55, marginLeft: 4 }}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      <Card noPad>
        {tab === 'bundles' ? (
          items.bundles.length === 0 ? (
            <Empty title="No bundles yet" hint="Click 'New bundle' to add one." />
          ) : (
            <DataTable
              columns={[
                { key: 'photo', label: '', width: '60px' },
                { key: 'name', label: 'Bundle' },
                { key: 'cat', label: 'Category' },
                { key: 'price', label: 'Price', align: 'right' },
                { key: 'visible', label: 'Status' },
                { key: 'actions', label: '', align: 'right' },
              ]}
              rows={items.bundles.map((b) => ({
                id: b.id,
                cells: [
                  <div
                    key="photo"
                    style={{
                      width: 44,
                      height: 36,
                      background: b.img
                        ? `url(${b.img}) center/cover`
                        : 'repeating-linear-gradient(135deg, #ede4cc 0 3px, transparent 3px 8px)',
                      borderRadius: 3,
                      border: '1px solid #e6e1d4',
                    }}
                  />,
                  <div key="name">
                    <div style={{ fontFamily: 'Newsreader, serif', fontSize: 15 }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: '#5a524a' }}>{b.subtitle}</div>
                  </div>,
                  <span key="cat" style={{ color: '#5a524a', textTransform: 'capitalize' }}>
                    {b.cat}
                  </span>,
                  <span key="price" style={{ fontFamily: 'Newsreader, serif', fontSize: 15 }}>
                    {money(b.price)}
                  </span>,
                  <Badge key="visible" tone={b.visible ? 'good' : 'neutral'}>
                    {b.visible ? 'Live' : 'Hidden'}
                  </Badge>,
                  <div key="actions" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <Btn
                      size="sm"
                      variant="ghost"
                      disabled={busy === b.id}
                      onClick={() => toggleVisible('bundle', b.id, b.visible)}
                    >
                      {b.visible ? 'Hide' : 'Show'}
                    </Btn>
                    <Btn size="sm" variant="secondary" href={`/admin/menu/${encodeURIComponent(b.id)}`}>
                      Edit
                    </Btn>
                  </div>,
                ],
              }))}
            />
          )
        ) : items.alacarte.length === 0 ? (
          <Empty title="No add-ons yet" hint="Add à la carte items like drinks, sides or extras." />
        ) : (
          <DataTable
            columns={[
              { key: 'name', label: 'Item' },
              { key: 'cat', label: 'Section' },
              { key: 'price', label: 'Price', align: 'right' },
              { key: 'visible', label: 'Status' },
              { key: 'actions', label: '', align: 'right' },
            ]}
            rows={items.alacarte.map((a) => ({
              id: a.id,
              cells: [
                <div key="name" style={{ fontFamily: 'Newsreader, serif', fontSize: 15 }}>
                  {a.name}
                </div>,
                <span key="cat" style={{ color: '#5a524a' }}>
                  {a.cat}
                </span>,
                <span key="price" style={{ fontFamily: 'Newsreader, serif', fontSize: 15 }}>
                  {money(a.price)}
                </span>,
                <Badge key="visible" tone={a.visible ? 'good' : 'neutral'}>
                  {a.visible ? 'Live' : 'Hidden'}
                </Badge>,
                <div key="actions" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <Btn
                    size="sm"
                    variant="ghost"
                    disabled={busy === a.id}
                    onClick={() => toggleVisible('alacarte', a.id, a.visible)}
                  >
                    {a.visible ? 'Hide' : 'Show'}
                  </Btn>
                  <Btn size="sm" variant="secondary" href={`/admin/menu/alacarte/${encodeURIComponent(a.id)}`}>
                    Edit
                  </Btn>
                </div>,
              ],
            }))}
          />
        )}
      </Card>
    </div>
  );
}
