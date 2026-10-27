import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getBalances } from "@/lib/ledger";
import { getDisplayCurrency } from "@/lib/prefs";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { shortName } from "@/lib/trust";
import { transferCodeFor } from "@/lib/transfer";
import { WalletCard } from "@/components/WalletCard";
import { WalletHistory, type WalletRow } from "@/components/WalletHistory";
import { CopyButton } from "@/components/CopyButton";

const DEPOSIT_TONE: Record<string, string> = {
  PENDING: "border-sky-500/40 bg-sky-500/10",
  REVIEW: "border-amber-500/40 bg-amber-500/10",
  REJECTED: "border-danger/40 bg-danger-soft",
};

export default async function WalletPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [tw, ta, fmt, balances, currency, settings, entries, pending, transfers, code] = await Promise.all([
    getTranslations("wallet"),
    getTranslations("account"),
    getFormatter(),
    getBalances(prisma, user.id),
    getDisplayCurrency(),
    getSettings(),
    prisma.ledgerEntry.findMany({
      where: { account: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { transaction: true, account: { select: { type: true } } },
    }),
    prisma.paymentIntent.findMany({
      where: { userId: user.id, orderId: null, status: { in: ["PENDING", "REVIEW", "REJECTED"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.transfer.findMany({
      where: { OR: [{ fromUserId: user.id }, { toUserId: user.id }] },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { from: { select: { name: true } }, to: { select: { name: true } } },
    }),
    transferCodeFor(user.id),
  ]);

  // Day headings: Today / Yesterday / date
  const dayOf = (d: Date) => {
    const k = (x: Date) => x.toISOString().slice(0, 10);
    const today = new Date();
    const yest = new Date(Date.now() - 86_400_000);
    return k(d) === k(today) ? tw("today") : k(d) === k(yest) ? tw("yesterday") : fmt.dateTime(d, { dateStyle: "full" });
  };
  // Transfers: show who the money went to / came from (matched by time and amount)
  const transferFor = (at: Date, amount: number) => transfers.find((x) => x.amount === Math.abs(amount) && Math.abs(x.createdAt.getTime() - at.getTime()) < 10_000);

  // Only the customer's own money: entries on the held account are shown with a badge
  const rows: WalletRow[] = entries.map((e) => {
    const incoming = e.amount > 0;
    let type: string = e.transaction.type;
    let title = tw.has(`tx.${type}`) ? tw(`tx.${type}` as "tx.DEPOSIT") : type;
    let sub = e.transaction.description;
    if (type === "TRANSFER") {
      const x = transferFor(e.createdAt, e.amount);
      type = incoming ? "TRANSFER_IN" : "TRANSFER_OUT";
      title = incoming ? tw("transferIn", { name: x ? shortName(x.from.name) : "—" }) : tw("transferOut", { name: x ? shortName(x.to.name) : "—" });
      sub = x?.note ?? "";
    }
    return {
      id: e.id,
      type,
      title,
      sub,
      time: fmt.dateTime(e.createdAt, { timeStyle: "short" }),
      day: dayOf(e.createdAt),
      amount: formatMoney(Math.abs(e.amount), e.currency, locale),
      incoming,
      held: e.account.type === "CUSTOMER_HELD",
    };
  });

  // Last 30 days, in gourdes
  const recent = entries.filter((e) => e.createdAt >= since && e.currency === "HTG" && e.account.type !== "CUSTOMER_HELD" && e.transaction.type !== "HOLD_RELEASE");
  const moneyIn = recent.filter((e) => e.amount > 0).reduce((a, e) => a + e.amount, 0);
  const moneyOut = recent.filter((e) => e.amount < 0).reduce((a, e) => a - e.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{tw("title")}</h1>
        <Link href="/account/wallet/deposit" className="btn-primary min-h-10 px-4 text-sm">＋ {ta("deposit")}</Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <WalletCard balances={balances} initial={currency} showUsd={settings.showUsd} />
        <div className="grid content-start gap-3">
          {/* Last 30 days */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-transparent p-4">
              <p className="text-xs font-semibold text-muted">⬇️ {tw("moneyIn")}</p>
              <p className="mt-1 truncate text-xl font-black text-emerald-500">+{formatMoney(moneyIn, "HTG", locale)}</p>
              <p className="text-[11px] text-muted">{tw("last30")}</p>
            </div>
            <div className="rounded-3xl border border-rose-500/30 bg-gradient-to-br from-rose-500/15 to-transparent p-4">
              <p className="text-xs font-semibold text-muted">⬆️ {tw("moneyOut")}</p>
              <p className="mt-1 truncate text-xl font-black">−{formatMoney(moneyOut, "HTG", locale)}</p>
              <p className="text-[11px] text-muted">{tw("last30")}</p>
            </div>
          </div>
          {/* My code, to receive money */}
          {settings.transfersEnabled && code && (
            <div className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-lg text-white" aria-hidden>🪪</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-muted">{tw("myCodeLabel")}</span>
                <code className="text-lg font-black tracking-wider">{code}</code>
              </span>
              <CopyButton value={code} label={tw("copy")} done={tw("copied")} />
            </div>
          )}
          <p className="flex items-start gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-xs text-muted">
            <span aria-hidden>ℹ️</span>
            <span>{tw("storeCredit")} {tw("heldHint", { hours: settings.holdHours })}</span>
          </p>
        </div>
      </div>

      {pending.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold">{tw("pending")}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {pending.map((p) => (
              <li key={p.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${DEPOSIT_TONE[p.status] ?? "border-border"}`}>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-lg" aria-hidden>{p.status === "REJECTED" ? "⛔" : "⏳"}</span>
                <span className="min-w-0 flex-1 text-sm">
                  <b className="block">{formatMoney(p.amount, p.currency, locale)} · {p.provider}</b>
                  <span className="block truncate text-xs text-muted">{fmt.dateTime(p.createdAt, { dateStyle: "medium", timeStyle: "short" })}{p.providerRef ? ` · ${p.providerRef}` : ""}</span>
                  {p.status === "REJECTED" && p.reviewNote && <span className="block text-xs text-danger">{p.reviewNote}</span>}
                </span>
                <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold">{tw(`depositStatus.${p.status}`)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <WalletHistory rows={rows} />
    </div>
  );
}
