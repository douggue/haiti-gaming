import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { commissionOf, platformOf } from "@/lib/market";
import { listingImages } from "@/lib/market-data";
import { MarketAction, RateSeller } from "@/components/market/MarketClient";
import { WhatsAppIcon } from "@/components/Icons";
import { PlatformIcon } from "@/components/market/PlatformIcon";

const TONE: Record<string, string> = {
  ACTIVE: "bg-success-soft text-success",
  COMPLETED: "bg-success-soft text-success",
  SOLD: "bg-success-soft text-success",
  PENDING: "bg-surface-2 text-muted",
  REQUESTED: "bg-surface-2 text-muted",
  RESERVED: "bg-amber-500/15 text-amber-600",
  PAID: "bg-primary/15 text-primary",
  DELIVERED: "bg-primary/15 text-primary",
  REJECTED: "bg-danger-soft text-danger",
  DISPUTED: "bg-danger-soft text-danger",
  CANCELED: "bg-surface-2 text-muted",
  REMOVED: "bg-surface-2 text-muted",
};

export default async function MyMarket({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ posted?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const sp = await searchParams;
  const [t, fmt, settings] = await Promise.all([getTranslations("market"), getFormatter(), getSettings()]);
  const [listings, purchases, sales] = await Promise.all([
    prisma.marketListing.findMany({ where: { sellerId: user.id, status: { not: "REMOVED" } }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.marketDeal.findMany({ where: { buyerId: user.id }, orderBy: { createdAt: "desc" }, take: 50, include: { listing: { select: { id: true, title: true, platform: true } } } }),
    prisma.marketDeal.findMany({ where: { sellerId: user.id }, orderBy: { createdAt: "desc" }, take: 50, include: { listing: { select: { id: true, title: true, platform: true } } } }),
  ]);
  const st = (s: string) => (t.has(`s_${s}`) ? t(`s_${s}` as "s_ACTIVE") : s);
  const badge = (s: string) => <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[s] ?? ""}`}>{st(s)}</span>;
  const agent = (settings.marketWhatsapp || settings.whatsappNumber).replace(/\D/g, "");
  const wa = (n: number) => `https://wa.me/${agent}?text=${encodeURIComponent(t("dealText", { number: n }))}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("myTitle")}</h1>
          <p className="mt-1 text-sm text-muted">{t("mySubtitle")}</p>
        </div>
        <span className="flex gap-2">
          <Link href="/market" className="btn-secondary">{t("browse")}</Link>
          <Link href="/market/sell" className="btn-primary">＋ {t("sell")}</Link>
        </span>
      </div>
      {sp.posted && <p className="rounded-xl bg-success-soft px-4 py-3 text-sm text-success" role="status">{t("posted_ok")}</p>}

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">{t("myPurchases")}</h2>
        {purchases.length === 0 ? <p className="text-sm text-muted">{t("noneYet")}</p> : (
          <ul className="divide-y divide-border">
            {purchases.map((d) => (
              <li key={d.id} className="space-y-2 py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/market/${d.listing.id}`} className="min-w-0"><b className="flex items-center gap-1.5 truncate"><PlatformIcon platform={d.listing.platform} size={20} /> {d.listing.title}</b><span className="text-xs text-muted">#{d.number} · {fmt.dateTime(d.createdAt, { dateStyle: "medium" })} · {formatMoney(d.price, d.currency, locale)}</span></Link>
                  {badge(d.status)}
                </div>
                <p className="text-xs text-muted">{t(`buyerStep_${d.status}` as "buyerStep_REQUESTED")}</p>
                <div className="flex flex-wrap gap-2">
                  {!["COMPLETED", "CANCELED"].includes(d.status) && <a href={wa(d.number)} target="_blank" rel="noopener" className="btn-secondary min-h-9 px-3 text-xs"><WhatsAppIcon width={14} height={14} className="text-[#1fa855]" /> {t("agent")}</a>}
                  {d.status === "REQUESTED" && <MarketAction kind="cancel" id={d.id} />}
                  {d.status === "DELIVERED" && <MarketAction kind="confirm" id={d.id} />}
                </div>
                {d.status === "COMPLETED" && (d.rating ? <p className="text-xs">{"★".repeat(d.rating)}<span className="text-border">{"★".repeat(5 - d.rating)}</span> {d.ratingNote}</p> : <RateSeller dealId={d.id} />)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">{t("mySales")}</h2>
        {sales.length === 0 ? <p className="text-sm text-muted">{t("noneYet")}</p> : (
          <ul className="divide-y divide-border">
            {sales.map((d) => {
              const cut = d.commission ?? commissionOf(d.price, settings.marketCommissionBps);
              return (
                <li key={d.id} className="space-y-1 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <b className="flex min-w-0 items-center gap-1.5 truncate"><PlatformIcon platform={d.listing.platform} size={20} /> {d.listing.title} <span className="font-normal text-muted">#{d.number}</span></b>
                    {badge(d.status)}
                  </div>
                  <p className="text-xs text-muted">{t("youReceive", { price: formatMoney(d.price, d.currency, locale), cut: formatMoney(cut, d.currency, locale), net: formatMoney(d.price - cut, d.currency, locale) })}</p>
                  <p className="text-xs text-muted">{t(`sellerStep_${d.status}` as "sellerStep_REQUESTED")}</p>
                  {!["COMPLETED", "CANCELED"].includes(d.status) && <a href={wa(d.number)} target="_blank" rel="noopener" className="btn-secondary min-h-9 px-3 text-xs"><WhatsAppIcon width={14} height={14} className="text-[#1fa855]" /> {t("agent")}</a>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">{t("myListings")}</h2>
        {listings.length === 0 ? <p className="text-sm text-muted">{t("noneYet")}</p> : (
          <ul className="divide-y divide-border">
            {listings.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-3 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={listingImages(l.images)[0]} alt="" className="size-14 shrink-0 rounded-xl bg-surface-2 object-cover" />
                <div className="min-w-0 flex-1">
                  <Link href={`/market/${l.id}`} className="block truncate font-semibold">{l.title}</Link>
                  <span className="text-xs text-muted">{formatMoney(l.price, l.currency, locale)} · {t("views", { n: l.views })}</span>
                  {l.status === "REJECTED" && l.staffNote && <span className="block text-xs text-danger">{l.staffNote}</span>}
                </div>
                <span className="flex flex-col items-end gap-1">
                  {badge(l.status)}
                  {["PENDING", "ACTIVE", "REJECTED"].includes(l.status) && <MarketAction kind="remove" id={l.id} />}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
