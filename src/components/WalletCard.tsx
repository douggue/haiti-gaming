"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { PlusIcon, SwapIcon, WalletIcon } from "./Icons";

type B = { available: number; held: number };

export function WalletCard({ balances, initial }: { balances: { HTG: B; USD: B }; initial: "HTG" | "USD" }) {
  const ta = useTranslations("account");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [cur, setCur] = useState<"HTG" | "USD">(initial);
  const b = balances[cur];
  return (
    <div className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white shadow-xl shadow-navy/20 sm:p-7">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/40 blur-2xl" aria-hidden />
      <div className="relative flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm text-[#a9c4ff]"><WalletIcon width={18} height={18} /> {tc("wallet")}</span>
        <div className="inline-flex rounded-full bg-white/10 p-1 text-xs font-bold" role="tablist" aria-label={tc("currency")}>
          {(["HTG", "USD"] as const).map((c) => (
            <button key={c} type="button" role="tab" aria-selected={cur === c} onClick={() => setCur(c)} className={`rounded-full px-3 py-1 ${cur === c ? "bg-white text-navy" : "text-white/80"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <p className="relative mt-6 text-sm text-[#a9c4ff]">{ta("available")}</p>
      <p className="relative text-4xl font-extrabold tracking-tight sm:text-5xl">{formatMoney(b.available, cur, locale)}</p>
      {b.held > 0 && <p className="relative mt-1 text-sm text-[#ffd48a]">{ta("held", { amount: formatMoney(b.held, cur, locale) })}</p>}
      <div className="relative mt-6 grid grid-cols-3 gap-2">
        <Link href="/account/wallet/deposit" className="flex flex-col items-center gap-1 rounded-2xl bg-white/10 py-3 text-xs font-semibold hover:bg-white/15"><PlusIcon /> {ta("deposit")}</Link>
        <Link href="/account/wallet/exchange" className="flex flex-col items-center gap-1 rounded-2xl bg-white/10 py-3 text-xs font-semibold hover:bg-white/15"><SwapIcon /> {ta("exchange")}</Link>
        <Link href="/store" className="flex flex-col items-center gap-1 rounded-2xl bg-white/10 py-3 text-xs font-semibold hover:bg-white/15"><span aria-hidden className="text-lg leading-5">🎮</span> {ta("shop")}</Link>
      </div>
    </div>
  );
}
