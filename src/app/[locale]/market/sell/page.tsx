import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { rulesAccepted } from "@/lib/market-rules";
import { SellForm, VendorForm } from "@/components/market/MarketClient";
import { WhatsAppIcon } from "@/components/Icons";

export const metadata = { robots: { index: false } };

export default async function SellPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale, `/${locale}/market/sell`);
  const settings = await getSettings();
  if (!settings.marketEnabled) notFound();
  const [t, row, vendor] = await Promise.all([
    getTranslations("market"),
    prisma.user.findUnique({ where: { id: user.id }, select: { marketRulesAt: true } }),
    prisma.marketVendor.findUnique({ where: { userId: user.id }, select: { status: true, staffNote: true, shopName: true } }),
  ]);
  const rules = rulesAccepted(row?.marketRulesAt, settings);
  const agent = (settings.marketWhatsapp || settings.whatsappNumber).replace(/\D/g, "");
  const wa = `https://wa.me/${agent}?text=${encodeURIComponent(t("vendorWaText", { shop: vendor?.shopName ?? "" }))}`;
  // Only approved vendors can list; everyone else applies first.
  let body: React.ReactNode;
  if (vendor?.status === "APPROVED") body = <SellForm commissionPct={settings.marketCommissionBps / 100} rulesAccepted={rules} />;
  else if (vendor?.status === "PENDING")
    body = (
      <section className="card space-y-3 p-5" data-testid="vendor-pending">
        <p className="text-3xl" aria-hidden>⏳</p>
        <h2 className="text-lg font-bold">{t("vendorPendingTitle")}</h2>
        <p className="text-sm text-muted">{t("vendorPendingBody")}</p>
        <a href={wa} target="_blank" rel="noopener" className="btn-secondary min-h-11"><WhatsAppIcon width={16} height={16} className="text-[#1fa855]" /> {t("agent")}</a>
      </section>
    );
  else if (vendor?.status === "SUSPENDED")
    body = (
      <section className="card space-y-2 p-5">
        <h2 className="text-lg font-bold">{t("vendorSuspendedTitle")}</h2>
        {vendor.staffNote && <p className="text-sm text-danger">{vendor.staffNote}</p>}
        <a href={wa} target="_blank" rel="noopener" className="btn-secondary min-h-11"><WhatsAppIcon width={16} height={16} className="text-[#1fa855]" /> {t("agent")}</a>
      </section>
    );
  else
    body = (
      <>
        {vendor?.status === "REJECTED" && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{t("vendorRejected", { reason: vendor.staffNote ?? "" })}</p>}
        <VendorForm rulesAccepted={rules} again={vendor?.status === "REJECTED"} idRequired={settings.marketVendorIdRequired} />
      </>
    );
  return (
    <div className="container-page max-w-2xl space-y-5 py-6 sm:py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("sellTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{vendor?.status === "APPROVED" ? t("sellSubtitle") : t("vendorSubtitle")}</p>
      </div>
      {body}
    </div>
  );
}
