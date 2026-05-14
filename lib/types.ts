// ─────────────────────────────────────────────────────────────
//  Domain types — shared by frontend, API routes, and the
//  Supabase schema. Keep these in sync with supabase/schema.sql.
// ─────────────────────────────────────────────────────────────

export type Tone = 'jade' | 'accent' | 'cream' | 'gold';

export type ModifierOption = {
  id: string;
  label: string;
  sub?: string;
  delta?: number; // additive price per unit
};

export type Modifier = {
  id: string;
  label: string;
  sub?: string;
  required?: boolean;
  type?: 'single' | 'multi';
  dependsOn?: string;
  options: ModifierOption[];
};

export type Bundle = {
  id: string;
  cat: 'platters' | 'lunchboxes' | 'canapes';
  name: string;
  subtitle: string;
  description: string;
  serves: string;
  price: number; // GBP, ex-VAT
  tag?: string;
  cn?: string;
  img?: string;
  contains: string[];
  modifiers?: Modifier[];
};

export type AlaCarteItem = {
  id: string;
  name: string;
  price: number;
  cat: string;
};

export type CartItem = {
  id: string; // includes modifier hash so two configs are separate lines
  bundleId: string;
  name: string;
  subtitle?: string;
  price: number; // unit price after modifiers
  qty: number;
  modifiers?: Record<string, string | string[]>;
};

export type Timeslot = {
  id: string;
  label: string;
  tag: string;
};

export type Location = {
  id: string;
  name: string;
  addr: string;
  pickup: string;
  cn: string;
};

export type DeliveryDetails = {
  method: 'delivery' | 'pickup';
  date: string; // ISO date YYYY-MM-DD
  slot: string; // timeslot id
  pickupLocation: string;
  building: string;
  address: string;
  recipient: string;
  contactPhone: string;
  notes: string;
};

export type Account = {
  id?: string;
  email: string;
  name: string;
  company: string;
  phone: string;
  companyType?: string;
  frequency?: string;
  billing?: string;
  verified: boolean;
};

export type OrderTotals = {
  subtotal: number;
  deliveryFee: number;
  vat: number;
  total: number;
};

// What gets sent to /api/checkout/create-session
export type CheckoutPayload = {
  cart: CartItem[];
  delivery: DeliveryDetails;
  postcode: string;
  totals: OrderTotals;
};

// What gets stored in Supabase `orders` table
export type Order = {
  id: string;
  account_id: string | null;
  postcode: string;
  cart: CartItem[];
  delivery: DeliveryDetails;
  totals: OrderTotals;
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  status: 'pending' | 'paid' | 'cancelled' | 'failed';
  created_at: string;
};
