"use client";

import { useSyncExternalStore } from "react";

// Cart, wishlist, compare and recently viewed live in the browser (localStorage) and
// sync across tabs. The cart only remembers ids, quantities and a display snapshot;
// prices are always re-checked by the server before payment.

export type CartItem = { productId: number; slug: string; name: string; image: string | null; price: number; mrp: number | null; qty: number };
export type SavedItem = { productId: number; slug: string; name: string; image: string | null; price: number; mrp: number | null };

function createStore<T>(key: string, fallback: T) {
  const listeners = new Set<() => void>();
  let cache: T | null = null;
  let raw: string | null = null;

  function read(): T {
    if (typeof window === "undefined") return fallback;
    let next: string | null = null;
    try {
      next = window.localStorage.getItem(key);
    } catch {}
    if (cache !== null && next === raw) return cache;
    raw = next;
    try {
      cache = next ? (JSON.parse(next) as T) : fallback;
    } catch {
      cache = fallback;
    }
    return cache;
  }

  function write(value: T) {
    cache = value;
    raw = JSON.stringify(value);
    try {
      window.localStorage.setItem(key, raw);
    } catch {}
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  return {
    get: read,
    set: write,
    update: (fn: (v: T) => T) => write(fn(read())),
    use: () => useSyncExternalStore(subscribe, read, () => fallback),
  };
}

const EMPTY_CART: CartItem[] = [];
const EMPTY_LIST: SavedItem[] = [];
const EMPTY_SLUGS: string[] = [];

export const cartStore = createStore<CartItem[]>("gn_cart_v1", EMPTY_CART);
export const wishlistStore = createStore<SavedItem[]>("gn_wishlist_v1", EMPTY_LIST);
export const compareStore = createStore<SavedItem[]>("gn_compare_v1", EMPTY_LIST);
export const recentStore = createStore<string[]>("gn_recent_v1", EMPTY_SLUGS);

// ---------------------------------------------------------------- cart ui events

let drawerOpen = false;
const drawerListeners = new Set<() => void>();
export function setCartOpen(open: boolean) {
  drawerOpen = open;
  drawerListeners.forEach((l) => l());
}
export function useCartOpen() {
  return useSyncExternalStore(
    (l) => {
      drawerListeners.add(l);
      return () => drawerListeners.delete(l);
    },
    () => drawerOpen,
    () => false,
  );
}

export function addToCart(item: Omit<CartItem, "qty">, qty = 1) {
  cartStore.update((items) => {
    const found = items.find((i) => i.productId === item.productId);
    if (found) return items.map((i) => (i.productId === item.productId ? { ...i, ...item, qty: Math.min(99, i.qty + qty) } : i));
    return [...items, { ...item, qty }];
  });
}

export function setCartQty(productId: number, qty: number) {
  cartStore.update((items) => (qty <= 0 ? items.filter((i) => i.productId !== productId) : items.map((i) => (i.productId === productId ? { ...i, qty: Math.min(99, qty) } : i))));
}

export function clearCart() {
  cartStore.set([]);
}

export function toggleSaved(store: typeof wishlistStore, item: SavedItem, limit = 100) {
  let added = false;
  store.update((items) => {
    if (items.some((i) => i.productId === item.productId)) return items.filter((i) => i.productId !== item.productId);
    added = true;
    return [item, ...items].slice(0, limit);
  });
  return added;
}

export function pushRecent(slug: string) {
  recentStore.update((slugs) => [slug, ...slugs.filter((s) => s !== slug)].slice(0, 12));
}
