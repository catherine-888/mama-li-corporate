import { fetchBundles, fetchAlacarte, fetchSettings } from '@/lib/content';
import MenuClient from './menu-client';

// ─────────────────────────────────────────────────────────────
//  Menu page — server component. Fetches bundles + à la carte +
//  site settings, then hands them to the client component.
// ─────────────────────────────────────────────────────────────

export default async function MenuPage() {
  const [bundles, alacarte, settings] = await Promise.all([
    fetchBundles(),
    fetchAlacarte(),
    fetchSettings(),
  ]);

  return <MenuClient bundles={bundles} alacarte={alacarte} minSpend={settings.min_spend} />;
}
