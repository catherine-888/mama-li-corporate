import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { isMockMode } from '@/lib/mock';
import { PageHeader, Btn } from '@/components/admin-ui';
import MenuClient from './menu-client';
import { BUNDLES as STATIC_BUNDLES, ALACARTE as STATIC_ALACARTE } from '@/lib/menu';
import type { Bundle, AlaCarteItem } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
//  Menu admin — list of bundles + à la carte items. Each row
//  links into an edit view. New-item button. Toggle visible.
// ─────────────────────────────────────────────────────────────

export type BundleRow = Bundle & { sort_order: number; visible: boolean };
export type AlacarteRow = AlaCarteItem & { sort_order: number; visible: boolean };

async function fetchAll(): Promise<{ bundles: BundleRow[]; alacarte: AlacarteRow[] }> {
  if (isMockMode()) {
    return {
      bundles: STATIC_BUNDLES.map((b, i) => ({ ...b, sort_order: (i + 1) * 10, visible: true })),
      alacarte: STATIC_ALACARTE.map((a, i) => ({ ...a, sort_order: (i + 1) * 10, visible: true })),
    };
  }
  const admin = createAdminClient();
  const [bRes, aRes] = await Promise.all([
    admin.from('bundles').select('*').order('sort_order'),
    admin.from('alacarte_items').select('*').order('sort_order'),
  ]);
  return {
    bundles: (bRes.data ?? []) as unknown as BundleRow[],
    alacarte: (aRes.data ?? []) as unknown as AlacarteRow[],
  };
}

export default async function MenuAdminPage() {
  await requireAdmin();
  const { bundles, alacarte } = await fetchAll();
  return (
    <div>
      <PageHeader
        title="Menu"
        subtitle="Manage bundles, à la carte items, prices, photos, and what shows on the live site."
        actions={
          <>
            <Btn href="/admin/menu/new?type=bundle" variant="primary">
              + New bundle
            </Btn>
            <Btn href="/admin/menu/new?type=alacarte" variant="secondary">
              + Add-on
            </Btn>
          </>
        }
      />
      <MenuClient bundles={bundles} alacarte={alacarte} />
    </div>
  );
}
