'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useOrder } from '@/components/order-context';
import { money, moneyExact } from '@/lib/order';
import type { Bundle, AlaCarteItem, Modifier, CartItem } from '@/lib/types';
import { Btn, Tag, FoodPlate, SectionHead } from '@/components/ui';
import { NavBar, Footer } from '@/components/site-chrome';

// ─────────────────────────────────────────────────────────────
//  Menu page (client) — bundles (cards grid), à la carte, sticky
//  cart sidebar. Receives data as props from the server-side
//  parent that fetches it via lib/content.ts.
// ─────────────────────────────────────────────────────────────

type Filter = 'all' | 'platters' | 'lunchboxes' | 'canapes';

export default function MenuClient({
  bundles,
  alacarte,
  minSpend,
}: {
  bundles: Bundle[];
  alacarte: AlaCarteItem[];
  minSpend: number;
}) {
  const router = useRouter();
  const { postcode, cart, addToCart, removeFromCart, setQty } = useOrder();
  const [filter, setFilter] = useState<Filter>('all');
  const [openBundle, setOpenBundle] = useState<Bundle | null>(null);

  // Guard: postcode required
  useEffect(() => {
    if (!postcode) router.replace('/gate');
  }, [postcode, router]);

  const subtotal = useMemo(
    () => cart.reduce((s, it) => s + it.price * it.qty, 0),
    [cart]
  );
  const cartCount = useMemo(() => cart.reduce((s, it) => s + it.qty, 0), [cart]);
  const remaining = Math.max(0, minSpend - subtotal);
  const pct = Math.min(100, (subtotal / minSpend) * 100);

  const filteredBundles = bundles.filter(
    (b) => filter === 'all' || filter === b.cat
  );

  const onAddBundle = (b: Bundle) => {
    if (b.modifiers && b.modifiers.length) {
      setOpenBundle(b);
    } else {
      addToCart({
        id: b.id,
        bundleId: b.id,
        name: b.name,
        subtitle: b.subtitle,
        price: b.price,
        qty: 1,
      });
    }
  };

  const onAddBundleWithMods = (
    b: Bundle,
    qty: number,
    mods: Record<string, string | string[]> | null,
    modsPrice: number
  ) => {
    const modKey = mods
      ? Object.entries(mods)
          .map(([k, v]) => k + '=' + (Array.isArray(v) ? v.join(',') : v))
          .join('|')
      : '';
    const id = mods ? b.id + ':' + modKey : b.id;
    const modSummary = mods
      ? Object.entries(mods)
          .map(([gid, val]) => {
            const g = b.modifiers!.find((m) => m.id === gid);
            if (!g) return '';
            if (Array.isArray(val)) {
              return val
                .map((oid) => g.options.find((o) => o.id === oid)?.label ?? '')
                .filter(Boolean)
                .join(' + ');
            }
            return g.options.find((o) => o.id === val)?.label ?? '';
          })
          .filter(Boolean)
          .join(' · ')
      : '';
    addToCart({
      id,
      bundleId: b.id,
      name: b.name,
      price: b.price + (modsPrice || 0),
      qty,
      modifiers: mods ?? undefined,
      subtitle: modSummary || b.subtitle,
    });
    setOpenBundle(null);
  };

  const onAddAlacarte = (i: AlaCarteItem) => {
    addToCart({
      id: i.id,
      bundleId: i.id,
      name: i.name,
      subtitle: i.cat,
      price: i.price,
      qty: 1,
    });
  };

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <NavBar
        postcode={postcode}
        onChangePostcode={() => router.push('/gate')}
        onCart={() => router.push('/checkout')}
        cartCount={cartCount}
        showSignIn={false}
      />

      {/* Hero strip */}
      <div
        style={{
          padding: 'clamp(28px, 5vw, 48px) clamp(20px, 5vw, 60px) 32px',
          maxWidth: 1480,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'end',
          gap: 40,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: 16,
            }}
          >
            — The menu
          </div>
          <h1
            style={{
              fontFamily: 'Newsreader, serif',
              fontWeight: 400,
              fontSize: 'clamp(36px, 5vw, 68px)',
              lineHeight: 1,
              letterSpacing: '-0.025em',
              margin: 0,
              color: 'var(--ink)',
            }}
          >
            Bundles, lunches &amp; canapés{' '}
            <em style={{ color: 'var(--accent)' }}>for the office.</em>
          </h1>
        </div>
      </div>

      {/* Filter strip */}
      <div
        style={{
          maxWidth: 1480,
          margin: '0 auto',
          padding: '0 clamp(20px, 5vw, 60px)',
          borderBottom: '1px solid var(--rule)',
          display: 'flex',
          gap: 4,
          overflowX: 'auto',
        }}
      >
        {(
          [
            { id: 'all', label: 'All bundles', count: bundles.length },
            { id: 'platters', label: 'Sharing platters', count: bundles.filter((b) => b.cat === 'platters').length },
            { id: 'lunchboxes', label: 'Lunch boxes', count: bundles.filter((b) => b.cat === 'lunchboxes').length },
            { id: 'canapes', label: 'Canapés', count: bundles.filter((b) => b.cat === 'canapes').length },
          ] as { id: Filter; label: string; count: number }[]
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '18px 22px',
              background: 'transparent',
              border: 'none',
              borderBottom: filter === f.id ? '2px solid var(--ink)' : '2px solid transparent',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 14,
              fontWeight: filter === f.id ? 500 : 400,
              color: filter === f.id ? 'var(--ink)' : 'var(--ink-soft)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
            }}
          >
            {f.label}
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, opacity: 0.5 }}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Body: 2 cols (menu + cart) */}
      <div
        style={{
          maxWidth: 1480,
          margin: '0 auto',
          padding: '40px clamp(20px, 5vw, 60px) 80px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 380px',
          gap: 48,
          alignItems: 'flex-start',
        }}
        className="menu-body"
      >
        <div>
          <BundleGrid bundles={filteredBundles} onAdd={onAddBundle} onOpen={(b) => setOpenBundle(b)} />

          <div style={{ marginTop: 80 }}>
            <SectionHead
              kicker="Add-ons"
              title="À la carte."
              sub="Top up a bundle, or build your own. Half a duck, more dim sum, a jar of chilli oil to take home."
            />
            <AlacarteList items={alacarte} onAdd={onAddAlacarte} />
          </div>
        </div>

        <CartSidebar
          cart={cart}
          subtotal={subtotal}
          pct={pct}
          remaining={remaining}
          minSpend={minSpend}
          setQty={setQty}
          removeFromCart={removeFromCart}
          onCheckout={() => router.push('/checkout')}
        />
      </div>

      {openBundle && (
        <BundleModal
          bundle={openBundle}
          onClose={() => setOpenBundle(null)}
          onAdd={onAddBundleWithMods}
        />
      )}

      <Footer />

      <style jsx>{`
        @media (max-width: 900px) {
          .menu-body {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Bundle grid (cards layout)
// ─────────────────────────────────────────────────────────────

function BundleGrid({
  bundles,
  onAdd,
  onOpen,
}: {
  bundles: Bundle[];
  onAdd: (b: Bundle) => void;
  onOpen: (b: Bundle) => void;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 28,
      }}
    >
      {bundles.map((b, i) => (
        <article
          key={b.id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--paper-deep)',
            transition: 'transform 200ms ease',
          }}
        >
          <FoodPlate
            label={b.name}
            tone={(['accent', 'jade', 'gold', 'cream'] as const)[i % 4]}
            ratio="5 / 4"
            char={b.cn}
            img={b.img}
          />
          <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {b.tag && <Tag tone={b.tag === 'Vegan' ? 'jade' : 'accent'}>{b.tag}</Tag>}
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-soft)',
                }}
              >
                {b.serves}
              </span>
            </div>
            <h3
              style={{
                fontFamily: 'Newsreader, serif',
                fontWeight: 500,
                fontSize: 24,
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              {b.name}
            </h3>
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14,
                color: 'var(--ink-soft)',
                lineHeight: 1.55,
                margin: 0,
                flex: 1,
              }}
            >
              {b.description}
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 14,
                paddingTop: 14,
                borderTop: '1px solid var(--rule)',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontFamily: 'Newsreader, serif', fontSize: 24, color: 'var(--ink)' }}>
                {money(b.price)}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="ghost" onClick={() => onOpen(b)} size="sm">
                  Details
                </Btn>
                <Btn variant="primary" onClick={() => onAdd(b)} size="sm">
                  Add +
                </Btn>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  À la carte
// ─────────────────────────────────────────────────────────────

function AlacarteList({ items, onAdd }: { items: AlaCarteItem[]; onAdd: (i: AlaCarteItem) => void }) {
  const groups = items.reduce<Record<string, AlaCarteItem[]>>((g, i) => {
    g[i.cat] = g[i.cat] || [];
    g[i.cat].push(i);
    return g;
  }, {});
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      {Object.entries(groups).map(([cat, list]) => (
        <div key={cat}>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: 14,
              paddingBottom: 8,
              borderBottom: '1px solid var(--rule)',
            }}
          >
            {cat}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              columnGap: 40,
              rowGap: 4,
            }}
          >
            {list.map((it) => (
              <div
                key={it.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  alignItems: 'center',
                  gap: 16,
                  padding: '14px 0',
                  borderBottom: '1px dashed var(--rule)',
                }}
              >
                <span style={{ fontFamily: 'Newsreader, serif', fontSize: 17, color: 'var(--ink)' }}>
                  {it.name}
                </span>
                <span style={{ fontFamily: 'Newsreader, serif', fontSize: 16, color: 'var(--ink-soft)' }}>
                  {money(it.price)}
                </span>
                <button
                  onClick={() => onAdd(it)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--ink)',
                    width: 28,
                    height: 28,
                    borderRadius: 2,
                    cursor: 'pointer',
                    fontFamily: 'Newsreader, serif',
                    fontSize: 16,
                    color: 'var(--ink)',
                  }}
                  aria-label={`Add ${it.name}`}
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Cart sidebar (sticky)
// ─────────────────────────────────────────────────────────────

const qtyBtn: CSSProperties = {
  background: 'transparent',
  border: 'none',
  width: 28,
  height: 28,
  fontFamily: 'Newsreader, serif',
  fontSize: 16,
  color: 'var(--ink)',
  cursor: 'pointer',
};

function CartSidebar({
  cart,
  subtotal,
  pct,
  remaining,
  minSpend,
  setQty,
  removeFromCart,
  onCheckout,
}: {
  cart: CartItem[];
  subtotal: number;
  pct: number;
  remaining: number;
  minSpend: number;
  setQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  onCheckout: () => void;
}) {
  const empty = cart.length === 0;
  const count = cart.reduce((s, i) => s + i.qty, 0);
  return (
    <aside
      style={{
        position: 'sticky',
        top: 90,
        background: 'var(--paper-deep)',
        padding: '24px 24px 28px',
        border: '1px solid var(--rule)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3
          style={{
            fontFamily: 'Newsreader, serif',
            fontSize: 24,
            fontWeight: 500,
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          Your basket
        </h3>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
          }}
        >
          {count} item{count === 1 ? '' : 's'}
        </span>
      </div>

      {/* Min spend bar */}
      <div>
        <div
          style={{
            position: 'relative',
            height: 6,
            background: 'oklch(0.88 0.01 80)',
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              right: `${100 - pct}%`,
              background: pct >= 100 ? 'var(--jade)' : 'var(--accent)',
              transition: 'right 250ms ease',
            }}
          />
        </div>
        <div
          style={{
            marginTop: 10,
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 13,
            color: 'var(--ink)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          {remaining > 0 ? (
            <span>
              <strong style={{ fontFamily: 'Newsreader, serif', fontSize: 16 }}>
                {money(remaining)}
              </strong>{' '}
              <span style={{ color: 'var(--ink-soft)' }}>to minimum order</span>
            </span>
          ) : (
            <span style={{ color: 'var(--jade)' }}>✓ Minimum order met</span>
          )}
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              letterSpacing: '0.14em',
              color: 'var(--ink-soft)',
            }}
          >
            MIN {money(minSpend)}
          </span>
        </div>
      </div>

      {empty ? (
        <div
          style={{
            padding: '32px 0',
            textAlign: 'center',
            color: 'var(--ink-soft)',
            fontFamily: 'Newsreader, serif',
            fontStyle: 'italic',
            fontSize: 16,
          }}
        >
          Empty for now. Add a platter to get started.
        </div>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            maxHeight: 320,
            overflowY: 'auto',
            paddingRight: 6,
          }}
        >
          {cart.map((it) => (
            <li
              key={it.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 8,
                paddingBottom: 14,
                borderBottom: '1px dashed var(--rule)',
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'Newsreader, serif',
                    fontSize: 16,
                    color: 'var(--ink)',
                    lineHeight: 1.25,
                  }}
                >
                  {it.name}
                </div>
                {it.subtitle && (
                  <div
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 12,
                      color: 'var(--ink-soft)',
                      marginTop: 2,
                    }}
                  >
                    {it.subtitle}
                  </div>
                )}
                <div
                  style={{
                    marginTop: 8,
                    display: 'inline-flex',
                    alignItems: 'center',
                    border: '1px solid var(--rule)',
                  }}
                >
                  <button
                    onClick={() => (it.qty > 1 ? setQty(it.id, it.qty - 1) : removeFromCart(it.id))}
                    style={qtyBtn}
                    aria-label="decrease"
                  >
                    −
                  </button>
                  <span
                    style={{
                      padding: '0 12px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 12,
                      minWidth: 28,
                      textAlign: 'center',
                    }}
                  >
                    {it.qty}
                  </span>
                  <button onClick={() => setQty(it.id, it.qty + 1)} style={qtyBtn} aria-label="increase">
                    +
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ fontFamily: 'Newsreader, serif', fontSize: 16, color: 'var(--ink)' }}>
                  {moneyExact(it.price * it.qty)}
                </span>
                <button
                  onClick={() => removeFromCart(it.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    color: 'var(--ink-soft)',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                  }}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          paddingTop: 8,
        }}
      >
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
          }}
        >
          Subtotal · excl. VAT
        </span>
        <span
          style={{
            fontFamily: 'Newsreader, serif',
            fontSize: 28,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {moneyExact(subtotal)}
        </span>
      </div>

      <Btn onClick={onCheckout} full size="lg" variant="primary" disabled={subtotal < minSpend}>
        {subtotal < minSpend ? `Add ${money(remaining)} more →` : 'Checkout →'}
      </Btn>
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 12,
          color: 'var(--ink-soft)',
          textAlign: 'center',
        }}
      >
        VAT and delivery added at checkout.
      </span>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
//  Bundle modal (modifier-driven)
// ─────────────────────────────────────────────────────────────

function BundleModal({
  bundle,
  onClose,
  onAdd,
}: {
  bundle: Bundle;
  onClose: () => void;
  onAdd: (
    b: Bundle,
    qty: number,
    mods: Record<string, string | string[]> | null,
    modsPrice: number
  ) => void;
}) {
  const [qty, setQty] = useState(1);
  const [mods, setMods] = useState<Record<string, string | string[]>>(() => {
    const init: Record<string, string | string[]> = {};
    (bundle.modifiers || []).forEach((g) => {
      if (g.type === 'multi') init[g.id] = [];
      else init[g.id] = g.options[0].id;
    });
    return init;
  });
  const hasMods = !!(bundle.modifiers && bundle.modifiers.length);

  // When a "meats count" changes, trim oversized multi-select arrays.
  useEffect(() => {
    if (!hasMods) return;
    const next = { ...mods };
    let changed = false;
    bundle.modifiers!.forEach((g) => {
      if (g.type === 'multi' && g.dependsOn) {
        const capVal = mods[g.dependsOn];
        const cap = parseInt(typeof capVal === 'string' ? capVal : '0', 10);
        const cur = (mods[g.id] as string[]) || [];
        if (cur.length > cap) {
          next[g.id] = cur.slice(0, cap);
          changed = true;
        }
      }
    });
    if (changed) setMods(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMods, mods.meats]);

  const modsPrice = hasMods
    ? bundle.modifiers!.reduce((s, g) => {
        if (g.type === 'multi') return s;
        const o = g.options.find((o) => o.id === mods[g.id]);
        return s + (o?.delta ?? 0);
      }, 0)
    : 0;
  const unitPrice = bundle.price + modsPrice;
  const allChosen =
    !hasMods ||
    bundle.modifiers!.every((g) => {
      if (!g.required) return true;
      if (g.type === 'multi') {
        const capVal = g.dependsOn ? mods[g.dependsOn] : undefined;
        const cap = g.dependsOn
          ? parseInt(typeof capVal === 'string' ? capVal : '0', 10)
          : (mods[g.id] as string[] | undefined)?.length ?? 0;
        return ((mods[g.id] as string[]) || []).length === cap && cap > 0;
      }
      return !!mods[g.id];
    });

  const toggleMulti = (groupId: string, optionId: string, cap: number) => {
    const cur = (mods[groupId] as string[]) || [];
    let next: string[];
    if (cur.includes(optionId)) {
      next = cur.filter((x) => x !== optionId);
    } else if (cur.length >= cap) {
      next = [...cur.slice(1), optionId];
    } else {
      next = [...cur, optionId];
    }
    setMods({ ...mods, [groupId]: next });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(28,24,20,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 'clamp(12px, 4vw, 32px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--cream)',
          maxWidth: 980,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.05fr)',
          borderRadius: 2,
        }}
        className="bundle-modal-grid"
      >
        <FoodPlate label={bundle.name} tone="accent" ratio="auto" char={bundle.cn} img={bundle.img} />
        <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {bundle.tag && <Tag tone={bundle.tag === 'Vegan' ? 'jade' : 'accent'}>{bundle.tag}</Tag>}
          <h2
            style={{
              fontFamily: 'Newsreader, serif',
              fontWeight: 400,
              fontSize: 30,
              letterSpacing: '-0.02em',
              margin: 0,
              color: 'var(--ink)',
              lineHeight: 1.05,
            }}
          >
            {bundle.name}
          </h2>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13.5, color: 'var(--ink-soft)' }}>
            {bundle.subtitle} · {bundle.serves}
          </div>
          <p
            style={{
              fontFamily: 'Newsreader, serif',
              fontSize: 15.5,
              lineHeight: 1.5,
              color: 'var(--ink)',
              margin: 0,
            }}
          >
            {bundle.description}
          </p>

          {hasMods && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 4 }}>
              {bundle.modifiers!.map((g) => {
                if (g.type === 'multi') {
                  const capVal = g.dependsOn ? mods[g.dependsOn] : undefined;
                  const cap = g.dependsOn
                    ? parseInt(typeof capVal === 'string' ? capVal : '0', 10)
                    : 99;
                  return (
                    <MultiModifierGroup
                      key={g.id}
                      group={g}
                      value={(mods[g.id] as string[]) || []}
                      cap={cap}
                      onToggle={(oid) => toggleMulti(g.id, oid, cap)}
                    />
                  );
                }
                return (
                  <ModifierGroup
                    key={g.id}
                    group={g}
                    value={mods[g.id] as string}
                    onChange={(oid) => setMods({ ...mods, [g.id]: oid })}
                  />
                );
              })}
            </div>
          )}

          {!hasMods && (
            <div>
              <div
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-soft)',
                  marginBottom: 10,
                }}
              >
                What's in the box
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {bundle.contains.map((c) => (
                  <li
                    key={c}
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 13,
                      padding: '6px 10px',
                      border: '1px solid var(--rule)',
                      borderRadius: 2,
                    }}
                  >
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginTop: 6,
              paddingTop: 14,
              borderTop: '1px solid var(--rule)',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-soft)',
                }}
              >
                {hasMods ? `${moneyExact(unitPrice)} per person × ${qty}` : `${moneyExact(unitPrice)} × ${qty}`}
              </span>
              <span
                style={{
                  fontFamily: 'Newsreader, serif',
                  fontSize: 32,
                  color: 'var(--ink)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                {moneyExact(unitPrice * qty)}
              </span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--ink)' }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ ...qtyBtn, width: 36, height: 36 }}>
                −
              </button>
              <span style={{ padding: '0 14px', fontFamily: 'JetBrains Mono, monospace' }}>{qty}</span>
              <button onClick={() => setQty(qty + 1)} style={{ ...qtyBtn, width: 36, height: 36 }}>
                +
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <Btn variant="secondary" onClick={onClose} size="md">
              Close
            </Btn>
            <Btn
              variant="primary"
              onClick={() => onAdd(bundle, qty, hasMods ? mods : null, modsPrice)}
              full
              size="md"
              disabled={!allChosen}
            >
              {allChosen ? 'Add to basket →' : 'Pick required options'}
            </Btn>
          </div>
        </div>
      </div>
      <style jsx>{`
        @media (max-width: 760px) {
          .bundle-modal-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}

function MultiModifierGroup({
  group,
  value,
  cap,
  onToggle,
}: {
  group: Modifier;
  value: string[];
  cap: number;
  onToggle: (oid: string) => void;
}) {
  const remaining = Math.max(0, cap - value.length);
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
          }}
        >
          {group.label}
          {group.required && <span style={{ color: 'var(--accent)' }}> · required</span>}
        </div>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--ink-soft)' }}>
          {value.length}/{cap} chosen
          {remaining > 0 && cap > 0 && <span> · pick {remaining} more</span>}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
        {group.options.map((o) => {
          const sel = value.includes(o.id);
          const order = sel ? value.indexOf(o.id) + 1 : null;
          const disabled = cap === 0;
          return (
            <button
              key={o.id}
              onClick={() => !disabled && onToggle(o.id)}
              disabled={disabled}
              style={{
                background: sel ? 'var(--ink)' : 'var(--paper-deep)',
                color: sel ? 'var(--cream)' : 'var(--ink)',
                border: '1px solid ' + (sel ? 'var(--ink)' : 'var(--rule)'),
                padding: '12px 14px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderRadius: 2,
                opacity: disabled ? 0.4 : 1,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: sel ? 'none' : '1px solid var(--rule)',
                  background: sel ? 'var(--accent)' : 'transparent',
                  color: 'var(--cream)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                  flexShrink: 0,
                }}
              >
                {sel ? order : ''}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontFamily: 'Newsreader, serif', fontSize: 16, lineHeight: 1.15 }}>
                  {o.label}
                </span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11.5, opacity: sel ? 0.85 : 0.65 }}>
                  {o.sub}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ModifierGroup({
  group,
  value,
  onChange,
}: {
  group: Modifier;
  value: string;
  onChange: (oid: string) => void;
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
          }}
        >
          {group.label}
          {group.required && <span style={{ color: 'var(--accent)' }}> · required</span>}
        </div>
        {group.sub && (
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--ink-soft)' }}>
            {group.sub}
          </span>
        )}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(140px, 1fr))`,
          gap: 8,
        }}
      >
        {group.options.map((o) => {
          const sel = value === o.id;
          return (
            <button
              key={o.id}
              onClick={() => onChange(o.id)}
              style={{
                background: sel ? 'var(--ink)' : 'var(--paper-deep)',
                color: sel ? 'var(--cream)' : 'var(--ink)',
                border: '1px solid ' + (sel ? 'var(--ink)' : 'var(--rule)'),
                padding: '12px 14px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                borderRadius: 2,
              }}
            >
              <span style={{ fontFamily: 'Newsreader, serif', fontSize: 16, lineHeight: 1.15 }}>
                {o.label}
              </span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11.5, opacity: sel ? 0.8 : 0.7 }}>
                {o.sub}
                {o.delta && o.delta > 0 ? <span> · +{moneyExact(o.delta)}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
