"use client";
import { useLocale } from "next-intl";
import { formatMoney, priceIn } from "@/lib/money";
import { useStore } from "./cart/CartProvider";

/** Shows an HTG-based price in the visitor's display currency. */
export function Price({ htg, className }: { htg: number; className?: string }) {
  const { currency, htgPerUsd } = useStore();
  const locale = useLocale();
  return <span className={className}>{formatMoney(priceIn(htg, currency, htgPerUsd), currency, locale)}</span>;
}
