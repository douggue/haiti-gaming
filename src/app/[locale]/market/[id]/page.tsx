import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { contentSeo } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import { formatMoney } from "@/lib/money";
import { shortName } from "@/lib/trust";
import { platformOf } from "@/lib/market";
import { rulesAccepted } from "@/lib/market-rules";
import { listingDetails, listingImages, sellerStats } from "@/lib/market-data";
import { BuyButton, ChatButton, HideHelpButton, ReportButton, ShareButton, ViewCounter } from "@/components/market/MarketClient";
import { WhatsAppIcon } from "@/components/Icons";
import { PlatformIcon, TrustIcon } from "@/components/market/PlatformIcon";
import { ListingGallery } from "@/components/market/ListingGallery";

type P = Promise<{ locale: string; id: string }>;
const PUBLIC = ["ACTIVE", "RESERVED", "SOLD"];

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { locale, id } = await params;
  const l = await prisma.marketListing.findUnique({ where: { id }, select: { title: true, description: true, images: true, status: true, platform: true, price: true, currency: true } });
  if (!l || !PUBLIC.includes(l.status)) return { robots: { index: false } };
  return contentSeo(locale, `/market/${id}`, {
    title: `${platformOf(l.platform).label} · ${l.title}`,
    description: `${formatMoney(l.price, l.currency, locale)} — ${l.description.slice(0, 140)}`,
    image: listingImages(l.images)[0] ?? null,
  });
}

