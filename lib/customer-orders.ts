import 'server-only';
import { createAdminClient } from './supabase-server';
import { isMockMode } from './mock';
import type { Order, CartItem, DeliveryDetails, OrderTotals } from './types';

// ─────────────────────────────────────────────────────────────
//  Customer-side order fetching. Filters by the signed-in user's
//  email/id. Returns orders newest-first.
// ─────────────────────────────────────────────────────────────

export type CustomerOrder = Order & {
  contact_email: string | null;
  contact_name: string | null;
  contact_company: string | null;
};

function mockOrders(email: string): CustomerOrder[] {
  // Realistic mock data for preview mode.
  const make = (
    daysAgo: number,
    cart: CartItem[],
    status: Order['status'],
    company: string
  ): CustomerOrder => {
    const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const deliveryFee = 15;
    const vat = (subtotal + deliveryFee) * 0.2;
    const total = subtotal + deliveryFee + vat;
    const totals: OrderTotals = { subtotal, deliveryFee, vat, total };
    const delivery: DeliveryDetails = {
      method: 'delivery',
      date: new Date(Date.now() - (daysAgo - 2) * 86400000).toISOString().slice(0, 10),
      slot: '12-13',
      pickupLocation: 'london-wall',
      building: 'Bishopsgate Tower',
      address: '150 Bishopsgate',
      recipient: 'Reception',
      contactPhone: '+44 7700 900100',
      notes: '',
    };
    return {
      id: 'mock-' + Math.random().toString(36).slice(2, 10),
      account_id: null,
      postcode: 'EC2M 5TE',
      cart,
      delivery,
      totals,
      status,
      stripe_session_id: null,
      stripe_payment_intent_id: null,
      created_at: new Date(Date.now() - daysAgo * 86400000).toISOString(),
      contact_email: email,
      contact_name: 'Demo Buyer',
      contact_company: company,
    };
  };

  return [
    make(
      3,
      [
        { id: 'b-platter-classic', bundleId: 'b-platter-classic', name: 'Classic Siu Mei Platter', price: 185, qty: 1, subtitle: 'Family-style sharing — feeds 8–10' },
        { id: 'b-lunch-rice', bundleId: 'b-lunch-rice', name: 'Rice Box Lunch — per person', price: 14.5, qty: 14, subtitle: 'Choose-your-own rice boxes' },
      ],
      'paid',
      'A&O Shearman'
    ),
    make(
      10,
      [
        { id: 'b-platter-vegetarian', bundleId: 'b-platter-vegetarian', name: 'Garden Platter', price: 145, qty: 2, subtitle: 'Vegan & vegetarian sharing' },
      ],
      'paid',
      'A&O Shearman'
    ),
    make(
      28,
      [
        { id: 'b-lunch-rice', bundleId: 'b-lunch-rice', name: 'Rice Box Lunch — per person', price: 14.5, qty: 22, subtitle: 'Choose-your-own rice boxes' },
        { id: 'a-soft-drinks', bundleId: null as unknown as string, name: 'Soft drinks (assorted)', price: 2.5, qty: 22, subtitle: '' } as CartItem,
      ],
      'paid',
      'A&O Shearman'
    ),
  ];
}

export async function fetchCustomerOrders(user: { id: string; email: string }): Promise<CustomerOrder[]> {
  if (isMockMode()) return mockOrders(user.email);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .or(`account_id.eq.${user.id},contact_email.eq.${user.email}`)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    console.error('fetchCustomerOrders failed:', error);
    return [];
  }
  return (data ?? []) as CustomerOrder[];
}

export async function fetchCustomerOrder(
  user: { id: string; email: string },
  orderId: string
): Promise<CustomerOrder | null> {
  if (isMockMode()) {
    return mockOrders(user.email)[0] ?? null;
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .or(`account_id.eq.${user.id},contact_email.eq.${user.email}`)
    .maybeSingle();
  if (error) {
    console.error('fetchCustomerOrder failed:', error);
    return null;
  }
  return (data ?? null) as CustomerOrder | null;
}
