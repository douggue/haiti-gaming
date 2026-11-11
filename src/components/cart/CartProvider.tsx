"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getSavedCart, saveCart } from "@/actions/customer";
import { priceIn } from "@/lib/money";
import { track } from "../AnalyticsBeacon";

export type CartLine = {
  key: string;
  variantId: string;
  productSlug: string;
  productName: Record<string, string>;
  variantName: Record<string, string>;
  accent?: string | null;
  image?: string | null;
  priceHtg: number;
  quantity: number;
  fields: Record<string, string>;
  /** "Customer enters the amount" products: USD cents typed, and the price in USD (not converted at the store rate) */
  amount?: number;
  priceUsd?: number;
  /** Delivered to an address (accessories): checkout asks where */
  physical?: boolean;
};

/** Unit price of a cart line in the display currency. */
export function linePrice(l: Pick<CartLine, "priceHtg" | "priceUsd">, currency: "HTG" | "USD", htgPerUsd: number) {
  return currency === "USD" && l.priceUsd != null ? l.priceUsd : priceIn(l.priceHtg, currency, htgPerUsd);
}

type StoreCtx = {
  currency: "HTG" | "USD";
  htgPerUsd: number;
  lines: CartLine[];
  count: number;
  ready: boolean;
  add: (line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  /** New player ID / account details for a line (merges with an identical line if there is one) */
  updateFields: (key: string, fields: Record<string, string>) => void;
  clear: () => void;
};

const Ctx = createContext<StoreCtx | null>(null);
const STORAGE_KEY = "hg_cart_v2";
const OLD_KEY = "hg_cart_v1";

/** What this device keeps: the lines, when they last changed, and whether they were added while signed out. */
type Stored = { lines: CartLine[]; updatedAt: number; guest: boolean };

function readLocal(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<Stored>;
      return { lines: Array.isArray(v.lines) ? v.lines : [], updatedAt: Number(v.updatedAt) || 0, guest: !!v.guest };
    }
    const old = localStorage.getItem(OLD_KEY);
    if (old) return { lines: JSON.parse(old), updatedAt: 0, guest: true };
  } catch {
    // storage unavailable (private mode): the cart works for this page view only
  }
  return { lines: [], updatedAt: 0, guest: false };
}

export function lineKey(variantId: string, fields: Record<string, string>, amount?: number) {
  return `${variantId}:${amount ? `$${amount}:` : ""}${Object.entries(fields).sort().map(([k, v]) => `${k}=${v}`).join("&")}`;
}

/**
 * Cart: kept on the device, and on the account when signed in. When the two differ, the one changed last wins
 * (so items removed on one device don't come back from another). A cart filled while signed out is added to
 * the account's cart once, at sign-in.
 */
export function CartProvider({ children, currency, htgPerUsd, signedIn = false }: { children: ReactNode; currency: "HTG" | "USD"; htgPerUsd: number; signedIn?: boolean }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const synced = useRef(false);
  const updatedAt = useRef(0);
  // Set by add/remove/quantity/clear: only real changes move the "last changed" time.
  const changed = useRef(false);
  const pending = useRef<CartLine[] | null>(null);

  const push = useCallback((l: CartLine[]) => {
    pending.current = null;
    saveCart(l, updatedAt.current).catch(() => (pending.current = l));
  }, []);

  useEffect(() => {
    const local = readLocal();
    updatedAt.current = local.updatedAt;
    setLines(local.lines);
    setReady(true);
    if (!signedIn) return;
    getSavedCart().then((remote) => {
      // Uses the cart as it is now: a change made while the account's cart was loading is kept.
      setLines((cur) => {
        let result: CartLine[];
        if (local.guest && cur.length) {
          // Added while signed out: keep both, the account's items first.
          result = [...remote.lines];
          for (const l of cur) if (!result.some((r) => r.key === l.key)) result.push(l);
          result = result.slice(-20);
          updatedAt.current = Math.max(Date.now(), remote.updatedAt + 1);
        } else if (updatedAt.current > remote.updatedAt) {
          result = cur;
        } else {
          result = remote.lines;
          updatedAt.current = remote.updatedAt;
        }
        synced.current = true;
        pending.current = updatedAt.current > remote.updatedAt ? result : null;
        return result;
      });
      // The cart may not change on screen (this device was newer): still send it to the account.
      setTimeout(() => pending.current && push(pending.current), 0);
    });
  }, [signedIn, push]);

  useEffect(() => {
    if (!ready) return;
    if (changed.current) {
      changed.current = false;
      updatedAt.current = Date.now();
      if (signedIn && synced.current) pending.current = lines;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines, updatedAt: updatedAt.current, guest: !signedIn } satisfies Stored));
      localStorage.removeItem(OLD_KEY);
    } catch {}
    if (!pending.current) return;
    const id = setTimeout(() => pending.current && push(pending.current), 300);
    return () => clearTimeout(id);
  }, [lines, ready, signedIn, push]);

  // Leaving the page (or the app going to the background): save now instead of waiting.
  useEffect(() => {
    const flush = () => pending.current && push(pending.current);
    const onHide = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [push]);

  const add = useCallback((line: Omit<CartLine, "key">) => {
    const key = lineKey(line.variantId, line.fields, line.amount);
    changed.current = true;
    track("add_to_cart");
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) return prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(10, l.quantity + line.quantity) } : l));
      return [...prev, { ...line, key }].slice(-20);
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    changed.current = true;
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, Math.min(10, quantity)) } : l)));
  }, []);

  const remove = useCallback((key: string) => {
    changed.current = true;
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);
  const updateFields = useCallback((key: string, fields: Record<string, string>) => {
    changed.current = true;
    setLines((prev) => {
      const line = prev.find((l) => l.key === key);
      if (!line) return prev;
      const nextKey = lineKey(line.variantId, fields, line.amount);
      if (nextKey === key) return prev.map((l) => (l.key === key ? { ...l, fields } : l));
      const twin = prev.find((l) => l.key === nextKey);
      if (twin) return prev.filter((l) => l.key !== key).map((l) => (l.key === nextKey ? { ...l, quantity: Math.min(10, l.quantity + line.quantity) } : l));
      return prev.map((l) => (l.key === key ? { ...l, fields, key: nextKey } : l));
    });
  }, []);
  const clear = useCallback(() => {
    changed.current = true;
    setLines([]);
  }, []);

  const value = useMemo(
    () => ({ currency, htgPerUsd, lines, count: lines.reduce((s, l) => s + l.quantity, 0), ready, add, setQuantity, remove, updateFields, clear }),
    [currency, htgPerUsd, lines, ready, add, setQuantity, remove, updateFields, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside CartProvider");
  return ctx;
}
