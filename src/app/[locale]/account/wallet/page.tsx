import * as UI from "@/components/Icons";
import { getAppFormatter } from "@/lib/formatter";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getBalances } from "@/lib/ledger";
import { getDisplayCurrency } from "@/lib/prefs";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { t as txt } from "@/lib/text";
import { WalletCard } from "@/components/WalletCard";
import { LedgerRow } from "@/components/account/LedgerRow";
import { InstantTabs } from "@/components/InstantTabs";
import { WhatsAppIcon } from "@/components/Icons";
import { Celebrate } from "@/components/Celebrate";
import { DepositRow } from "@/components/account/DepositRow";
import { ledgerDetail, transferNames } from "@/lib/ledger-text";

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
    // Deposits that are not wallet money yet: sent to the team, unfinished (last day), refused (last month)
    prisma.paymentIntent.findMany({
      where: {
        userId: user.id,
        orderId: null,
        OR: [
          { status: "REVIEW" },
          { status: "PENDING", createdAt: { gte: new Date(Date.now() - 86_400_000) } },
          { status: "REJECTED", updatedAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { manualMethod: { select: { name: true } } },
    }),
  ]);
  const names = await transferNames(entries);
  const reviewing = pending.filter((p) => p.status === "REVIEW" && p.currency === "HTG").reduce((s, p) => s + p.amount, 0);
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
          amount={lastDeposit.status === "SUCCEEDED" ? `+${formatMoney(lastDeposit.amount, lastDeposit.currency, locale)}` : formatMoney(lastDeposit.amount, lastDeposit.currency, locale)}
          subtitle={lastDeposit.status === "SUCCEEDED" ? tcel("depositSub") : tcel("depositPendingSub")}
          cta={tcel("continue")}
        />
      )}
      <div>
        <p className="eyebrow text-[#60a5fa]">{tw("eyebrow")}</p>
        <h1 className="display text-2xl font-extrabold tracking-tight sm:text-3xl">{tw("title")}</h1>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <WalletCard balances={balances} initial={currency} showUsd={settings.showUsd} reviewing={reviewing} />
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface/80 p-4 text-sm">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#60a5fa]" aria-hidden><path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6L12 3Z" /><path d="m9 12 2 2 4-4" /></svg>
            <p className="text-muted">{usd ? tw("storeCredit") : tw("storeCreditHtg")} {tw("heldHint", { hours: settings.holdHours })}</p>
          </div>
          <a href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(tw("helpWa"))}`} target="_blank" rel="noopener" className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm hover:border-emerald-500/60">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#15803d] text-white" aria-hidden><WhatsAppIcon width={20} height={20} /></span>
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
          empty={<p className="py-10 text-center text-sm text-muted"><span className="mx-auto mb-2 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary" aria-hidden><UI.CoinIcon width={28} height={28} /></span>{tw("noHistory")}</p>}
          items={[
            ...pending.map((p) => ({
              id: `dep-${p.id}`,
              groups: ["deposits"],
              node: (
                <DepositRow
                  intent={{ ...p, methodName: p.manualMethod ? txt(p.manualMethod.name, locale) : undefined }}
                  locale={locale}
                  when={fmt.dateTime(p.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                  labels={{
                    title: tw("tx.DEPOSIT"),
                    status: tw(`depositStatus.${p.status}`),
                    again: tw("sendAgain"),
                    support: tw("contactSupport"),
                    supportSubject: tw("supportSubject", { amount: formatMoney(p.amount, p.currency, locale) }),
                    supportMessage: tw("supportMessage", { amount: formatMoney(p.amount, p.currency, locale), ref: p.providerRef ?? p.id }),
                  }}
                />
              ),
            })),
            ...entries.map((e) => ({
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
                detail={ledgerDetail(e.transaction, e.amount, names, tw, tOrder)}
                held={e.account.type === "CUSTOMER_HELD"}
                heldLabel={tw("onHoldLabel")}
                doneLabel={tw("done")}
              />
            ),
          })),
          ]}
        />
      </section>
    </div>
  );
}
