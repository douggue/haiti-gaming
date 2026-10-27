import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { SellForm } from "@/components/market/MarketClient";

export const metadata = { robots: { index: false } };

export default async function SellPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale, `/${locale}/market/sell`);
  const settings = await getSettings();
  if (!settings.marketEnabled) notFound();
  const [t, row] = await Promise.all([getTranslations("market"), prisma.user.findUnique({ where: { id: user.id }, select: { marketRulesAt: true } })]);
  return (
    <div className="container-page max-w-2xl space-y-5 py-6 sm:py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("sellTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t("sellSubtitle")}</p>
      </div>
      <SellForm commissionPct={settings.marketCommissionBps / 100} rulesAccepted={!!row?.marketRulesAt} />
    </div>
  );
}
