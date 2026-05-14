import 'server-only';
import { createAdminClient } from './supabase-server';
import { isMockMode } from './mock';

export type SavedAddress = {
  id: string;
  label: string;
  recipient: string;
  building: string;
  address: string;
  postcode: string;
  contact_phone: string;
  notes: string;
  is_default: boolean;
};

let MOCK_STORE: SavedAddress[] = [
  {
    id: 'mock-addr-1',
    label: 'Bishopsgate Tower, 14F reception',
    recipient: 'Reception desk',
    building: 'Bishopsgate Tower',
    address: '150 Bishopsgate, 14th floor',
    postcode: 'EC2M 5TE',
    contact_phone: '+44 7700 900100',
    notes: 'Please tell reception which floor before bringing up.',
    is_default: true,
  },
];

export async function fetchSavedAddresses(user: { id: string }): Promise<SavedAddress[]> {
  if (isMockMode()) return [...MOCK_STORE];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('saved_addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchSavedAddresses failed:', error);
    return [];
  }
  return (data ?? []) as SavedAddress[];
}

// Mock-mode helpers exposed for the API routes
export function mockSavedAddressesGet(): SavedAddress[] {
  return [...MOCK_STORE];
}
export function mockSavedAddressesSet(next: SavedAddress[]) {
  MOCK_STORE = next;
}
