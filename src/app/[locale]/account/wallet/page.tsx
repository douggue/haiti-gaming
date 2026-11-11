import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getBalances } from "@/lib/ledger";
import { getDisplayCurrency } from "@/lib/prefs";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { WalletCard } from "@/components/WalletCard";
import { StatusBadge } from "@/components/StatusBadge";

const TX_ICON: Record<string, [string, string]> = {
  DEPOSIT: ["⬇️", "bg-emerald-500/15"],
  PURCHASE: ["🎮", "bg-[#3b82f6]/15"],
  REFUND: ["↩️", "bg-sky-500/15"],
  EXCHANGE: ["💱", "bg-violet-500/15"],
  ADJUSTMENT: ["🛠️", "bg-slate-500/15"],
  HOLD_RELEASE: ["🔓", "bg-amber-500/15"],
  TRANSFER: ["📤", "bg-indigo-500/15"],
};
const FILTERS = { all: null, deposits: ["DEPOSIT", "HOLD_RELEASE"], purchases: ["PURCHASE", "REFUND"], transfers: ["TRANSFER"] } as const;
type Filter = keyof typeof FILTERS;

export default async function WalletPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ f?: string }> }) {
  const { locale } = await params;
  const f = ((await searchParams).f ?? "all") as Filter;
  const filter: Filter = f in FILTERS ? f : "all";
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const [tw, fmt, balances, currency, settings, entries, pending] = await Promise.all([
    getTranslations("wallet"),
    getFormatter(),
    getBalances(prisma, user.id),
    getDisplayCurrency(),
    getSettings(),
    prisma.ledgerEntry.findMany({
      where: { account: { userId: user.id }, ...(FILTERS[filter] ? { transaction: { type: { in: [...FILTERS[filter]!] } } } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { transaction: true, account: { select: { type: true } } },
    }),
    prisma.paymentIntent.findMany({
      where: { userId: user.id, orderId: null, status: { in: ["PENDING", "REVIEW", "REJECTED"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  const usd = settings.showUsd || balances.USD.available + balances.USD.held > 0;
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-[#60a5fa]">{tw("eyebrow")}</p>
        <h1 className="display text-2xl font-extrabold tracking-tight sm:text-3xl">{tw("title")}</h1>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <WalletCard balances={balances} initial={currency} showUsd={settings.showUsd} />
        <div className="space-y-3">
          {pending.map((p) => (
            <div key={p.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${p.status === "REJECTED" ? "border-danger/40 bg-danger-soft" : p.status === "REVIEW" ? "border-amber-500/40 bg-amber-500/10" : "border-sky-500/40 bg-sky-500/10"}`}>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-lg" aria-hidden>{p.status === "REJECTED" ? "⛔" : "⏳"}</span>
              <span className="min-w-0 flex-1 text-sm">
                <b className="block">{formatMoney(p.amount, p.currency, locale)} · {p.provider}</b>
                <span className="block truncate text-xs text-muted">{fmt.dateTime(p.createdAt, { dateStyle: "medium", timeStyle: "short" })}{p.providerRef ? ` · ${p.providerRef}` : ""}</span>
                {p.status === "REJECTED" && p.reviewNote && <span className="block text-xs text-danger">{p.reviewNote}</span>}
              </span>
              <StatusBadge status={p.status} label={tw(`depositStatus.${p.status}`)} />
            </div>
          ))}
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface/80 p-4 text-sm">
            <span className="text-xl" aria-hidden>🛡️</span>
            <p className="text-muted">{usd ? tw("storeCredit") : tw("storeCreditHtg")} {tw("heldHint", { hours: settings.holdHours })}</p>
          </div>
          <a href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(tw("helpWa"))}`} target="_blank" rel="noopener" className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm hover:border-emerald-500/60">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#1fa855] text-white" aria-hidden>💬</span>
            <span className="min-w-0 flex-1"><b className="block">{tw("helpTitle")}</b><span className="text-xs text-muted">{settings.supportHours}</span></span>
            <span aria-hidden className="text-emerald-400">›</span>
          </a>
        </div>
      </div>

      <section className="rounded-3xl border border-border bg-surface/80 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="display text-lg font-bold">{tw("history")}</h2>
          <nav className="flex gap-1 overflow-x-auto rounded-full bg-surface-2 p-1 text-xs font-bold" aria-label={tw("history")}>
            {(Object.keys(FILTERS) as Filter[]).map((k) => (
              <a key={k} href={`?f=${k}`} aria-current={filter === k ? "page" : undefined} className={`shrink-0 rounded-full px-3 py-1.5 ${filter === k ? "bg-primary text-white" : "text-muted hover:text-text"}`}>{tw(`f_${k}`)}</a>
            ))}
          </nav>
        </div>
        {entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted"><span className="block text-3xl" aria-hidden>🪙</span>{tw("noHistory")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((e) => {
              const [icon, bg] = TX_ICON[e.transaction.type] ?? ["•", "bg-surface-2"];
              const incoming = e.amount > 0;
              return (
                <li key={e.id} className="flex items-center gap-3 py-3">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-2xl text-lg ${bg}`} aria-hidden>{incoming && e.transaction.type === "TRANSFER" ? "📥" : icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      {tw(`tx.${e.transaction.type}`)}
                      {e.account.type === "CUSTOMER_HELD" && <span className="rounded-full bg-amber-500/15 px-1.5 text-[10px] font-bold text-amber-500">⏳ {tw("onHoldLabel")}</span>}
                    </span>
                    <span className="block truncate text-xs text-muted">{fmt.dateTime(e.createdAt, { dateStyle: "medium", timeStyle: "short" })} · {e.transaction.description}</span>
                  </span>
                  <span className="text-right">
                    <b className={`display block text-sm tabular-nums ${incoming ? "text-emerald-400" : ""}`}>{incoming ? "+" : "−"}{formatMoney(Math.abs(e.amount), e.currency, locale)}</b>
                    <span className="text-[10px] font-semibold text-emerald-500">✓ {tw("done")}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