export default async function ListingPage({ params }: { params: P }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const settings = await getSettings();
  if (!settings.marketEnabled) notFound();
  const [user, t, fmt] = await Promise.all([getUser(), getTranslations("market"), getFormatter()]);
  const l = await prisma.marketListing.findUnique({ where: { id }, include: { seller: { select: { name: true, createdAt: true, marketVendor: { select: { shopName: true, status: true } } } } } });
  if (!l) notFound();
  const mine = user?.id === l.sellerId;
  if (!PUBLIC.includes(l.status) && !mine) notFound();
  const rulesRow = user ? (await prisma.user.findUnique({ where: { id: user.id }, select: { marketRulesAt: true } }))?.marketRulesAt : null;
  const rulesAt = rulesAccepted(rulesRow, settings);
  const stats = (await sellerStats([l.sellerId])).get(l.sellerId);
  const images = listingImages(l.images);
  const p = platformOf(l.platform);
  const pLabel = p.key === "other" ? t("otherPlatform") : p.label;
  const url = `${siteUrl()}/${locale}/market/${l.id}`;
  const agent = (settings.marketWhatsapp || settings.whatsappNumber).replace(/\D/g, "");
  const ask = `https://wa.me/${agent}?text=${encodeURIComponent(t("askText", { title: `${pLabel} · ${l.title}`, url }))}`;
  const statusLabel = { ACTIVE: t("statusActive"), RESERVED: t("reserved"), SOLD: t("sold"), PENDING: t("statusPending"), REJECTED: t("statusRejected"), REMOVED: t("statusRemoved") }[l.status];
  const details = listingDetails(l.details);
  // The first details become big tiles; the rest go in the list below
  const tiles = details.slice(0, 4);
  const rest: [string, React.ReactNode][] = [
    ...details.slice(4).map((d) => [d.label, d.value] as [string, React.ReactNode]),
    [t("withEmailShort"), l.withEmail ? `✅ ${t("yes")}` : t("no")],
    [t("posted"), fmt.dateTime(l.createdAt, { dateStyle: "medium" })],
  ];
  const sellerName = l.seller.marketVendor?.shopName ?? shortName(l.seller.name);
  const verified = l.seller.marketVendor?.status === "APPROVED";
  const price = formatMoney(l.price, l.currency, locale);
  const similar = await prisma.marketListing.findMany({
    where: { platform: l.platform, status: "ACTIVE", id: { not: l.id } },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: { id: true, title: true, images: true, price: true, currency: true, platform: true },
  });
  const buy = !mine && (
    <BuyButton
      listingId={l.id}
      locale={locale}
      signedIn={!!user}
      rulesAccepted={!!rulesAt}
      disabledLabel={l.status === "SOLD" ? t("sold") : l.status === "RESERVED" ? t("reservedLong") : undefined}
    />
  );

  return (
    <div className="container-page pb-40 pt-4 sm:py-10 lg:pb-10">
      <ViewCounter id={l.id} />
      {mine && l.status !== "ACTIVE" && <p className="mb-4 rounded-2xl bg-sky-500/10 px-4 py-3 text-sm">⏳ {t("ownPreview", { status: statusLabel })}</p>}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="min-w-0 space-y-5">
          <ListingGallery images={images} title={l.title} platform={p.key} color={p.color}>
            <Link href="/market" className="absolute left-3 top-3 grid size-10 place-items-center rounded-full bg-black/55 text-lg text-white backdrop-blur" aria-label={t("title")}>←</Link>
            <span className="absolute bottom-10 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 py-1 pl-1 pr-3 text-xs font-bold text-white backdrop-blur"><PlatformIcon platform={p.key} size={22} /> {pLabel}</span>
            {l.status !== "ACTIVE" && (
              <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-6 rounded-xl border-4 px-5 py-2 text-2xl font-black uppercase tracking-wider shadow-2xl ${l.status === "SOLD" ? "border-emerald-400 bg-emerald-500/85 text-white" : "border-amber-300 bg-amber-400/90 text-black"}`}>
                {statusLabel}
              </span>
            )}
          </ListingGallery>

          {/* Title and price (phones: right under the photos) */}
          <section className="space-y-3 lg:hidden">
            <h1 className="text-2xl font-black leading-tight tracking-tight">{l.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-gradient-to-r from-amber-400 to-pink-500 bg-clip-text text-3xl font-black text-transparent">{price}</span>
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">👁 {t("views", { n: l.views })}</span>
            </div>
          </section>

          {tiles.length > 0 && (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {tiles.map((d, i) => (
                <li key={d.label} className={`rounded-2xl border border-border bg-gradient-to-br p-3 ${["from-sky-500/15", "from-fuchsia-500/15", "from-amber-500/15", "from-emerald-500/15"][i]} to-transparent`}>
                  <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted">{d.label}</p>
                  <p className="mt-0.5 truncate text-xl font-black">{d.value}</p>
                </li>
              ))}
            </ul>
          )}

          {l.description && (
            <section className="relative rounded-3xl border border-border bg-surface p-5">
              <span aria-hidden className="absolute -top-3 left-5 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-white">💬 {t("sellerNotes")}</span>
              <p className="whitespace-pre-wrap pt-1 text-sm leading-relaxed">{l.description}</p>
            </section>
          )}

          <section className="rounded-3xl border border-border bg-surface p-5">
            <h2 className="mb-2 font-bold">{t("details")}</h2>
            <dl className="divide-y divide-border text-sm">
              {rest.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
              ))}
            </dl>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          {/* Wide screens: title, price and Buy here */}
          <section className="hidden space-y-4 rounded-3xl border border-border bg-surface p-5 lg:block">
            <h1 className="text-2xl font-black leading-tight tracking-tight">{l.title}</h1>
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-amber-400 to-pink-500 bg-clip-text text-4xl font-black text-transparent">{price}</span>
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">👁 {t("views", { n: l.views })}</span>
            </div>
            {buy}
          </section>

          {/* Seller */}
          <section className="rounded-3xl border border-border bg-surface p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-xl font-black text-white shadow-lg">{sellerName.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{sellerName}</p>
                {verified && <p className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">✓ {t("verified")}</p>}
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-surface-2 p-2"><dt className="text-[10px] text-muted">{t("statSold")}</dt><dd className="font-black">{stats?.sold ?? 0}</dd></div>
              <div className="rounded-xl bg-surface-2 p-2"><dt className="text-[10px] text-muted">★</dt><dd className="font-black text-amber-500">{stats?.rating ? stats.rating.toFixed(1) : "—"}</dd></div>
              <div className="rounded-xl bg-surface-2 p-2"><dt className="text-[10px] text-muted">{t("memberSince")}</dt><dd className="text-xs font-black">{fmt.dateTime(l.seller.createdAt, { month: "short", year: "numeric" })}</dd></div>
            </dl>
            <div className="mt-4 grid gap-2">
              {!mine && ["ACTIVE", "RESERVED"].includes(l.status) && <ChatButton listingId={l.id} signedIn={!!user} />}
              <div className="grid grid-cols-2 gap-2">
                <a href={ask} target="_blank" rel="noopener" className="btn-secondary min-h-11 text-sm"><WhatsAppIcon width={16} height={16} className="text-[#1fa855]" /> {t("ask")}</a>
                <ShareButton url={url} text={`${pLabel} · ${l.title} · ${price}`} />
              </div>
            </div>
          </section>

          {/* Protection */}
          <section className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent p-5">
            <h2 className="mb-3 flex items-center gap-2 font-bold"><TrustIcon kind="escrow" size={32} /> {t("howTitle")}</h2>
            <ol className="relative space-y-3 border-l-2 border-dashed border-emerald-500/40 pl-5 text-sm">
              {(["how1", "how2", "how3", "how4"] as const).map((k, i) => (
                <li key={k} className="relative">
                  <span className="absolute -left-[1.95rem] grid size-6 place-items-center rounded-full bg-emerald-500 text-xs font-black text-white">{i + 1}</span>
                  {t(k)}
                </li>
              ))}
            </ol>
          </section>
          <div className="text-center"><ReportButton listingId={l.id} signedIn={!!user && !mine} /></div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black"><PlatformIcon platform={p.key} size={28} /> {t("similar", { game: pLabel })}</h2>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {similar.map((x) => {
              const img = listingImages(x.images)[0];
              return (
                <li key={x.id}>
                  <Link href={`/market/${x.id}`} className={`group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br ${p.color}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {img ? <img src={img} alt="" loading="lazy" className="size-full object-cover transition-transform group-hover:scale-105" /> : <span className="grid size-full place-items-center"><PlatformIcon platform={x.platform} size={56} /></span>}
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 pt-8 text-white">
                      <span className="line-clamp-1 text-xs font-bold">{x.title}</span>
                      <span className="text-sm font-black text-amber-300">{formatMoney(x.price, x.currency, locale)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Phones: price and Buy always at hand, above the bottom menu */}
      {!mine && <HideHelpButton />}
      {!mine && (
        <div className="fixed inset-x-0 z-30 border-t border-border bg-surface/95 px-4 py-2.5 shadow-[0_-8px_30px_-12px_rgba(0,0,0,.4)] backdrop-blur lg:hidden" style={{ bottom: "calc(4.1rem + env(safe-area-inset-bottom, 0px))" }} data-testid="buy-bar">
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <p className="text-[10px] font-semibold uppercase text-muted">{pLabel}</p>
              <p className="text-lg font-black leading-tight">{price}</p>
            </div>
            <div className="min-w-0 flex-1 [&_button]:min-h-11 [&_a]:min-h-11">{buy}</div>
          </div>
        </div>
      )}
    </div>
  );
}
