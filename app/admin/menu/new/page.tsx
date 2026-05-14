import { requireAdmin } from '@/lib/admin-auth';
import { PageHeader } from '@/components/admin-ui';
import BundleForm from '../[id]/bundle-form';
import AlacarteForm from '../alacarte/[id]/alacarte-form';

export default async function NewMenuItemPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  await requireAdmin();
  const type = searchParams.type === 'alacarte' ? 'alacarte' : 'bundle';

  if (type === 'alacarte') {
    return (
      <div>
        <PageHeader title="New à la carte item" />
        <AlacarteForm
          mode="new"
          initial={{
            id: '',
            name: '',
            cat: 'Sides',
            price: 0,
            sort_order: 100,
            visible: true,
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="New bundle" />
      <BundleForm
        mode="new"
        initial={{
          id: '',
          cat: 'platters',
          name: '',
          subtitle: '',
          description: '',
          serves: '',
          price: 0,
          tag: undefined,
          cn: undefined,
          img: undefined,
          contains: [],
          sort_order: 100,
          visible: true,
        }}
      />
    </div>
  );
}
