import { notFound } from 'next/navigation';
import { requireCustomer } from '@/lib/customer-auth';
import { fetchCustomerOrder } from '@/lib/customer-orders';
import { fetchSettings } from '@/lib/content';
import PrintInvoice from './print-invoice';

export default async function PrintInvoicePage({ params }: { params: { id: string } }) {
  const user = await requireCustomer();
  const [order, settings] = await Promise.all([
    fetchCustomerOrder(user, params.id),
    fetchSettings(),
  ]);
  if (!order) notFound();
  return <PrintInvoice order={order} settings={settings} />;
}
