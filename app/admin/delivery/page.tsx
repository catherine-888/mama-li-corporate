import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { isMockMode } from '@/lib/mock';
import { PageHeader } from '@/components/admin-ui';
import DeliveryClient from './delivery-client';
import { TIMESLOTS as STATIC_TIMESLOTS, LOCATIONS as STATIC_LOCATIONS } from '@/lib/menu';

// ─────────────────────────────────────────────────────────────
//  Delivery editor — three things on one page:
//   1. Timeslots (the time windows offered to customers)
//   2. Locations (pickup locations)
//   3. Blocked dates + per-slot capacity overrides
// ─────────────────────────────────────────────────────────────

export type TimeslotRow = {
  id: string;
  label: string;
  tag: string;
  sort_order: number;
  active: boolean;
  default_capacity: number;
};

export type LocationRow = {
  id: string;
  name: string;
  addr: string;
  pickup: string;
  cn: string;
  sort_order: number;
  active: boolean;
};

export type BlockedDate = { date: string; reason: string };

export type SlotOverride = { date: string; slot_id: string; capacity: number; reason: string };

async function fetchAll() {
  if (isMockMode()) {
    return {
      timeslots: STATIC_TIMESLOTS.map((t, i) => ({
        ...t,
        sort_order: (i + 1) * 10,
        active: true,
        default_capacity: 2,
      })) as TimeslotRow[],
      locations: STATIC_LOCATIONS.map((l, i) => ({
        ...l,
        sort_order: (i + 1) * 10,
        active: true,
      })) as LocationRow[],
      blockedDates: [
        { date: nextWeekdayISO(5, 14), reason: 'Bank holiday' },
      ] as BlockedDate[],
      slotOverrides: [
        { date: nextWeekdayISO(2, 7), slot_id: '12-13', capacity: 0, reason: 'Kitchen offsite' },
      ] as SlotOverride[],
    };
  }
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const [tRes, lRes, bRes, oRes] = await Promise.all([
    admin.from('timeslots').select('*').order('sort_order'),
    admin.from('locations').select('*').order('sort_order'),
    admin.from('blocked_dates').select('date,reason').gte('date', today).order('date'),
    admin
      .from('slot_capacity_overrides')
      .select('date,slot_id,capacity,reason')
      .gte('date', today)
      .order('date'),
  ]);
  return {
    timeslots: (tRes.data ?? []) as TimeslotRow[],
    locations: (lRes.data ?? []) as LocationRow[],
    blockedDates: (bRes.data ?? []) as BlockedDate[],
    slotOverrides: (oRes.data ?? []) as SlotOverride[],
  };
}

function nextWeekdayISO(weekday: number, daysAhead: number): string {
  // weekday: 0 = Sun … 6 = Sat
  const d = new Date(Date.now() + daysAhead * 86400000);
  // Roll to the given weekday going forward
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default async function DeliveryAdminPage() {
  await requireAdmin();
  const data = await fetchAll();
  return (
    <div>
      <PageHeader
        title="Delivery"
        subtitle="Time slots, pickup locations, and per-day overrides for closures or capacity changes."
      />
      <DeliveryClient {...data} />
    </div>
  );
}
