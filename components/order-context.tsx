'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CartItem, DeliveryDetails } from '@/lib/types';
import { calcTotals } from '@/lib/order';

// ─────────────────────────────────────────────────────────────
//  Client-side state for the ordering session: postcode, cart,
//  and delivery details. Persisted to localStorage so a page
//  refresh doesn't wipe a partly-built order.
//
//  Account state lives separately: it's authoritative on the
//  server (Supabase auth cookie). Components that need the user
//  call `supabase.auth.getUser()` or use the hook in lib/auth.ts.
// ─────────────────────────────────────────────────────────────

type OrderState = {
  postcode: string;
  setPostcode: (v: string) => void;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clearCart: () => void;
  delivery: DeliveryDetails;
  setDelivery: (d: DeliveryDetails | ((prev: DeliveryDetails) => DeliveryDetails)) => void;
  totals: ReturnType<typeof calcTotals>;
};

const Ctx = createContext<OrderState | null>(null);

const STORAGE_KEY = 'mamali.order.v1';

const INITIAL_DELIVERY: DeliveryDetails = {
  method: 'delivery',
  date: '',
  slot: '',
  pickupLocation: 'london-wall',
  building: '',
  address: '',
  recipient: '',
  contactPhone: '',
  notes: '',
};

export function OrderProvider({ children }: { children: ReactNode }) {
  const [postcode, setPostcode] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [delivery, setDelivery] = useState<DeliveryDetails>(INITIAL_DELIVERY);
  const [hydrated, setHydrated] = useState(false);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.postcode) setPostcode(parsed.postcode);
        if (Array.isArray(parsed.cart)) setCart(parsed.cart);
        if (parsed.delivery) setDelivery({ ...INITIAL_DELIVERY, ...parsed.delivery });
      }
    } catch {
      /* ignore — corrupted state means fresh start */
    }
    setHydrated(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ postcode, cart, delivery })
      );
    } catch {
      /* localStorage quota or disabled — silent fail */
    }
  }, [postcode, cart, delivery, hydrated]);

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const ex = prev.find((p) => p.id === item.id);
      if (ex) return prev.map((p) => (p.id === item.id ? { ...p, qty: p.qty + item.qty } : p));
      return [...prev, item];
    });
  };
  const removeFromCart = (id: string) => setCart((prev) => prev.filter((p) => p.id !== id));
  const setQty = (id: string, qty: number) =>
    setCart((prev) => prev.map((p) => (p.id === id ? { ...p, qty } : p)));
  const clearCart = () => setCart([]);

  const totals = useMemo(() => calcTotals(cart, delivery.method), [cart, delivery.method]);

  const value: OrderState = {
    postcode,
    setPostcode,
    cart,
    addToCart,
    removeFromCart,
    setQty,
    clearCart,
    delivery,
    setDelivery,
    totals,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOrder() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOrder must be used inside <OrderProvider>');
  return v;
}
