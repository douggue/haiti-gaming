"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { PlusIcon, StoreIcon, SendIcon, SwapIcon, WalletIcon } from "./Icons";

type B = { available: number; held: number };

/**
 * Wallet balance card + action tiles (dashboard and wallet page).
 * The 👁 button hides the amount (remembered on this phone); money on hold shows on its own line.
 */
export function WalletCard({ balances, initial, showUsd = true }: { balances: { HTG: B; USD: B }; initial: "HTG" | "USD"; showUsd?: boolean }) {
  const ta = useTranslations("account");
  const tc = useTranslations("common");
  const tw = useTranslations("wallet");
  const locale = useLocale();
  // Gourdes-only store: the USD side only exists for customers who actually hold dollars
  const usdVisible = showUsd || balances.USD.available + balances.USD.held > 0;
  const [cur, setCur] = useState<"HTG" | "USD">(usdVisible ? initial : "HTG");
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem("hg_hide_balance") === "1");
    } catch {}
  }, []);
  const toggleHidden = () => {
    const next = !hidden;
    setHidden(next);
    try {
      localStorage.setItem("hg_hide_balance", next ? "1" : "0");
    } catch {}
  };
  const b = balances[cur];
  const money = (n: number) => (hidden ? "••••" : formatMoney(n, cur, locale));
  const actions = [
    ["/account/wallet/deposit", PlusIcon, ta("deposit"), "bg-gradient-to-br from-[#1d4ed8] to-[#3b82f6] text-white"],
    ["/account/wallet/transfer", SendIcon, ta("transfer"), "bg-emerald-500/20 text-emerald-300"],
    ["/store", StoreIcon, ta("shop"), "bg-amber-500/20 text-amber-300"],
    ...(usdVisible ? ([["/account/wallet/exchange", SwapIcon, ta("exchange"), "bg-violet-500/20 text-violet-300"]] as const) : []),
  ] as const;

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(140deg,#1e3a8a_0%,#1d4ed8_40%,#0b1a4a_100%)] p-5 text-white shadow-[0_26px_50px_-24px_rgba(29,78,216,.9)] sm:p-6">
        <div className="ds-hide pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-[#38bdf8]/35 blur-3xl" aria-hidden />
        <div className="ds-hide pointer-events-none absolute -bottom-24 -left-10 h-52 w-52 rounded-full bg-[#7c3aed]/35 blur-3xl" aria-hidden />
        <div className="relative flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-semibold text-[#cfe0ff]"><WalletIcon width={18} height={18} /> {tc("wallet")}</span>
          <span className="flex items-center gap-1.5">
            {usdVisible && (
              <span className="inline-flex rounded-full bg-white/10 p-1 text-xs font-bold" role="tablist" aria-label={tc("currency")}>
                {(["HTG", "USD"] as const).map((c) => (
                  <button key={c} type="button" role="tab" aria-selected={cur === c} onClick={() => setCur(c)} className={`min-h-7 rounded-full px-3 ${cur === c ? "bg-white text-[#0d2a78]" : "text-white/85"}`}>
                    {c}
                  </button>
                ))}
              </span>
            )}
            <button type="button" onClick={toggleHidden} aria-pressed={hidden} aria-label={hidden ? tw("showBalance") : tw("hideBalance")} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/10 px-2.5 text-xs font-bold hover:bg-white/20">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
                {hidden ? <path d="M4 4l16 16" /> : <circle cx="12" cy="12" r="3" />}
              </svg>
            </button>
          </span>
        </div>
        <p className="eyebrow relative mt-5 text-[#cfe0ff]">{ta("available")} · {cur}</p>
        <p className="display relative text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl" data-testid="wallet-balance">{money(b.available)}</p>
        <div className="relative mt-4 flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2 text-sm">
          <span className="flex items-center gap-2 text-[#cfe0ff]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 3h12M6 21h12M7 3v3a5 5 0 0 0 10 0V3M7 21v-3a5 5 0 0 1 10 0v3" /></svg>
            {tw("onHoldLabel")}
          </span>
          <b className={`tabular-nums ${b.held > 0 ? "text-[#ffd48a]" : "text-white/80"}`}>{money(b.held)}</b>
        </div>
      </div>
      <div className={`grid gap-2 ${actions.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
        {actions.map(([href, Icon, label, tone]) => (
          <Link key={href} href={href} className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface/80 px-1 py-3.5 text-center text-xs font-bold transition-colors hover:border-[#3b82f6]/50">
            <span className={`grid size-12 place-items-center rounded-full transition-transform group-hover:scale-105 ${tone}`}><Icon /></span>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
