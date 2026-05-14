'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Application } from './page';
import { Card, Btn, Badge, DataTable, Empty } from '@/components/admin-ui';
import { isMockMode } from '@/lib/mock';

// ─────────────────────────────────────────────────────────────
//  Applications client — filter, view, approve, reject.
// ─────────────────────────────────────────────────────────────

type Filter = 'pending' | 'approved' | 'rejected' | 'all';

export default function ApplicationsClient({ initial }: { initial: Application[] }) {
  const router = useRouter();
  const [apps, setApps] = useState(initial);
  const [filter, setFilter] = useState<Filter>('pending');
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Application | null>(null);

  const filtered = useMemo(
    () => (filter === 'all' ? apps : apps.filter((a) => a.status === filter)),
    [apps, filter]
  );

  const counts = useMemo(
    () => ({
      pending: apps.filter((a) => a.status === 'pending').length,
      approved: apps.filter((a) => a.status === 'approved').length,
      rejected: apps.filter((a) => a.status === 'rejected').length,
      all: apps.length,
    }),
    [apps]
  );

  const updateLocal = (id: string, status: Application['status']) => {
    setApps((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status, reviewed_at: new Date().toISOString() } : a
      )
    );
    if (selected?.id === id) setSelected(null);
  };

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusy(id);
    try {
      if (isMockMode()) {
        await new Promise((r) => setTimeout(r, 400));
        updateLocal(id, action === 'approve' ? 'approved' : 'rejected');
      } else {
        const res = await fetch(`/admin/api/applications/${id}/${action}`, { method: 'POST' });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `${action} failed`);
        }
        updateLocal(id, action === 'approve' ? 'approved' : 'rejected');
        router.refresh();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {(
          [
            { id: 'pending' as Filter, label: 'Pending' },
            { id: 'approved' as Filter, label: 'Approved' },
            { id: 'rejected' as Filter, label: 'Rejected' },
            { id: 'all' as Filter, label: 'All' },
          ]
        ).map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
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
              {f.label}{' '}
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  opacity: 0.55,
                  marginLeft: 4,
                }}
              >
                {counts[f.id]}
              </span>
            </button>
          );
        })}
      </div>

      <Card noPad>
        {filtered.length === 0 ? (
          <Empty title="Nothing here" hint={`No ${filter === 'all' ? '' : filter + ' '}applications.`} />
        ) : (
          <DataTable
            columns={[
              { key: 'name', label: 'Applicant' },
              { key: 'company', label: 'Company' },
              { key: 'sector', label: 'Sector' },
              { key: 'created', label: 'Submitted', align: 'right' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: '', align: 'right' },
            ]}
            rows={filtered.map((a) => ({
              id: a.id,
              cells: [
                <div key="name">
                  <div style={{ fontFamily: 'Newsreader, serif', fontSize: 15 }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: '#5a524a' }}>{a.email}</div>
                </div>,
                <div key="company">
                  <div>{a.company}</div>
                  <div style={{ fontSize: 11, color: '#5a524a' }}>{a.phone}</div>
                </div>,
                <span key="sector" style={{ color: '#5a524a' }}>
                  {a.company_type ?? '—'}
                </span>,
                <span key="created" style={{ fontSize: 12, color: '#5a524a' }}>
                  {new Date(a.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>,
                <span key="status">
                  <Badge
                    tone={
                      a.status === 'pending'
                        ? 'attention'
                        : a.status === 'approved'
                          ? 'good'
                          : 'warn'
                    }
                  >
                    {a.status}
                  </Badge>
                </span>,
                <div key="actions" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <Btn size="sm" variant="ghost" onClick={() => setSelected(a)}>
                    Details
                  </Btn>
                  {a.status === 'pending' && (
                    <>
                      <Btn
                        size="sm"
                        variant="primary"
                        disabled={busy === a.id}
                        onClick={() => act(a.id, 'approve')}
                      >
                        Approve
                      </Btn>
                      <Btn
                        size="sm"
                        variant="danger"
                        disabled={busy === a.id}
                        onClick={() => {
                          if (confirm(`Reject application from ${a.name} (${a.company})?`)) {
                            act(a.id, 'reject');
                          }
                        }}
                      >
                        Reject
                      </Btn>
                    </>
                  )}
                </div>,
              ],
            }))}
          />
        )}
      </Card>

      {/* Details drawer */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(28,24,19,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 6,
              padding: 28,
              maxWidth: 560,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: 22, margin: 0 }}>
              {selected.company}
            </h2>
            <p style={{ color: '#5a524a', margin: '6px 0 20px', fontSize: 13 }}>
              {selected.name} · {selected.email}
            </p>
            <dl style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 8, columnGap: 12, fontSize: 13 }}>
              <dt style={{ color: '#5a524a' }}>Phone</dt>
              <dd style={{ margin: 0 }}>{selected.phone}</dd>
              <dt style={{ color: '#5a524a' }}>Sector</dt>
              <dd style={{ margin: 0 }}>{selected.company_type ?? '—'}</dd>
              <dt style={{ color: '#5a524a' }}>Frequency</dt>
              <dd style={{ margin: 0 }}>{selected.frequency ?? '—'}</dd>
              <dt style={{ color: '#5a524a' }}>Billing email</dt>
              <dd style={{ margin: 0 }}>{selected.billing ?? '—'}</dd>
              <dt style={{ color: '#5a524a' }}>Submitted</dt>
              <dd style={{ margin: 0 }}>{new Date(selected.created_at).toLocaleString('en-GB')}</dd>
              <dt style={{ color: '#5a524a' }}>Status</dt>
              <dd style={{ margin: 0 }}>
                <Badge tone={selected.status === 'pending' ? 'attention' : selected.status === 'approved' ? 'good' : 'warn'}>
                  {selected.status}
                </Badge>
              </dd>
            </dl>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn variant="ghost" onClick={() => setSelected(null)}>
                Close
              </Btn>
              {selected.status === 'pending' && (
                <>
                  <Btn
                    variant="danger"
                    onClick={() => {
                      if (confirm('Reject this application?')) act(selected.id, 'reject');
                    }}
                  >
                    Reject
                  </Btn>
                  <Btn variant="primary" onClick={() => act(selected.id, 'approve')}>
                    Approve and send sign-in link
                  </Btn>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
