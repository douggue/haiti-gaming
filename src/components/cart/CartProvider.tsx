"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartLine = {
  key: string;
  variantId: string;
  productSlug: string;
  productName: Record<string, string>;
  variantName: Record<string, string>;
  accent?: string | null;
  priceHtg: number;
  quantity: number;
  fields: Record<string, string>;
};

type StoreCtx = {
  currency: "HTG" | "USD";
  htgPerUsd: number;
  lines: CartLine[];
  count: number;
  ready: boolean;
  add: (line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const Ctx = createContext<StoreCtx | null>(null);
const STORAGE_KEY = "hg_cart_v1";

function lineKey(variantId: string, fields: Record<string, string>) {
  return `${variantId}:${Object.entries(fields).sort().map(([k, v]) => `${k}=${v}`).join("&")}`;
}

export function CartProvider({ children, currency, htgPerUsd }: { children: ReactNode; currency: "HTG" | "USD"; htgPerUsd: number }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      // storage unavailable (private mode) — cart works for this page view only
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {}
  }, [lines, ready]);

  const add = useCallback((line: Omit<CartLine, "key">) => {
    const key = lineKey(line.variantId, line.fields);
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) return prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(10, l.quantity + line.quantity) } : l));
      return [...prev, { ...line, key }].slice(-20);
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, Math.min(10, quantity)) } : l)));
  }, []);

  const remove = useCallback((key: string) => setLines((prev) => prev.filter((l) => l.key !== key)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ currency, htgPerUsd, lines, count: lines.reduce((s, l) => s + l.quantity, 0), ready, add, setQuantity, remove, clear }),
    [currency, htgPerUsd, lines, ready, add, setQuantity, remove, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside CartProvider");
  return ctx;
}
