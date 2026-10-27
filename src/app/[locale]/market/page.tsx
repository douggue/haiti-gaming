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
import { PLATFORMS, isPlatform, platformOf } from "@/lib/market";
import { listingDetails, listingImages, sellerStats } from "@/lib/market-data";
import { RulesLink, ShareButton } from "@/components/market/MarketClient";

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
    where: { status: { in: ["ACTIVE", "RESERVED"] }, ...(platform ? { platform } : {}), ...(q ? { title: { contains: q, mode: "insensitive" } } : {}) },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 60,
    include: { seller: { select: { name: true, emailVerified: true } } },
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

      <form className="flex gap-2" action="">
        {platform && <input type="hidden" name="p" value={platform} />}
        <input name="q" defaultValue={q} placeholder={t("search")} className="input" aria-label={t("search")} />
        <button className="btn-secondary">{t("searchBtn")}</button>
      </form>
      <nav aria-label={t("platform")} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href={q ? `/market?q=${encodeURIComponent(q)}` : "/market"} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium ${!platform ? "border-primary bg-primary text-white" : "border-border"}`}>{t("all")}</Link>
        {PLATFORMS.map((p) => (
          <Link key={p.key} href={`/market?p=${p.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium ${platform === p.key ? "border-primary bg-primary text-white" : "border-border"}`}>
            {p.icon} {p.key === "other" ? t("otherPlatform") : p.label}
          </Link>
        ))}
      </nav>

      {listings.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-muted">{t("empty")}</p>
          <Link href="/market/sell" className="btn-primary mt-4">{t("sellFirst")}</Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => {
            const img = listingImages(l.images)[0];
            const p = platformOf(l.platform);
            const s = stats.get(l.sellerId);
            const details = listingDetails(l.details).slice(0, 3);
            return (
              <li key={l.id} className="card flex flex-col overflow-hidden" data-testid="market-card">
                <Link href={`/market/${l.id}`} className="relative block aspect-video bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {img && <img src={img} alt="" loading="lazy" className="size-full object-cover" />}
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">{p.icon} {p.key === "other" ? t("otherPlatform") : p.label}</span>
                  {l.status === "RESERVED" && <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-black">{t("reserved")}</span>}
                </Link>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <Link href={`/market/${l.id}`} className="line-clamp-2 font-semibold">{l.title}</Link>
                  {details.length > 0 && (
                    <p className="flex flex-wrap gap-1.5 text-xs">
                      {details.map((d) => <span key={d.label} className="rounded-md bg-surface-2 px-2 py-0.5"><span className="text-muted">{d.label}:</span> {d.value}</span>)}
                    </p>
                  )}
                  <p className="text-xs text-muted">
                    {shortName(l.seller.name)}{l.seller.emailVerified && <span className="text-primary" title={t("verified")}> ✓</span>}
                    {s?.rating ? ` · ★ ${s.rating.toFixed(1)}` : ""} · {t("views", { n: l.views })}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <b className="text-lg">{formatMoney(l.price, l.currency, locale)}</b>
                    <span className="flex gap-1.5">
                      <ShareButton compact url={`${base}/${locale}/market/${l.id}`} text={`${p.label} · ${l.title} · ${formatMoney(l.price, l.currency, locale)}`} />
                      <Link href={`/market/${l.id}`} className="btn-primary min-h-9 px-3 text-xs">{t("inspect")}</Link>
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
