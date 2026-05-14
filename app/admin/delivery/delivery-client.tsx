'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TimeslotRow, LocationRow, BlockedDate, SlotOverride } from './page';
import {
  Card,
  Btn,
  Badge,
  Field,
  TextInput,
  NumberInput,
  Checkbox,
  DataTable,
  Empty,
  Select,
} from '@/components/admin-ui';
import { isMockMode } from '@/lib/mock';

// ─────────────────────────────────────────────────────────────
//  Delivery editor — three managed lists on one page.
// ─────────────────────────────────────────────────────────────

type Section = 'slots' | 'locations' | 'calendar';

export default function DeliveryClient({
  timeslots,
  locations,
  blockedDates,
  slotOverrides,
}: {
  timeslots: TimeslotRow[];
  locations: LocationRow[];
  blockedDates: BlockedDate[];
  slotOverrides: SlotOverride[];
}) {
  const [section, setSection] = useState<Section>('slots');
  const [slots, setSlots] = useState(timeslots);
  const [locs, setLocs] = useState(locations);
  const [blocks, setBlocks] = useState(blockedDates);
  const [overrides, setOverrides] = useState(slotOverrides);

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {(
          [
            { id: 'slots' as Section, label: 'Time slots', count: slots.length },
            { id: 'locations' as Section, label: 'Pickup locations', count: locs.length },
            {
              id: 'calendar' as Section,
              label: 'Closures & overrides',
              count: blocks.length + overrides.length,
            },
          ]
        ).map((s) => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
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
              {s.label}{' '}
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  opacity: 0.55,
                  marginLeft: 4,
                }}
              >
                {s.count}
              </span>
            </button>
          );
        })}
      </div>

      {section === 'slots' && <TimeslotsSection slots={slots} setSlots={setSlots} />}
      {section === 'locations' && <LocationsSection locs={locs} setLocs={setLocs} />}
      {section === 'calendar' && (
        <CalendarSection
          slots={slots}
          blocks={blocks}
          setBlocks={setBlocks}
          overrides={overrides}
          setOverrides={setOverrides}
        />
      )}
    </div>
  );
}

// ─────────── Timeslots section ───────────

