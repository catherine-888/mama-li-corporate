import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { isMockMode } from '@/lib/mock';
import { ALACARTE as STATIC_ALACARTE } from '@/lib/menu';
import { PageHeader } from '@/components/admin-ui';
import AlacarteForm from './alacarte-form';
import type { AlaCarteItem } from '@/lib/types';

export type AlacarteFormShape = AlaCarteItem & { sort_order: number; visible: boolean };

export default async function AlacarteEditPage({ params }: { params: { id: string } }) {
  await requireAdmin();

  let item: AlacarteFormShape | null = null;
  if (isMockMode()) {
    const found = STATIC_ALACARTE.find((a) => a.id === params.id);
    if (found) item = { ...found, sort_order: 10, visible: true };
  } else {
    const supabase = createAdminClient();
    const { data } = await supabase.from('alacarte_items').select('*').eq('id', params.id).maybeSingle();
    if (data) item = data as unknown as AlacarteFormShape;
  }
  if (!item) notFound();

  return (
    <div>
      <PageHeader title={item.name} subtitle="Edit add-on details." />
      <AlacarteForm initial={item} mode="edit" />
    </div>
  );
}
