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
import { listingDetails, listingImages, sellerStats } from "@/lib/market-data";
import { BuyButton, ReportButton, ShareButton, ViewCounter } from "@/components/market/MarketClient";
import { WhatsAppIcon } from "@/components/Icons";

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
  const l = await prisma.marketListing.findUnique({ where: { id }, include: { seller: { select: { name: true, emailVerified: true, createdAt: true } } } });
  if (!l) notFound();
  const mine = user?.id === l.sellerId;
  if (!PUBLIC.includes(l.status) && !mine) notFound();
  const rulesAt = user ? (await prisma.user.findUnique({ where: { id: user.id }, select: { marketRulesAt: true } }))?.marketRulesAt : null;
  const stats = (await sellerStats([l.sellerId])).get(l.sellerId);
  const images = listingImages(l.images);
  const p = platformOf(l.platform);
  const pLabel = p.key === "other" ? t("otherPlatform") : p.label;
  const url = `${siteUrl()}/${locale}/market/${l.id}`;
  const agent = (settings.marketWhatsapp || settings.whatsappNumber).replace(/\D/g, "");
  const ask = `https://wa.me/${agent}?text=${encodeURIComponent(t("askText", { title: `${pLabel} · ${l.title}`, url }))}`;
  const statusLabel = { ACTIVE: t("statusActive"), RESERVED: t("reserved"), SOLD: t("sold"), PENDING: t("statusPending"), REJECTED: t("statusRejected"), REMOVED: t("statusRemoved") }[l.status];
  const rows: [string, string][] = [
    [t("platform"), `${p.icon} ${pLabel}`],
    ...listingDetails(l.details).map((d) => [d.label, d.value] as [string, string]),
    [t("withEmailShort"), l.withEmail ? t("yes") : t("no")],
    [t("visits"), String(l.views)],
    [t("status"), statusLabel],
    [t("posted"), fmt.dateTime(l.createdAt, { dateStyle: "medium" })],
  ];

  return (
    <div className="container-page py-6 sm:py-10">
      <ViewCounter id={l.id} />
      <nav className="mb-4 text-sm text-muted"><Link href="/market" className="hover:text-text">← {t("title")}</Link></nav>
      {mine && l.status !== "ACTIVE" && <p className="mb-4 rounded-xl bg-surface-2 px-4 py-3 text-sm">{t("ownPreview", { status: statusLabel })}</p>}
      {/* Phones: photos, then price + Buy, then details. Wide screens: Buy box stays on the right. */}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="order-1 lg:order-none lg:col-start-1">
          <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt={`${l.title} ${i + 1}`} className="aspect-video w-[88%] shrink-0 snap-center rounded-2xl bg-surface-2 object-cover sm:w-full" />
            ))}
          </div>
        </div>
        <div className="order-3 space-y-4 lg:order-none lg:col-start-1">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold">{t("details")}</h2>
            <dl className="divide-y divide-border text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
              ))}
            </dl>
          </section>
          {l.description && (
            <section className="card p-5">
              <h2 className="mb-2 font-semibold">{t("sellerNotes")}</h2>
              <p className="whitespace-pre-wrap text-sm">{l.description}</p>
            </section>
          )}
        </div>
        <aside className="order-2 space-y-4 lg:order-none lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-fit">
          <section className="card space-y-4 p-5">
            <p className="text-sm font-semibold text-primary">{p.icon} {pLabel}</p>
            <h1 className="text-2xl font-extrabold tracking-tight">{l.title}</h1>
            <p className="text-3xl font-extrabold">{formatMoney(l.price, l.currency, locale)}</p>
            <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3 text-sm">
              <span className="grid size-10 place-items-center rounded-full bg-primary text-white font-bold">{shortName(l.seller.name).slice(0, 1)}</span>
              <span>
                <b className="block">{shortName(l.seller.name)} {l.seller.emailVerified && <span className="text-xs font-semibold text-primary">✓ {t("verified")}</span>}</b>
                <span className="text-muted">{t("sellerStats", { sold: stats?.sold ?? 0 })}{stats?.rating ? ` · ★ ${stats.rating.toFixed(1)} (${stats.ratings})` : ""}</span>
              </span>
            </div>
            {!mine && (
              <BuyButton
                listingId={l.id}
                locale={locale}
                signedIn={!!user}
                rulesAccepted={!!rulesAt}
                disabledLabel={l.status === "SOLD" ? t("sold") : l.status === "RESERVED" ? t("reservedLong") : undefined}
              />
            )}
            <div className="grid grid-cols-2 gap-2">
              <a href={ask} target="_blank" rel="noopener" className="btn-secondary min-h-11"><WhatsAppIcon width={16} height={16} className="text-[#1fa855]" /> {t("ask")}</a>
              <ShareButton url={url} text={`${pLabel} · ${l.title} · ${formatMoney(l.price, l.currency, locale)}`} />
            </div>
            <div className="text-center"><ReportButton listingId={l.id} signedIn={!!user && !mine} /></div>
          </section>
          <section className="card p-5 text-sm">
            <h2 className="mb-3 font-semibold">{t("howTitle")}</h2>
            <ol className="space-y-2">
              {(["how1", "how2", "how3", "how4"] as const).map((k, i) => (
                <li key={k} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">{i + 1}</span><span>{t(k)}</span></li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