function TimeslotsSection({
  slots,
  setSlots,
}: {
  slots: TimeslotRow[];
  setSlots: (s: TimeslotRow[]) => void;
}) {
  const [editing, setEditing] = useState<TimeslotRow | null>(null);

  const openNew = () =>
    setEditing({
      id: '',
      label: '',
      tag: 'Lunch',
      sort_order: (slots.length + 1) * 10,
      active: true,
      default_capacity: 2,
    });

  const saved = (s: TimeslotRow, isNew: boolean) => {
    setSlots(isNew ? [...slots, s] : slots.map((x) => (x.id === s.id ? s : x)));
    setEditing(null);
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this slot from the customer site? Past orders keep referencing it.')) return;
    if (!isMockMode()) {
      const res = await fetch(`/admin/api/timeslots/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) return alert('Delete failed.');
    }
    setSlots(slots.filter((s) => s.id !== id));
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Btn variant="primary" onClick={openNew}>
          + New slot
        </Btn>
      </div>
      <Card noPad>
        {slots.length === 0 ? (
          <Empty
            title="No delivery slots"
            hint="Add at least one slot or customers won't be able to pick a delivery time."
          />
        ) : (
          <DataTable
            columns={[
              { key: 'label', label: 'Slot' },
              { key: 'tag', label: 'Tag' },
              { key: 'cap', label: 'Default capacity', align: 'right' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: '', align: 'right' },
            ]}
            rows={slots.map((s) => ({
              id: s.id,
              cells: [
                <div key="label">
                  <div style={{ fontFamily: 'Newsreader, serif', fontSize: 15 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: '#5a524a' }}>{s.id}</div>
                </div>,
                <span key="tag" style={{ color: '#5a524a' }}>
                  {s.tag}
                </span>,
                <span
                  key="cap"
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}
                >
                  {s.default_capacity}
                </span>,
                <Badge key="status" tone={s.active ? 'good' : 'neutral'}>
                  {s.active ? 'Live' : 'Hidden'}
                </Badge>,
                <div key="actions" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <Btn size="sm" variant="secondary" onClick={() => setEditing(s)}>
                    Edit
                  </Btn>
                  <Btn size="sm" variant="danger" onClick={() => remove(s.id)}>
                    Remove
                  </Btn>
                </div>,
              ],
            }))}
          />
        )}
      </Card>
      {editing && (
        <TimeslotForm
          initial={editing}
          existing={slots}
          onClose={() => setEditing(null)}
          onSaved={saved}
        />
      )}
    </>
  );
}

function TimeslotForm({
  initial,
  existing,
  onClose,
  onSaved,
}: {
  initial: TimeslotRow;
  existing: TimeslotRow[];
  onClose: () => void;
  onSaved: (s: TimeslotRow, isNew: boolean) => void;
}) {
  const isNew = !existing.some((x) => x.id === initial.id);
  const [form, setForm] = useState<TimeslotRow>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!form.id.match(/^[a-z0-9-]+$/)) {
      setErr('ID must be lowercase letters, numbers and hyphens (e.g. "12-13").');
      return;
    }
    if (!form.label.trim()) {
      setErr('Label is required.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      if (isMockMode()) {
        await new Promise((r) => setTimeout(r, 300));
        onSaved(form, isNew);
        return;
      }
      const url = isNew
        ? `/admin/api/timeslots`
        : `/admin/api/timeslots/${encodeURIComponent(form.id)}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Save failed.');
      }
      onSaved(form, isNew);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title={isNew ? 'New time slot' : `Edit ${form.label || 'slot'}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="ID" hint="Lowercase. Used internally, e.g. '12-13'.">
          <TextInput
            value={form.id}
            onChange={(v) => setForm({ ...form, id: v.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
            disabled={!isNew}
            placeholder="12-13"
          />
        </Field>
        <Field label="Label (shown to customers)">
          <TextInput
            value={form.label}
            onChange={(v) => setForm({ ...form, label: v })}
            placeholder="12:00 – 13:00"
          />
        </Field>
        <Field label="Tag" hint="A short note, e.g. 'Lunch', 'Tea', 'Reception'.">
          <TextInput value={form.tag} onChange={(v) => setForm({ ...form, tag: v })} />
        </Field>
        <Field
          label="Default capacity"
          hint="Maximum orders accepted in this slot on a normal day."
        >
          <NumberInput
            value={form.default_capacity}
            onChange={(v) => setForm({ ...form, default_capacity: v })}
            min={0}
          />
        </Field>
        <Field label="Sort order">
          <NumberInput
            value={form.sort_order}
            onChange={(v) => setForm({ ...form, sort_order: v })}
            step={10}
          />
        </Field>
        <Checkbox
          checked={form.active}
          onChange={(v) => setForm({ ...form, active: v })}
          label="Show on the live site"
        />
      </div>
      {err && (
        <div style={{ color: '#b43e2e', fontSize: 13, marginTop: 12 }}>{err}</div>
      )}
      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn variant="primary" onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Btn>
      </div>
    </Modal>
  );
}

// ─────────── Locations section ───────────

function LocationsSection({
  locs,
  setLocs,
}: {
  locs: LocationRow[];
  setLocs: (l: LocationRow[]) => void;
}) {
  const [editing, setEditing] = useState<LocationRow | null>(null);

  const openNew = () =>
    setEditing({
      id: '',
      name: '',
      addr: '',
      pickup: '',
      cn: '',
      sort_order: (locs.length + 1) * 10,
      active: true,
    });

  const saved = (l: LocationRow, isNew: boolean) => {
    setLocs(isNew ? [...locs, l] : locs.map((x) => (x.id === l.id ? l : x)));
    setEditing(null);
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this pickup location?')) return;
    if (!isMockMode()) {
      const res = await fetch(`/admin/api/locations/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) return alert('Delete failed.');
    }
    setLocs(locs.filter((l) => l.id !== id));
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Btn variant="primary" onClick={openNew}>
          + New location
        </Btn>
      </div>
      <Card noPad>
        {locs.length === 0 ? (
          <Empty title="No pickup locations" hint="Customers can still place delivery orders." />
        ) : (
          <DataTable
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'addr', label: 'Address' },
              { key: 'pickup', label: 'Pickup' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: '', align: 'right' },
            ]}
            rows={locs.map((l) => ({
              id: l.id,
              cells: [
                <div key="name" style={{ fontFamily: 'Newsreader, serif', fontSize: 15 }}>
                  {l.name}
                  {l.cn && (
                    <span style={{ fontSize: 12, color: '#5a524a', marginLeft: 6 }}>{l.cn}</span>
                  )}
                </div>,
                <span key="addr" style={{ fontSize: 12, color: '#5a524a' }}>
                  {l.addr}
                </span>,
                <span key="pickup" style={{ fontSize: 12, color: '#5a524a' }}>
                  {l.pickup}
                </span>,
                <Badge key="status" tone={l.active ? 'good' : 'neutral'}>
                  {l.active ? 'Live' : 'Hidden'}
                </Badge>,
                <div key="actions" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <Btn size="sm" variant="secondary" onClick={() => setEditing(l)}>
                    Edit
                  </Btn>
                  <Btn size="sm" variant="danger" onClick={() => remove(l.id)}>
                    Remove
                  </Btn>
                </div>,
              ],
            }))}
          />
        )}
      </Card>
      {editing && (
        <LocationForm
          initial={editing}
          existing={locs}
          onClose={() => setEditing(null)}
          onSaved={saved}
        />
      )}
    </>
  );
}

