import { requireCustomer } from '@/lib/customer-auth';
import { fetchSavedAddresses } from '@/lib/saved-addresses';
import AddressesClient from './addresses-client';

export default async function AddressesPage() {
  const user = await requireCustomer();
  const addresses = await fetchSavedAddresses(user);
  return <AddressesClient user={user} initial={addresses} />;
}
