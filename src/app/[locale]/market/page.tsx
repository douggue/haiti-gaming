import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { pageSeo } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import { formatMoney } from "@/lib/money";
import { shortName } from "@/lib/trust";
import { isPlatform, platformOf } from "@/lib/market";
import { listingDetails, listingImages, sellerStats } from "@/lib/market-data";
import { RulesLink } from "@/components/market/MarketClient";
import { MarketBrowser } from "@/components/market/MarketBrowser";

type SP = Promise<{ p?: string; q?: string }>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "market" });
  return pageSeo(locale, "/market", t("title"), t("subtitle"));
}

export default async function MarketPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await getSettings();
  if (!settings.marketEnabled) notFound();
  const sp = await searchParams;
  const platform = isPlatform(sp.p) ? sp.p : undefined;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const t = await getTranslations("market");
  const listings = await prisma.marketListing.findMany({
    // Everything on sale is sent once; MarketBrowser filters it in the browser (no page reload per game).
    where: { status: { in: ["ACTIVE", "RESERVED"] } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 300,
    include: { seller: { select: { name: true, marketVendor: { select: { shopName: true, status: true } } } } },
  });
  const stats = await sellerStats(listings.map((l) => l.sellerId));
  const base = siteUrl();

  return (
    <div className="container-page space-y-6 py-6 sm:py-10">
      <section className="card overflow-hidden p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">{t("eyebrow")}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{t("title")}</h1>
            <p className="mt-2 text-muted">{t("subtitle")}</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <Link href="/market/sell" className="btn-primary min-h-12">＋ {t("sell")}</Link>
            <RulesLink />
          </div>
        </div>
        <ul className="mt-5 grid gap-2 sm:grid-cols-3">
          {(["trustEscrow", "trustChecked", "trustSupport"] as const).map((k, i) => (
            <li key={k} className="flex items-start gap-2 rounded-2xl bg-surface-2 p-3 text-sm">
              <span aria-hidden className="text-lg">{["🔒", "✅", "💬"][i]}</span>
              <span><b className="block">{t(k)}</b><span className="text-muted">{t(`${k}Hint`)}</span></span>
            </li>
          ))}
        </ul>
      </section>

      <MarketBrowser
        initialPlatform={platform}
        initialQuery={q}
        items={listings.map((l) => {
          const p = platformOf(l.platform);
          const price = formatMoney(l.price, l.currency, locale);
          return {
            id: l.id,
            title: l.title,
            platform: l.platform,
            image: listingImages(l.images)[0] ?? null,
            reserved: l.status === "RESERVED",
            details: listingDetails(l.details).slice(0, 3),
            seller: l.seller.marketVendor?.shopName ?? shortName(l.seller.name),
            verified: l.seller.marketVendor?.status === "APPROVED",
            rating: stats.get(l.sellerId)?.rating ?? null,
            views: l.views,
            price,
            shareUrl: `${base}/${locale}/market/${l.id}`,
            shareText: `${p.label} · ${l.title} · ${price}`,
          };
        })}
      />
    </div>
  );
}
