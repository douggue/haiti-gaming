"use client";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PLATFORMS } from "@/lib/market";
import { ShareButton } from "./MarketClient";

export type MarketItem = {
  id: string;
  title: string;
  platform: string;
  image: string | null;
  reserved: boolean;
  details: { label: string; value: string }[];
  seller: string;
  verified: boolean;
  rating: number | null;
  views: number;
  price: string;
  shareUrl: string;
  shareText: string;
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Listings filtered in the browser: tapping a game or typing a search changes the list at once, without
 * reloading the page. The address (?p=freefire&q=…) follows along so the view can be shared or reopened.
 */
export function MarketBrowser({ items, initialPlatform, initialQuery }: { items: MarketItem[]; initialPlatform?: string; initialQuery?: string }) {
  const t = useTranslations("market");
  const [platform, setPlatform] = useState(initialPlatform ?? "");
  const [q, setQ] = useState(initialQuery ?? "");

  useEffect(() => {
    const url = new URL(window.location.href);
    if (platform) url.searchParams.set("p", platform);
    else url.searchParams.delete("p");
    if (q.trim()) url.searchParams.set("q", q.trim());
    else url.searchParams.delete("q");
    window.history.replaceState(window.history.state, "", url);
  }, [platform, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of items) c[i.platform] = (c[i.platform] ?? 0) + 1;
    return c;
  }, [items]);

  const shown = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    return items.filter((i) => {
      if (platform && i.platform !== platform) return false;
      if (!words.length) return true;
      const hay = norm([i.title, i.seller, ...i.details.map((d) => `${d.label} ${d.value}`)].join(" "));
      return words.every((w) => hay.includes(w));
    });
  }, [items, platform, q]);

  return (
    <div className="space-y-5" id="listings">
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden>🔎</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="input min-h-12 rounded-2xl pl-11 text-base" />
      </div>

      {/* Game tiles: tap to filter, tap again (or "All") to see everything */}
      <nav aria-label={t("platform")} className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        <button type="button" onClick={() => setPlatform("")} aria-pressed={!platform} className={`relative flex h-24 w-24 shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-2xl border-2 text-sm font-bold transition-transform active:scale-95 ${!platform ? "border-primary bg-primary text-white shadow-lg shadow-primary/30" : "border-border bg-surface"}`}>
          <span className="text-2xl" aria-hidden>✨</span>
          {t("all")}
          <span className="absolute right-1.5 top-1.5 rounded-full bg-black/20 px-1.5 text-[10px]">{items.length}</span>
        </button>
        {PLATFORMS.filter((p) => counts[p.key] || platform === p.key).map((p) => {
          const on = platform === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setPlatform(on ? "" : p.key)}
              aria-pressed={on}
              className={`relative flex h-24 w-24 shrink-0 snap-start flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl bg-gradient-to-br ${p.color} px-1 text-center text-xs font-bold leading-tight text-white transition-all active:scale-95 ${on ? "scale-[1.04] ring-4 ring-primary ring-offset-2 ring-offset-bg" : "opacity-90 hover:opacity-100"}`}
            >
              <span className="text-3xl drop-shadow" aria-hidden>{p.icon}</span>
              {p.key === "other" ? t("otherPlatform") : p.label}
              <span className="absolute right-1.5 top-1.5 rounded-full bg-black/30 px-1.5 text-[10px]">{counts[p.key] ?? 0}</span>
            </button>
          );
        })}
      </nav>

      {shown.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-4xl" aria-hidden>🕹️</p>
          <p className="mt-2 text-muted">{items.length ? t("noMatch") : t("empty")}</p>
          {items.length ? (
            <button type="button" className="btn-secondary mt-4" onClick={() => { setPlatform(""); setQ(""); }}>{t("clearFilters")}</button>
          ) : (
            <Link href="/market/sell" className="btn-primary mt-4">{t("sellFirst")}</Link>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((l) => {
            const p = PLATFORMS.find((x) => x.key === l.platform) ?? PLATFORMS[PLATFORMS.length - 1];
            return (
              <li key={l.id} className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10" data-testid="market-card">
                <Link href={`/market/${l.id}`} className={`relative block aspect-[4/3] overflow-hidden bg-gradient-to-br ${p.color}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {l.image ? <img src={l.image} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" /> : <span className="grid size-full place-items-center text-5xl">{p.icon}</span>}
                  <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 to-transparent" />
                  <span className={`absolute left-2 top-2 rounded-full bg-gradient-to-r ${p.color} px-2 py-0.5 text-[11px] font-bold text-white shadow`}>{p.icon} {p.key === "other" ? t("otherPlatform") : p.label}</span>
                  {l.reserved ? (
                    <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-extrabold text-black">{t("reserved")}</span>
                  ) : l.views >= 50 ? (
                    <span className="absolute right-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-extrabold text-white">🔥 {t("hot")}</span>
                  ) : null}
                  <span className="absolute bottom-2 left-2 right-2 text-white">
                    <span className="line-clamp-2 text-sm font-bold leading-snug drop-shadow">{l.title}</span>
                    <span className="mt-0.5 block text-lg font-extrabold text-amber-300 drop-shadow">{l.price}</span>
                  </span>
                </Link>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  {l.details.length > 0 && (
                    <p className="flex flex-wrap gap-1 text-[11px]">
                      {l.details.map((d) => <span key={d.label} className="rounded-md bg-surface-2 px-1.5 py-0.5"><span className="text-muted">{d.label}</span> <b>{d.value}</b></span>)}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 text-xs">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">{l.seller.slice(0, 1).toUpperCase()}</span>
                    <span className="min-w-0 truncate font-semibold">{l.seller}</span>
                    {l.verified && <span className="shrink-0 text-primary" title={t("verified")}>✓</span>}
                    {l.rating ? <span className="shrink-0 text-amber-500">★ {l.rating.toFixed(1)}</span> : null}
                  </p>
                  <div className="mt-auto flex items-center gap-1.5 pt-1">
                    <Link href={`/market/${l.id}`} className="btn-primary min-h-9 flex-1 px-2 text-xs">{t("inspect")}</Link>
                    <ShareButton compact iconOnly url={l.shareUrl} text={l.shareText} />
                  </div>
                  <p className="text-[10px] text-muted">👁 {t("views", { n: l.views })}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
