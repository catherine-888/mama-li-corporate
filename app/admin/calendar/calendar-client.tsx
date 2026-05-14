'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { CalOrder } from './page';
import type { Timeslot } from '@/lib/types';
import { Card, Badge, Btn } from '@/components/admin-ui';
import { moneyExact } from '@/lib/order';

// ─────────────────────────────────────────────────────────────
//  Calendar client. Month grid on the left, day drill-down on
//  the right. Click a day cell to focus it. Method filter chips.
// ─────────────────────────────────────────────────────────────

type Method = 'all' | 'delivery' | 'pickup';

export default function CalendarClient({
  orders,
  timeslots,
}: {
  orders: CalOrder[];
  timeslots: Timeslot[];
}) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(today.toISOString().slice(0, 10));
  const [method, setMethod] = useState<Method>('all');

  const filtered = useMemo(
    () => (method === 'all' ? orders : orders.filter((o) => o.method === method)),
    [orders, method]
  );

  const byDay = useMemo(() => {
    const m: Record<string, CalOrder[]> = {};
    for (const o of filtered) {
      (m[o.delivery_date] ??= []).push(o);
    }
    for (const list of Object.values(m)) list.sort((a, b) => a.slot.localeCompare(b.slot));
    return m;
  }, [filtered]);

  const monthOrders = useMemo(() => {
    const start = new Date(cursor);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    return filtered.filter((o) => {
      const d = new Date(o.delivery_date + 'T00:00:00');
      return d >= start && d <= end;
    });
  }, [filtered, cursor]);

  const monthRev = monthOrders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'failed')
    .reduce((s, o) => s + o.total, 0);
  const monthHead = monthOrders.reduce((s, o) => s + o.headcount, 0);

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <NavBtn onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            ‹
          </NavBtn>
          <NavBtn
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            style={{ padding: '6px 14px', fontSize: 11 }}
          >
            Today
          </NavBtn>
          <NavBtn onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            ›
          </NavBtn>
          <h2
            style={{
              fontFamily: 'Newsreader, serif',
              fontWeight: 400,
              fontSize: 22,
              letterSpacing: '-0.02em',
              margin: 0,
              color: '#1c1813',
              marginLeft: 6,
            }}
          >
            {cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </h2>
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.16em',
              color: '#5a524a',
              textTransform: 'uppercase',
            }}
          >
            {monthOrders.length} orders · {moneyExact(monthRev)} · {monthHead} ppl
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <Chip active={method === 'all'} onClick={() => setMethod('all')}>
            All
          </Chip>
          <Chip active={method === 'delivery'} onClick={() => setMethod('delivery')}>
            Delivery
          </Chip>
          <Chip active={method === 'pickup'} onClick={() => setMethod('pickup')}>
            Pickup
          </Chip>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 14 }}>
        <Card noPad>
          <MonthGrid
            cursor={cursor}
            byDay={byDay}
            today={today.toISOString().slice(0, 10)}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
        </Card>
        <DayDrillDown
          dayKey={selectedDay}
          orders={byDay[selectedDay] ?? []}
          timeslots={timeslots}
        />
      </div>
    </div>
  );
}

