"use client";
import { useLocale } from "next-intl";
import { formatMoney, priceIn } from "@/lib/money";
import { useStore } from "./cart/CartProvider";

/** Shows an HTG-based price in the visitor's display currency. */
export function Price({ htg, usd, className }: { htg: number; usd?: number; className?: string }) {
  const { currency, htgPerUsd } = useStore();
  const locale = useLocale();
  const value = currency === "USD" && usd != null ? usd : priceIn(htg, currency, htgPerUsd);
  return <span className={className}>{formatMoney(value, currency, locale)}</span>;
}

/** Big number with a small currency code after it ("150 HTG" → 150 + small HTG), as on the package tiles. */
export function PriceSplit({ htg, usd, className, unitClassName }: { htg: number; usd?: number; className?: string; unitClassName?: string }) {
  const { currency, htgPerUsd } = useStore();
  const locale = useLocale();
  const value = currency === "USD" && usd != null ? usd : priceIn(htg, currency, htgPerUsd);
  return <MoneySplit minor={value} currency={currency} locale={locale} className={className} unitClassName={unitClassName} />;
}

export function MoneySplit({ minor, currency, locale, className, unitClassName = "ml-1 text-[0.55em] font-bold opacity-80" }: { minor: number; currency: "HTG" | "USD"; locale: string; className?: string; unitClassName?: string }) {
  const text = formatMoney(minor, currency, locale);
  if (currency !== "HTG") return <span className={className}>{text}</span>;
  return (
    <span className={`whitespace-nowrap ${className ?? ""}`}>
      {text.replace(/\s*HTG$/, "")}
      <span className={unitClassName}>HTG</span>
    </span>
  );
}
