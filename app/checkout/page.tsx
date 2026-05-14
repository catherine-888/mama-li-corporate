import { fetchTimeslots, fetchLocations, fetchSettings, fetchSlotAvailability } from '@/lib/content';
import CheckoutClient from './checkout-client';

// ─────────────────────────────────────────────────────────────
//  Checkout page (server). Fetches timeslots, locations, site
//  settings, and per-date availability (blocked days + capacity
//  overrides) then hands them to the client component.
// ─────────────────────────────────────────────────────────────

export default async function CheckoutPage() {
  const [timeslots, locations, settings, availability] = await Promise.all([
    fetchTimeslots(),
    fetchLocations(),
    fetchSettings(),
    fetchSlotAvailability(),
  ]);

  return (
    <CheckoutClient
      timeslots={timeslots}
      locations={locations}
      blockedDates={availability.blockedDates}
      capacityByDateSlot={availability.capacityByDateSlot}
      minSpend={settings.min_spend}
    />
  );
}
