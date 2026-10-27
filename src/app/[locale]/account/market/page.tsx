import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { commissionOf } from "@/lib/market";
import { listingImages } from "@/lib/market-data";
import { MarketAction, RateSeller } from "@/components/market/MarketClient";
import { WhatsAppIcon } from "@/components/Icons";
import { PlatformIcon } from "@/components/market/PlatformIcon";

const TONE: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  COMPLETED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  SOLD: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  PENDING: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  REQUESTED: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  RESERVED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  PAID: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
  DELIVERED: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  REJECTED: "bg-danger-soft text-danger",
  DISPUTED: "bg-danger-soft text-danger",
  CANCELED: "bg-surface-2 text-muted",
  REMOVED: "bg-surface-2 text-muted",
};
const STEPS = ["REQUESTED", "PAID", "DELIVERED", "COMPLETED"] as const;
type Tab = "purchases" | "sales" | "listings";

export default async function MyMarket({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ posted?: string; tab?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const sp = await searchParams;
  const [t, fmt, settings] = await Promise.all([getTranslations("market"), getFormatter(), getSettings()]);
  const listingSel = { select: { id: true, title: true, platform: true, images: true } } as const;
  const [listings, purchases, sales, vendor] = await Promise.all([
    prisma.marketListing.findMany({ where: { sellerId: user.id, status: { not: "REMOVED" } }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, title: true, platform: true, images: true, price: true, currency: true, views: true, status: true, staffNote: true } }),
    prisma.marketDeal.findMany({ where: { buyerId: user.id }, orderBy: { createdAt: "desc" }, take: 50, include: { listing: listingSel } }),
    prisma.marketDeal.findMany({ where: { sellerId: user.id }, orderBy: { createdAt: "desc" }, take: 50, include: { listing: listingSel } }),
    prisma.marketVendor.findUnique({ where: { userId: user.id }, select: { shopName: true, status: true } }),
  ]);
  const st = (s: string) => (t.has(`s_${s}`) ? t(`s_${s}` as "s_ACTIVE") : s);
  const badge = (s: string) => <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${TONE[s] ?? ""}`}>{st(s)}</span>;
  const agent = (settings.marketWhatsapp || settings.whatsappNumber).replace(/\D/g, "");
  const wa = (n: number) => `https://wa.me/${agent}?text=${encodeURIComponent(t("dealText", { number: n }))}`;
  const cut = (d: { commission: number | null; price: number }) => d.commission ?? commissionOf(d.price, settings.marketCommissionBps);

  // Numbers for the header
  const activeListings = listings.filter((l) => ["ACTIVE", "RESERVED"].includes(l.status)).length;
  const done = sales.filter((d) => d.status === "COMPLETED");
  const earnedHtg = done.filter((d) => d.currency === "HTG").reduce((a, d) => a + d.price - cut(d), 0);
  const earnedUsd = done.filter((d) => d.currency === "USD").reduce((a, d) => a + d.price - cut(d), 0);

  const tabs: [Tab, string, number][] = [
    ["purchases", t("myPurchases"), purchases.length],
    ["sales", t("mySales"), sales.length],
    ["listings", t("myListings"), listings.length],
  ];
  const fallback: Tab = sp.posted ? "listings" : purchases.length || (!sales.length && !listings.length) ? "purchases" : sales.length ? "sales" : "listings";
  const tab: Tab = (["purchases", "sales", "listings"] as const).includes(sp.tab as Tab) ? (sp.tab as Tab) : fallback;

  const thumb = (l: { images: unknown; platform: string }) => {
    const img = listingImages(l.images)[0];
    return (
      <span className="relative size-16 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img ? <img src={img} alt="" className="size-16 rounded-2xl object-cover" /> : <PlatformIcon platform={l.platform} size={64} />}
        {img && <span className="absolute -bottom-1 -right-1"><PlatformIcon platform={l.platform} size={22} /></span>}
      </span>
    );
  };
  const stepper = (status: string) => {
    const at = STEPS.indexOf(status as (typeof STEPS)[number]);
    if (at < 0) return null;
    return (
      <ol className="flex items-center gap-1" aria-label={st(status)}>
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col items-center gap-1">
            <span className={`h-1.5 w-full rounded-full ${i <= at ? "bg-gradient-to-r from-primary to-fuchsia-500" : "bg-surface-2"}`} />
            <span className={`text-[10px] ${i <= at ? "font-bold text-text" : "text-muted"}`}>{st(s)}</span>
          </li>
        ))}
      </ol>
    );
  };
  const empty = (text: string, cta: React.ReactNode) => (
    <div className="card p-10 text-center">
      <p className="text-4xl" aria-hidden>🕹️</p>
      <p className="mt-2 text-sm text-muted">{text}</p>
      <div className="mt-4">{cta}</div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header: who I am on the Market, and my numbers */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b1640] via-[#1d2a8a] to-[#6d28d9] p-5 text-white shadow-lg">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-fuchsia-500/40 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/70">{t("myTitle")}</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">{vendor?.shopName ?? user.name}</h1>
            {vendor?.status === "APPROVED" ? (
              <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-bold text-emerald-200">✓ {t("verified")}</p>
            ) : vendor?.status === "PENDING" ? (
              <p className="mt-1 inline-flex rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-bold text-amber-200">⏳ {t("vendorPendingTitle")}</p>
            ) : null}
          </div>
          <span className="flex gap-2">
            <Link href="/market" className="btn-secondary min-h-10 !border-white/30 !bg-white/10 px-3 text-sm !text-white">{t("browse")}</Link>
            <Link href="/market/sell" className="btn-primary min-h-10 !bg-amber-400 px-3 text-sm !text-black">＋ {t("sell")}</Link>
          </span>
        </div>
        <dl className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            [t("statActive"), activeListings],
            [t("statSales"), done.length],
            [t("statEarned"), earnedUsd ? `${formatMoney(earnedHtg, "HTG", locale)} + ${formatMoney(earnedUsd, "USD", locale)}` : formatMoney(earnedHtg, "HTG", locale)],
            [t("statPurchases"), purchases.length],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur">
              <dt className="text-[11px] text-white/70">{label}</dt>
              <dd className="truncate text-lg font-black">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {sp.posted && <p className="rounded-2xl bg-success-soft px-4 py-3 text-sm font-medium text-success" role="status">✓ {t("posted_ok")}</p>}

      <nav className="flex gap-1 rounded-2xl border border-border bg-surface p-1" aria-label={t("myTitle")}>
        {tabs.map(([k, label, n]) => (
          <Link key={k} href={`/account/market?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={`flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-1.5 py-2.5 text-xs font-bold sm:gap-1.5 sm:text-sm transition-colors ${tab === k ? "bg-primary text-white shadow" : "text-muted hover:text-text"}`}>
            {label}
            <span className={`rounded-full px-1.5 text-[11px] ${tab === k ? "bg-white/25" : "bg-surface-2"}`}>{n}</span>
          </Link>
        ))}
      </nav>

      {tab === "purchases" &&
        (purchases.length === 0 ? empty(t("noPurchases"), <Link href="/market" className="btn-primary">{t("browse")}</Link>) : (
          <ul className="space-y-3">
            {purchases.map((d) => (
              <li key={d.id} className="card space-y-3 p-4">
                <div className="flex items-start gap-3">
                  {thumb(d.listing)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/market/${d.listing.id}`} className="line-clamp-2 font-bold">{d.listing.title}</Link>
                      {badge(d.status)}
                    </div>
                    <p className="text-xs text-muted">#{d.number} · {fmt.dateTime(d.createdAt, { dateStyle: "medium" })}</p>
                    <p className="mt-0.5 text-lg font-black">{formatMoney(d.price, d.currency, locale)}</p>
                  </div>
                </div>
                {stepper(d.status)}
                <p className="rounded-xl bg-surface-2 px-3 py-2 text-xs">{t(`buyerStep_${d.status}` as "buyerStep_REQUESTED")}</p>
                <div className="flex flex-wrap gap-2">
                  {!["COMPLETED", "CANCELED"].includes(d.status) && <a href={wa(d.number)} target="_blank" rel="noopener" className="btn-secondary min-h-9 px-3 text-xs"><WhatsAppIcon width={14} height={14} className="text-[#1fa855]" /> {t("agent")}</a>}
                  {d.status === "REQUESTED" && <MarketAction kind="cancel" id={d.id} />}
                  {d.status === "DELIVERED" && <MarketAction kind="confirm" id={d.id} />}
                </div>
                {d.status === "COMPLETED" && (d.rating ? <p className="text-sm"><span className="text-amber-400">{"★".repeat(d.rating)}</span><span className="text-border">{"★".repeat(5 - d.rating)}</span> {d.ratingNote}</p> : <RateSeller dealId={d.id} />)}
              </li>
            ))}
          </ul>
        ))}

      {tab === "sales" &&
        (sales.length === 0 ? empty(t("noSales"), <Link href="/market/sell" className="btn-primary">＋ {t("sell")}</Link>) : (
          <ul className="space-y-3">
            {sales.map((d) => {
              const c = cut(d);
              const net = formatMoney(d.price - c, d.currency, locale);
              return (
                <li key={d.id} className="card space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    {thumb(d.listing)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 font-bold">{d.listing.title} <span className="font-normal text-muted">#{d.number}</span></p>
                        {badge(d.status)}
                      </div>
                      <p className="text-xs text-muted">{fmt.dateTime(d.createdAt, { dateStyle: "medium" })}</p>
                    </div>
                  </div>
                  {d.status !== "CANCELED" && (
                    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-surface-2 p-3 text-center">
                      <div><p className="text-[11px] text-muted">{t("priceLabel")}</p><p className="font-bold">{formatMoney(d.price, d.currency, locale)}</p></div>
                      <div><p className="text-[11px] text-muted">{t("commission")}</p><p className="font-bold text-danger">−{formatMoney(c, d.currency, locale)}</p></div>
                      <div><p className="text-[11px] text-muted">{d.status === "COMPLETED" ? t("youReceived") : t("youWillReceive")}</p><p className="font-black text-success">{net}</p></div>
                    </div>
                  )}
                  {stepper(d.status)}
                  <p className="rounded-xl bg-surface-2 px-3 py-2 text-xs">{t(`sellerStep_${d.status}` as "sellerStep_REQUESTED")}</p>
                  {!["COMPLETED", "CANCELED"].includes(d.status) && <a href={wa(d.number)} target="_blank" rel="noopener" className="btn-secondary min-h-9 px-3 text-xs"><WhatsAppIcon width={14} height={14} className="text-[#1fa855]" /> {t("agent")}</a>}
                </li>
              );
            })}
          </ul>
        ))}

      {tab === "listings" &&
        (listings.length === 0 ? empty(t("noListings"), <Link href="/market/sell" className="btn-primary">＋ {t("sell")}</Link>) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {listings.map((l) => (
              <li key={l.id} className="card flex gap-3 p-3">
                {thumb(l)}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/market/${l.id}`} className="line-clamp-2 text-sm font-bold">{l.title}</Link>
                    {badge(l.status)}
                  </div>
                  <p className="font-black">{formatMoney(l.price, l.currency, locale)}</p>
                  <p className="text-[11px] text-muted">👁 {t("views", { n: l.views })}</p>
                  {l.status === "REJECTED" && l.staffNote && <p className="rounded-lg bg-danger-soft px-2 py-1 text-xs text-danger">{l.staffNote}</p>}
                  {l.status === "PENDING" && <p className="text-xs text-sky-600 dark:text-sky-400">⏳ {t("reviewHint")}</p>}
                  {["PENDING", "ACTIVE", "REJECTED"].includes(l.status) && <MarketAction kind="remove" id={l.id} />}
                </div>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
