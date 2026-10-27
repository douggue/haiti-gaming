import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getUser } from "@/lib/session";
import { pageSeo } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import { formatMoney } from "@/lib/money";
import { shortName } from "@/lib/trust";
import { isPlatform, platformOf } from "@/lib/market";
import { listingDetails, listingImages, sellerStats } from "@/lib/market-data";
import { RulesLink } from "@/components/market/MarketClient";
import { MarketBrowser } from "@/components/market/MarketBrowser";
import { PlatformIcon, TrustIcon } from "@/components/market/PlatformIcon";

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
  const viewer = await getUser();
  const myPending = viewer ? await prisma.marketListing.count({ where: { sellerId: viewer.id, status: "PENDING" } }) : 0;
  const [soldCount, vendorCount] = await Promise.all([
    prisma.marketListing.count({ where: { status: "SOLD" } }),
    prisma.marketVendor.count({ where: { status: "APPROVED" } }),
  ]);
  const base = siteUrl();

  return (
    <div className="container-page space-y-6 py-6 sm:py-10">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b1640] via-[#1d2a8a] to-[#6d28d9] p-5 text-white shadow-xl sm:p-8">
        {/* Decoration: blurred glows and floating game icons */}
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-fuchsia-500/40 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-sky-400/30 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute right-4 top-4 hidden select-none gap-3 sm:flex">
          <span className="animate-bounce [animation-duration:2.4s]"><PlatformIcon platform="freefire" size={52} className="rotate-[-8deg] drop-shadow-xl" /></span>
          <span className="animate-bounce [animation-delay:300ms] [animation-duration:2.8s]"><PlatformIcon platform="efootball" size={52} className="drop-shadow-xl" /></span>
          <span className="animate-bounce [animation-delay:600ms] [animation-duration:2.6s]"><PlatformIcon platform="tiktok" size={52} className="rotate-[8deg] drop-shadow-xl" /></span>
        </span>
        <div className="relative max-w-xl">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> {t("eyebrow")}
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            {t("heroTitle1")} <span className="bg-gradient-to-r from-amber-300 to-pink-400 bg-clip-text text-transparent">{t("heroTitle2")}</span>
          </h1>
          <p className="mt-2 text-sm text-white/85 sm:text-base">{t("subtitle")}</p>
          <div className="mt-4 flex gap-2 sm:hidden" aria-hidden>
            {["freefire", "pubg", "efootball", "tiktok", "instagram", "youtube"].map((k, i) => (
              <PlatformIcon key={k} platform={k} size={38} className={`drop-shadow-lg ${i % 2 ? "rotate-[6deg]" : "-rotate-[6deg]"}`} />
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href="#listings" className="btn-primary min-h-12 !bg-white px-5 !text-[#1d2a8a] shadow-lg">🛒 {t("browseCta")}</a>
            <Link href="/market/sell" className="btn-primary min-h-12 !bg-amber-400 px-5 !text-black shadow-lg">＋ {t("sell")}</Link>
          </div>
          <div className="mt-3"><span className="[&_button]:text-white/90 [&_button]:underline"><RulesLink /></span></div>
        </div>
        <dl className="relative mt-6 grid grid-cols-3 gap-2 text-center">
          {[
            [listings.length, t("statOnSale")],
            [soldCount, t("statSold")],
            [vendorCount, t("statVendors")],
          ].map(([n, label]) => (
            <div key={String(label)} className="rounded-2xl bg-white/10 px-2 py-3 backdrop-blur">
              <dt className="text-[11px] text-white/75">{label}</dt>
              <dd className="text-2xl font-black">{n}</dd>
            </div>
          ))}
        </dl>
      </section>

      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:grid sm:grid-cols-3">
        {(["trustEscrow", "trustChecked", "trustSupport"] as const).map((k, i) => (
          <li key={k} className="flex min-w-[15rem] items-start gap-3 rounded-2xl border border-border bg-surface p-3 text-sm sm:min-w-0">
            <span className="shrink-0 drop-shadow"><TrustIcon kind={(["escrow", "checked", "support"] as const)[i]} size={42} /></span>
            <span><b className="block">{t(k)}</b><span className="text-xs text-muted">{t(`${k}Hint`)}</span></span>
          </li>
        ))}
      </ul>

      {myPending > 0 && (
        <Link href="/account/market?tab=listings" className="flex items-center gap-3 rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 text-sm">
          <span className="text-2xl" aria-hidden>⏳</span>
          <span><b className="block">{t("pendingMine", { n: myPending })}</b><span className="text-muted">{t("reviewHint")}</span></span>
        </Link>
      )}
      <MarketBrowser
        soldCount={soldCount}
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
