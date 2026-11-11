import { getAppFormatter } from "@/lib/formatter";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getBalances } from "@/lib/ledger";
import { getDisplayCurrency } from "@/lib/prefs";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { WalletCard } from "@/components/WalletCard";
import { StatusBadge } from "@/components/StatusBadge";
import { LedgerRow } from "@/components/account/LedgerRow";
import { InstantTabs } from "@/components/InstantTabs";
import { Celebrate } from "@/components/Celebrate";

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
    getAppFormatter(),
    getBalances(prisma, user.id),
    getDisplayCurrency(),
    getSettings(),
    prisma.ledgerEntry.findMany({
      // Everything is sent once; the tabs filter it in the browser (no reload per tab).
      where: { account: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { transaction: true, account: { select: { type: true } } },
    }),
    prisma.paymentIntent.findMany({
      where: { userId: user.id, orderId: null, status: { in: ["PENDING", "REVIEW", "REJECTED"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  const usd = settings.showUsd || balances.USD.available + balances.USD.held > 0;
  const tOrder = await getTranslations("order");
  // Deposit that just went through (or just reached the team): the "it worked" moment, once on this phone
  const tcel = await getTranslations("celebrate");
  const lastDeposit = await prisma.paymentIntent.findFirst({
    where: { userId: user.id, orderId: null, status: { in: ["SUCCEEDED", "REVIEW"] }, updatedAt: { gte: new Date(Date.now() - 20 * 60_000) } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div className="space-y-6">
      {lastDeposit && (
        <Celebrate
          kind={lastDeposit.status === "SUCCEEDED" ? "success" : "pending"}
          onceKey={`dep_${lastDeposit.id}_${lastDeposit.status}`}
          title={lastDeposit.status === "SUCCEEDED" ? tcel("depositTitle") : tcel("depositPendingTitle")}
          amount={`+${formatMoney(lastDeposit.amount, lastDeposit.currency, locale)}`}
          subtitle={lastDeposit.status === "SUCCEEDED" ? tcel("depositSub") : tcel("depositPendingSub")}
          cta={tcel("continue")}
        />
      )}
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

      <section>
        <InstantTabs
          label={tw("history")}
          param="f"
          initial={filter}
          title={<h2 className="display text-lg font-bold sm:text-xl">{tw("history")}</h2>}
          tabs={(Object.keys(FILTERS) as Filter[]).map((k) => ({ key: k, label: tw(`f_${k}`) }))}
          empty={<p className="py-10 text-center text-sm text-muted"><span className="block text-3xl" aria-hidden>🪙</span>{tw("noHistory")}</p>}
          items={entries.map((e) => ({
            id: e.id,
            groups: (Object.keys(FILTERS) as Filter[]).filter((k) => (FILTERS[k] as readonly string[] | null)?.includes(e.transaction.type)),
            node: (
              <LedgerRow
                type={e.transaction.type}
                amount={e.amount}
                currency={e.currency}
                locale={locale}
                title={tw(`tx.${e.transaction.type}`)}
                when={fmt.dateTime(e.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                detail={e.transaction.description?.replace(/^Order #(\d+)$/, (_, n) => tOrder("title", { number: n }))}
                held={e.account.type === "CUSTOMER_HELD"}
                heldLabel={tw("onHoldLabel")}
                doneLabel={tw("done")}
              />
            ),
          }))}
        />
      </section>
    </div>
  );
}
