import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { isMockMode } from '@/lib/mock';
import { PageHeader } from '@/components/admin-ui';
import { BUNDLES as STATIC_BUNDLES } from '@/lib/menu';
import type { Bundle } from '@/lib/types';
import BundleForm from './bundle-form';

export default async function BundleEditPage({ params }: { params: { id: string } }) {
  await requireAdmin();

  const bundle = await fetchBundle(params.id);
  if (!bundle) notFound();

  return (
    <div>
      <PageHeader
        title={bundle.name}
        subtitle="Edit price, description, photo, tags, and what's in the box."
      />
      <BundleForm initial={bundle} mode="edit" />
    </div>
  );
}

async function fetchBundle(id: string): Promise<(Bundle & { sort_order: number; visible: boolean }) | null> {
  if (isMockMode()) {
    const b = STATIC_BUNDLES.find((x) => x.id === id);
    return b ? { ...b, sort_order: 10, visible: true } : null;
  }
  const admin = createAdminClient();
  const { data: bundleRow } = await admin.from('bundles').select('*').eq('id', id).maybeSingle();
  if (!bundleRow) return null;

  // Join modifiers
  const { data: groups } = await admin
    .from('modifier_groups')
    .select('*, modifier_options(*)')
    .eq('bundle_id', id)
    .order('sort_order');

  const modifiers = (groups ?? []).map((g: any) => ({
    id: g.key,
    label: g.label,
    sub: g.sub ?? undefined,
    required: g.required ?? false,
    type: g.type ?? 'single',
    dependsOn: g.depends_on ?? undefined,
    options: (g.modifier_options ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((o: any) => ({
        id: o.key,
        label: o.label,
        sub: o.sub ?? undefined,
        delta: o.delta != null ? Number(o.delta) : undefined,
      })),
  }));

  return {
    id: bundleRow.id,
    cat: bundleRow.cat,
    name: bundleRow.name,
    subtitle: bundleRow.subtitle,
    description: bundleRow.description,
    serves: bundleRow.serves,
    price: Number(bundleRow.price),
    tag: bundleRow.tag ?? undefined,
    cn: bundleRow.cn ?? undefined,
    img: bundleRow.img ?? undefined,
    contains: bundleRow.contains ?? [],
    modifiers: modifiers.length ? modifiers : undefined,
    sort_order: bundleRow.sort_order,
    visible: bundleRow.visible,
  };
}
