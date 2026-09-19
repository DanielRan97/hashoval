"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { StoreProduct } from "@/lib/catalog";

export type CartItem = { productId: number; size: number; quantity: number };

const KEY = "hashoval_cart";
export const MAX_QTY = 10;

type CartCtx = {
  items: CartItem[];
  ready: boolean;
  add: (productId: number, size: number) => void;
  setQuantity: (productId: number, size: number, quantity: number) => void;
  remove: (productId: number, size: number) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

function load(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter((i) => Number.isInteger(i?.productId) && Number.isInteger(i?.size) && Number.isInteger(i?.quantity) && i.quantity > 0)
      : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(load());
    setReady(true);
  }, []);

  const update = useCallback((fn: (prev: CartItem[]) => CartItem[]) => {
    setItems((prev) => {
      const next = fn(prev);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Actions must keep a stable identity: ClearCart lists `clear` as an effect dependency,
  // and changing identities on every items update caused an infinite render loop.
  const actions = useMemo(
    () => ({
      add: (productId: number, size: number) =>
        update((prev) => {
          const existing = prev.find((i) => i.productId === productId && i.size === size);
          if (!existing) return [...prev, { productId, size, quantity: 1 }];
          return prev.map((i) => (i === existing ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + 1) } : i));
        }),
      setQuantity: (productId: number, size: number, quantity: number) =>
        update((prev) =>
          prev.map((i) => (i.productId === productId && i.size === size ? { ...i, quantity: Math.max(1, Math.min(MAX_QTY, quantity)) } : i)),
        ),
      remove: (productId: number, size: number) =>
        update((prev) => prev.filter((i) => !(i.productId === productId && i.size === size))),
      clear: () => update((prev) => (prev.length === 0 ? prev : [])),
    }),
    [update],
  );

  const value = useMemo<CartCtx>(() => ({ items, ready, ...actions }), [items, ready, actions]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}

export type CartLine = { productId: number; size: number; quantity: number; name: string; brand: string; unitPrice: number };

/** Joins cart items with the live catalog. Items no longer sold are returned in `unavailable`. */
export function useCartLines(catalog: StoreProduct[]) {
  const { items } = useCart();
  return useMemo(() => {
    const lines: CartLine[] = [];
    const unavailable: (CartItem & { label: string | null })[] = [];
    for (const i of items) {
      const p = catalog.find((x) => x.id === i.productId);
      const opt = p?.options.find((o) => o.size === i.size);
      if (!p || !opt) unavailable.push({ ...i, label: p ? `${p.brand} ${p.name}` : null });
      else lines.push({ ...i, name: p.name, brand: p.brand, unitPrice: opt.price });
    }
    const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    return { lines, unavailable, subtotal };
  }, [items, catalog]);
}

/**
 * Removes items that can no longer be bought (sold out, deactivated, size gone) as soon as the
 * cart or checkout opens. Returns what was removed so the page can tell the customer.
 */
export function useCartCleanup(catalog: StoreProduct[]) {
  const { ready, remove } = useCart();
  const { lines, unavailable, subtotal } = useCartLines(catalog);
  const [removed, setRemoved] = useState<(string | null)[]>([]);

  useEffect(() => {
    if (!ready || unavailable.length === 0) return;
    setRemoved((prev) => [...prev, ...unavailable.map((u) => u.label)]);
    unavailable.forEach((u) => remove(u.productId, u.size));
  }, [ready, unavailable, remove]);

  return { lines, subtotal, removed: [...new Set(removed)] };
}
