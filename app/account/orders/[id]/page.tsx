import { notFound } from 'next/navigation';
import { requireCustomer } from '@/lib/customer-auth';
import { fetchCustomerOrder } from '@/lib/customer-orders';
import { fetchTimeslots, fetchLocations } from '@/lib/content';
import OrderDetailClient from './order-detail-client';

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireCustomer();
  const [order, timeslots, locations] = await Promise.all([
    fetchCustomerOrder(user, params.id),
    fetchTimeslots(),
    fetchLocations(),
  ]);
  if (!order) notFound();
  return <OrderDetailClient order={order} timeslots={timeslots} locations={locations} />;
}