function LocationForm({
  initial,
  existing,
  onClose,
  onSaved,
}: {
  initial: LocationRow;
  existing: LocationRow[];
  onClose: () => void;
  onSaved: (l: LocationRow, isNew: boolean) => void;
}) {
  const isNew = !existing.some((x) => x.id === initial.id);
  const [form, setForm] = useState<LocationRow>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!form.id.match(/^[a-z0-9-]+$/)) {
      setErr('ID must be lowercase letters, numbers and hyphens.');
      return;
    }
    if (!form.name.trim()) {
      setErr('Name is required.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      if (isMockMode()) {
        await new Promise((r) => setTimeout(r, 300));
        onSaved(form, isNew);
        return;
      }
      const url = isNew
        ? `/admin/api/locations`
        : `/admin/api/locations/${encodeURIComponent(form.id)}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Save failed.');
      }
      onSaved(form, isNew);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title={isNew ? 'New pickup location' : `Edit ${form.name || 'location'}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="ID" hint="Lowercase. e.g. 'london-wall'.">
          <TextInput
            value={form.id}
            onChange={(v) => setForm({ ...form, id: v.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
            disabled={!isNew}
          />
        </Field>
        <Field label="Name (shown to customers)">
          <TextInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        </Field>
        <Field label="Address">
          <TextInput value={form.addr} onChange={(v) => setForm({ ...form, addr: v })} />
        </Field>
        <Field label="Pickup instructions" hint="E.g. 'Side door, please ring bell.'">
          <TextInput value={form.pickup} onChange={(v) => setForm({ ...form, pickup: v })} />
        </Field>
        <Field label="Chinese name" hint="Optional, shown as a subtle subtitle.">
          <TextInput value={form.cn} onChange={(v) => setForm({ ...form, cn: v })} />
        </Field>
        <Field label="Sort order">
          <NumberInput
            value={form.sort_order}
            onChange={(v) => setForm({ ...form, sort_order: v })}
            step={10}
          />
        </Field>
        <Checkbox
          checked={form.active}
          onChange={(v) => setForm({ ...form, active: v })}
          label="Show on the live site"
        />
      </div>
      {err && <div style={{ color: '#b43e2e', fontSize: 13, marginTop: 12 }}>{err}</div>}
      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn variant="primary" onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Btn>
      </div>
    </Modal>
  );
}

// ─────────── Calendar section ───────────

function CalendarSection({
  slots,
  blocks,
  setBlocks,
  overrides,
  setOverrides,
}: {
  slots: TimeslotRow[];
  blocks: BlockedDate[];
  setBlocks: (b: BlockedDate[]) => void;
  overrides: SlotOverride[];
  setOverrides: (o: SlotOverride[]) => void;
}) {
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);

  const fmtDate = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const slotLabel = (id: string) => slots.find((s) => s.id === id)?.label ?? id;

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
        }}
      >
        <Card>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                fontFamily: 'Newsreader, serif',
                fontWeight: 500,
                fontSize: 18,
                margin: 0,
              }}
            >
              Closures
            </h2>
            <Btn size="sm" variant="primary" onClick={() => setShowBlockForm(true)}>
              + Block date
            </Btn>
          </div>
          <p style={{ fontSize: 13, color: '#5a524a', margin: '0 0 14px' }}>
            Mark whole days as not-delivering (bank holidays, kitchen closures, sold out).
          </p>
          {blocks.length === 0 ? (
            <Empty title="No closures" />
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {blocks.map((b) => (
                <li
                  key={b.date}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: '1px dashed #e6e1d4',
                    fontSize: 13,
                  }}
                >
                  <div>
                    <div style={{ fontFamily: 'Newsreader, serif', fontSize: 15 }}>
                      {fmtDate(b.date)}
                    </div>
                    {b.reason && (
                      <div style={{ fontSize: 11, color: '#5a524a' }}>{b.reason}</div>
                    )}
                  </div>
                  <Btn
                    size="sm"
                    variant="danger"
                    onClick={async () => {
                      if (!confirm('Unblock this date?')) return;
                      if (!isMockMode()) {
                        await fetch(
                          `/admin/api/blocked-dates/${encodeURIComponent(b.date)}`,
                          { method: 'DELETE' }
                        );
                      }
                      setBlocks(blocks.filter((x) => x.date !== b.date));
                    }}
                  >
                    Unblock
                  </Btn>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                fontFamily: 'Newsreader, serif',
                fontWeight: 500,
                fontSize: 18,
                margin: 0,
              }}
            >
              Slot overrides
            </h2>
            <Btn size="sm" variant="primary" onClick={() => setShowOverrideForm(true)}>
              + Override
            </Btn>
          </div>
          <p style={{ fontSize: 13, color: '#5a524a', margin: '0 0 14px' }}>
            Change one slot&apos;s capacity on a specific date. Set to 0 to close just that slot.
          </p>
          {overrides.length === 0 ? (
            <Empty title="No overrides" />
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {overrides.map((o, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: '1px dashed #e6e1d4',
                    fontSize: 13,
                  }}
                >
                  <div>
                    <div style={{ fontFamily: 'Newsreader, serif', fontSize: 14 }}>
                      {fmtDate(o.date)} · {slotLabel(o.slot_id)}
                    </div>
                    <div style={{ fontSize: 11, color: '#5a524a' }}>
                      Capacity: <strong style={{ color: '#1c1813' }}>{o.capacity}</strong>
                      {o.reason && ` · ${o.reason}`}
                    </div>
                  </div>
                  <Btn
                    size="sm"
                    variant="danger"
                    onClick={async () => {
                      if (!confirm('Remove override?')) return;
                      if (!isMockMode()) {
                        await fetch(
                          `/admin/api/slot-overrides/${encodeURIComponent(o.date)}/${encodeURIComponent(o.slot_id)}`,
                          { method: 'DELETE' }
                        );
                      }
                      setOverrides(
                        overrides.filter((x) => !(x.date === o.date && x.slot_id === o.slot_id))
                      );
                    }}
                  >
                    Remove
                  </Btn>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {showBlockForm && (
        <BlockDateForm
          onClose={() => setShowBlockForm(false)}
          onSaved={(b) => {
            setBlocks([...blocks, b].sort((a, c) => a.date.localeCompare(c.date)));
            setShowBlockForm(false);
          }}
        />
      )}
      {showOverrideForm && (
        <SlotOverrideForm
          slots={slots}
          onClose={() => setShowOverrideForm(false)}
          onSaved={(o) => {
            const next = overrides.filter((x) => !(x.date === o.date && x.slot_id === o.slot_id));
            setOverrides([...next, o].sort((a, c) => a.date.localeCompare(c.date)));
            setShowOverrideForm(false);
          }}
        />
      )}
    </>
  );
}

function BlockDateForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (b: BlockedDate) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!date) {
      setErr('Pick a date.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      if (!isMockMode()) {
        const res = await fetch(`/admin/api/blocked-dates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, reason }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || 'Save failed.');
        }
      } else {
        await new Promise((r) => setTimeout(r, 250));
      }
      onSaved({ date, reason });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Block a date">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Date">
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            style={{
              background: '#ffffff',
              border: '1px solid #d9cfb6',
              padding: '10px 12px',
              fontSize: 14,
              borderRadius: 4,
              fontFamily: 'inherit',
              color: '#1c1813',
            }}
          />
        </Field>
        <Field label="Reason (internal)" hint="E.g. 'Bank holiday', 'Kitchen closed for service'.">
          <TextInput value={reason} onChange={setReason} />
        </Field>
      </div>
      {err && <div style={{ color: '#b43e2e', fontSize: 13, marginTop: 12 }}>{err}</div>}
      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn variant="primary" onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : 'Block date'}
        </Btn>
      </div>
    </Modal>
  );
}

function SlotOverrideForm({
  slots,
  onClose,
  onSaved,
}: {
  slots: TimeslotRow[];
  onClose: () => void;
  onSaved: (o: SlotOverride) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [slotId, setSlotId] = useState(slots[0]?.id ?? '');
  const [capacity, setCapacity] = useState(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!slotId) {
      setErr('Pick a slot.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      if (!isMockMode()) {
        const res = await fetch(`/admin/api/slot-overrides`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, slot_id: slotId, capacity, reason }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || 'Save failed.');
        }
      } else {
        await new Promise((r) => setTimeout(r, 250));
      }
      onSaved({ date, slot_id: slotId, capacity, reason });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Override slot capacity">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Date">
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            style={{
              background: '#ffffff',
              border: '1px solid #d9cfb6',
              padding: '10px 12px',
              fontSize: 14,
              borderRadius: 4,
              fontFamily: 'inherit',
              color: '#1c1813',
            }}
          />
        </Field>
        <Field label="Slot">
          <Select<string>
            value={slotId}
            onChange={setSlotId}
            options={slots.map((s) => ({ value: s.id, label: s.label }))}
          />
        </Field>
        <Field label="Capacity for that date" hint="0 means close just this slot for this date.">
          <NumberInput value={capacity} onChange={setCapacity} min={0} />
        </Field>
        <Field label="Reason (internal)">
          <TextInput value={reason} onChange={setReason} />
        </Field>
      </div>
      {err && <div style={{ color: '#b43e2e', fontSize: 13, marginTop: 12 }}>{err}</div>}
      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Btn variant="ghost" onClick={onClose}>
          Cancel
        </Btn>
        <Btn variant="primary" onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : 'Save override'}
        </Btn>
      </div>
    </Modal>
  );
}

// ─────────── Shared modal ───────────

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
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
          maxWidth: 480,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <h2
          style={{
            fontFamily: 'Newsreader, serif',
            fontWeight: 500,
            fontSize: 22,
            margin: '0 0 20px',
          }}
        >
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
