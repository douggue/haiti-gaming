import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getBalances } from "@/lib/ledger";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { sentToday, transferCodeFor } from "@/lib/transfer";
import { shortName } from "@/lib/trust";
import { TransferForm, MyCode } from "@/components/TransferForm";
import { LedgerRow } from "@/components/account/LedgerRow";
import { Link } from "@/i18n/navigation";

export default async function TransferPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const settings = await getSettings();
  if (!settings.transfersEnabled) notFound();
  const [t, tw, tc, fmt, code, balances, sent, history] = await Promise.all([
    getTranslations("transfer"),
    getTranslations("wallet"),
    getTranslations("common"),
    getFormatter(),
    transferCodeFor(user.id),
    getBalances(prisma, user.id),
    sentToday(user.id),
    prisma.transfer.findMany({
      where: { OR: [{ fromUserId: user.id }, { toUserId: user.id }] },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { from: { select: { name: true } }, to: { select: { name: true } } },
    }),
  ]);
  const left = Math.max(0, settings.transferDailyLimitHtg - sent);
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/account/wallet" className="text-sm text-muted hover:text-text">← {tc("wallet")}</Link>
        <h1 className="display mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
      </div>
      <MyCode code={code} />
      <TransferForm balance={balances.HTG.available} left={left} />
      <p className="text-xs text-muted">{t("limit", { limit: formatMoney(settings.transferDailyLimitHtg, "HTG", locale), left: formatMoney(left, "HTG", locale) })}</p>
      <section>
        <h2 className="display mb-3 text-lg font-bold">{t("history")}</h2>
        {history.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface/80 py-8 text-center text-sm text-muted">{t("none")}</p>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => {
              const out = h.fromUserId === user.id;
              return (
                <LedgerRow
                  key={h.id}
                  type="TRANSFER"
                  amount={out ? -h.amount : h.amount}
                  currency="HTG"
                  locale={locale}
                  title={out ? t("to", { name: shortName(h.to.name) }) : t("from", { name: shortName(h.from.name) })}
                  when={fmt.dateTime(h.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                  detail={h.note}
                  heldLabel={tw("onHoldLabel")}
                  doneLabel={tw("done")}
                />
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