function MonthGrid({
  cursor,
  byDay,
  today,
  selectedDay,
  onSelectDay,
}: {
  cursor: Date;
  byDay: Record<string, CalOrder[]>;
  today: string;
  selectedDay: string;
  onSelectDay: (d: string) => void;
}) {
  // Build a 6-week grid starting on Monday before/on the 1st
  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startDay = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - startDay);

  const cells: Date[] = [];
  const cellDate = new Date(gridStart);
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(cellDate));
    cellDate.setDate(cellDate.getDate() + 1);
  }

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          background: '#fafaf7',
          borderBottom: '1px solid #e6e1d4',
        }}
      >
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div
            key={d}
            style={{
              padding: '10px 12px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9.5,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#5a524a',
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((d) => {
          const key = d.toISOString().slice(0, 10);
          const inMonth = d.getMonth() === cursor.getMonth();
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const isToday = key === today;
          const isSel = key === selectedDay;
          const dayOrders = byDay[key] ?? [];

          return (
            <button
              key={key}
              onClick={() => onSelectDay(key)}
              style={{
                background: isSel ? '#1c1813' : isWeekend ? '#fafaf7' : '#ffffff',
                color: isSel ? '#fafaf7' : inMonth ? '#1c1813' : '#b4ab9a',
                border: 'none',
                borderRight: '1px solid #e6e1d4',
                borderBottom: '1px solid #e6e1d4',
                padding: '10px 10px',
                minHeight: 86,
                textAlign: 'left',
                cursor: 'pointer',
                position: 'relative',
                fontFamily: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span
                  style={{
                    fontFamily: 'Newsreader, serif',
                    fontSize: 17,
                    fontWeight: isToday ? 500 : 400,
                  }}
                >
                  {d.getDate()}
                </span>
                {isToday && (
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 8,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: isSel ? '#c99846' : '#c99846',
                    }}
                  >
                    Today
                  </span>
                )}
              </div>
              {/* Up to 3 order chips */}
              {dayOrders.slice(0, 3).map((o) => (
                <span
                  key={o.id}
                  style={{
                    background: isSel ? 'rgba(245,238,220,0.16)' : '#eaf3ee',
                    color: isSel ? '#f5eedc' : '#1f4a38',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 9,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '2px 5px',
                    borderRadius: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {o.slot} · {o.contact_company?.split(' ')[0] ?? '—'}
                </span>
              ))}
              {dayOrders.length > 3 && (
                <span
                  style={{
                    fontSize: 10,
                    color: isSel ? '#f5eedc' : '#5a524a',
                    opacity: 0.75,
                  }}
                >
                  + {dayOrders.length - 3} more
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayDrillDown({
  dayKey,
  orders,
  timeslots,
}: {
  dayKey: string;
  orders: CalOrder[];
  timeslots: Timeslot[];
}) {
  const date = new Date(dayKey + 'T00:00:00');
  const isToday = dayKey === new Date().toISOString().slice(0, 10);
  const dayRev = orders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'failed')
    .reduce((s, o) => s + o.total, 0);
  const dayHead = orders.reduce((s, o) => s + o.headcount, 0);

  // Bucket orders by slot
  const bySlot: Record<string, CalOrder[]> = {};
  for (const o of orders) {
    (bySlot[o.slot] ??= []).push(o);
  }

  return (
    <aside>
      <Card>
        <div
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#5a524a',
            marginBottom: 4,
          }}
        >
          {isToday ? 'Today' : 'Selected day'}
        </div>
        <h3
          style={{
            fontFamily: 'Newsreader, serif',
            fontWeight: 500,
            fontSize: 22,
            margin: 0,
            letterSpacing: '-0.015em',
          }}
        >
          {date.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
          })}
        </h3>
        {orders.length > 0 && (
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.12em',
              color: '#5a524a',
              marginTop: 6,
            }}
          >
            {orders.length} {orders.length === 1 ? 'order' : 'orders'} · {moneyExact(dayRev)} · {dayHead} ppl
          </div>
        )}

        {orders.length === 0 ? (
          <p
            style={{
              fontSize: 13,
              color: '#5a524a',
              marginTop: 16,
              padding: '20px 14px',
              background: '#fafaf7',
              border: '1px dashed #d9cfb6',
              borderRadius: 4,
              textAlign: 'center',
            }}
          >
            No deliveries scheduled.
          </p>
        ) : (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {timeslots.map((s) => {
              const list = bySlot[s.id] ?? [];
              if (list.length === 0) return null;
              return (
                <div key={s.id}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Newsreader, serif',
                        fontSize: 14,
                        color: '#1c1813',
                      }}
                    >
                      {s.label}
                    </span>
                    <span
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 9.5,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: '#5a524a',
                      }}
                    >
                      {list.length}
                    </span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {list.map((o) => (
                      <li
                        key={o.id}
                        style={{
                          background: '#fafaf7',
                          border: '1px solid #e6e1d4',
                          borderRadius: 3,
                          padding: '8px 10px',
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                          <Link
                            href={`/admin/orders?id=${encodeURIComponent(o.id)}`}
                            style={{
                              fontFamily: 'Newsreader, serif',
                              fontSize: 14,
                              color: '#1c1813',
                              textDecoration: 'none',
                            }}
                          >
                            {o.contact_company || '—'}
                          </Link>
                          <span
                            style={{
                              fontFamily: 'Newsreader, serif',
                              fontSize: 13,
                              color: '#1c1813',
                            }}
                          >
                            {moneyExact(o.total)}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: '#5a524a',
                            marginTop: 2,
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 6,
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {o.items_summary}
                          </span>
                          <span style={{ flexShrink: 0 }}>
                            {o.method === 'pickup' ? 'Pickup' : o.postcode} · {o.headcount} ppl
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </aside>
  );
}

function NavBtn({
  children,
  onClick,
  style,
}: {
  children: React.ReactNode;
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#fafaf7',
        border: '1px solid #d9cfb6',
        color: '#1c1813',
        padding: '6px 10px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 14,
        cursor: 'pointer',
        borderRadius: 3,
        lineHeight: 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? '#1c1813' : '#ffffff',
        color: active ? '#fafaf7' : '#1c1813',
        border: '1px solid ' + (active ? '#1c1813' : '#d9cfb6'),
        padding: '6px 12px',
        borderRadius: 3,
        cursor: 'pointer',
        fontSize: 12,
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}
