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

export default async function TransferPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const settings = await getSettings();
  if (!settings.transfersEnabled) notFound();
  const [t, fmt, code, balances, sent, history] = await Promise.all([
    getTranslations("transfer"),
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
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
      </div>
      <MyCode code={code} />
      <TransferForm balance={balances.HTG.available} left={left} />
      <p className="text-xs text-muted">{t("limit", { limit: formatMoney(settings.transferDailyLimitHtg, "HTG", locale), left: formatMoney(left, "HTG", locale) })}</p>
      <section className="card p-5">
        <h2 className="mb-3 font-semibold">{t("history")}</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted">{t("none")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {history.map((h) => {
              const out = h.fromUserId === user.id;
              return (
                <li key={h.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0">
                    <b className="block truncate">{out ? t("to", { name: shortName(h.to.name) }) : t("from", { name: shortName(h.from.name) })}</b>
                    <span className="text-xs text-muted">{fmt.dateTime(h.createdAt, { dateStyle: "medium", timeStyle: "short" })}{h.note ? ` · ${h.note}` : ""}</span>
                  </span>
                  <b className={`shrink-0 ${out ? "text-danger" : "text-success"}`}>{out ? "−" : "+"}{formatMoney(h.amount, "HTG", locale)}</b>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
