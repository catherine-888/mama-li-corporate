import { requireCustomer } from '@/lib/customer-auth';
import { fetchCustomerOrders } from '@/lib/customer-orders';
import { fetchSettings } from '@/lib/content';
import AccountClient from './account-client';

// ─────────────────────────────────────────────────────────────
//  Customer account home — order history + saved addresses link.
// ─────────────────────────────────────────────────────────────

export default async function AccountPage() {
  const user = await requireCustomer();
  const [orders, settings] = await Promise.all([
    fetchCustomerOrders(user),
    fetchSettings(),
  ]);
  return <AccountClient user={user} orders={orders} settings={settings} />;
}
