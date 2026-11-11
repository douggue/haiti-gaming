"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { PlusIcon, StoreIcon, SendIcon, SwapIcon, WalletIcon } from "./Icons";
import { useHiddenBalance } from "./HiddenMoney";

type B = { available: number; held: number };

/**
 * Wallet balance card + action tiles (dashboard and wallet page).
 * The eye hides the amount everywhere (header chip included), remembered on this phone. Two kinds of "not yet":
 * money on hold (already approved, usable after a delay) and deposits the team is still checking.
 */
export function WalletCard({ balances, initial, showUsd = true, reviewing = 0 }: { balances: { HTG: B; USD: B }; initial: "HTG" | "USD"; showUsd?: boolean; reviewing?: number }) {
  const ta = useTranslations("account");
  const tc = useTranslations("common");
  const tw = useTranslations("wallet");
  const locale = useLocale();
  // Gourdes-only store: the USD side only exists for customers who actually hold dollars
  const usdVisible = showUsd || balances.USD.available + balances.USD.held > 0;
  const [cur, setCur] = useState<"HTG" | "USD">(usdVisible ? initial : "HTG");
  const [hidden, setHidden] = useHiddenBalance();
  const b = balances[cur];
  const money = (n: number) => (hidden ? "••••" : formatMoney(n, cur, locale));
  const actions = [
    ["/account/wallet/deposit", PlusIcon, ta("deposit"), "bg-gradient-to-br from-[#1d4ed8] to-[#3b82f6] text-white"],
    ["/account/wallet/transfer", SendIcon, ta("transfer"), "bg-emerald-500/20 text-emerald-300"],
    ["/store", StoreIcon, tc("store"), "bg-amber-500/20 text-amber-300"],
    ...(usdVisible ? ([["/account/wallet/exchange", SwapIcon, ta("exchange"), "bg-violet-500/20 text-violet-300"]] as const) : []),
  ] as const;
  const showReview = cur === "HTG" && reviewing > 0;

  return (
    <div className="space-y-3">
      <div className="on-dark relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(140deg,#1e3a8a_0%,#1d4ed8_40%,#0b1a4a_100%)] p-5 text-white shadow-[0_26px_50px_-24px_rgba(29,78,216,.9)] sm:p-6">
        <div className="ds-hide pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-[#38bdf8]/35 blur-3xl" aria-hidden />
        <div className="ds-hide pointer-events-none absolute -bottom-24 -left-10 h-52 w-52 rounded-full bg-[#7c3aed]/35 blur-3xl" aria-hidden />
        <div className="relative flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-semibold text-[#cfe0ff]"><WalletIcon width={18} height={18} /> {ta("available")}</span>
          <span className="flex items-center gap-1.5">
            {usdVisible && (
              <span className="inline-flex rounded-full bg-white/10 p-1 text-xs font-bold" role="tablist" aria-label={tc("currency")}>
                {(["HTG", "USD"] as const).map((c) => (
                  <button key={c} type="button" role="tab" aria-selected={cur === c} onClick={() => setCur(c)} className={`min-h-9 rounded-full px-3 ${cur === c ? "bg-white text-[#0d2a78]" : "text-white/85"}`}>
                    {c}
                  </button>
                ))}
              </span>
            )}
            <button type="button" onClick={() => setHidden(!hidden)} aria-pressed={hidden} aria-label={hidden ? tw("showBalance") : tw("hideBalance")} className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20">
              {hidden ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 3l18 18" /><path d="M10.6 5.1A10.5 10.5 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3.2 4M6.6 6.6A16.6 16.6 0 0 0 2.5 12S6 19 12 19a9.6 9.6 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="3" /></svg>
              )}
            </button>
          </span>
        </div>
        <p className="eyebrow relative mt-4 text-[#cfe0ff]">{cur}</p>
        <p className="display relative text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl" data-testid="wallet-balance">{money(b.available)}</p>
        <div className="relative mt-4 space-y-1.5">
          {/* Two different "not yet": approved money waiting out the hold, and deposits the team still checks */}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-[#cfe0ff]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 2h12M6 22h12M7 2c0 5 10 5 10 10S7 17 7 22M17 2c0 5-10 5-10 10s10 5 10 10" /></svg>
                {tw("onHoldLabel")}
              </span>
              <span className="block text-[11px] text-white/60">{tw("onHoldExplain")}</span>
            </span>
            <b className={`shrink-0 whitespace-nowrap ${b.held > 0 ? "text-[#ffd48a]" : "text-white/70"}`}>{money(b.held)}</b>
          </div>
          {showReview && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-400/15 px-3 py-2 text-sm" data-testid="wallet-reviewing">
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-[#ffe2a8]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                  {tw("reviewingLabel")}
                </span>
                <span className="block text-[11px] text-white/60">{tw("reviewingExplain")}</span>
              </span>
              <b className="shrink-0 whitespace-nowrap text-[#ffd48a]">{money(reviewing)}</b>
            </div>
          )}
        </div>
      </div>
      <div className={`grid gap-2 ${actions.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
        {actions.map(([href, Icon, label, tone]) => (
          <Link key={href} href={href} className="group flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface/80 px-1 py-3 text-center text-xs font-bold transition-colors hover:border-[#3b82f6]/50">
            <span className={`grid size-11 place-items-center rounded-full transition-transform group-hover:scale-105 ${tone}`}><Icon /></span>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
