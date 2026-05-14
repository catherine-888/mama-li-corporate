import { requireAdmin } from '@/lib/admin-auth';
import { fetchSettings } from '@/lib/content';
import { PageHeader } from '@/components/admin-ui';
import SettingsClient from './settings-client';

// ─────────────────────────────────────────────────────────────
//  Site settings — single form editing the singleton site_settings
//  row. Logo upload, font pairing, palette, hero copy, commercials,
//  contact, footer.
// ─────────────────────────────────────────────────────────────

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await fetchSettings();
  return (
    <div>
      <PageHeader
        title="Site settings"
        subtitle="Logo, fonts, palette, hero copy, contact details — anything that's the same across the whole site."
      />
      <SettingsClient initial={settings} />
    </div>
  );
}
