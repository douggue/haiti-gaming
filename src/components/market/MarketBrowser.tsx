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

  const chip = (active: boolean) => `shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${active ? "border-primary bg-primary text-white" : "border-border hover:bg-surface-2"}`;

  return (
    <>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="input" />
      <nav aria-label={t("platform")} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button type="button" onClick={() => setPlatform("")} aria-pressed={!platform} className={chip(!platform)}>
          {t("all")} <span className="opacity-70">{items.length}</span>
        </button>
        {PLATFORMS.filter((p) => counts[p.key] || platform === p.key).map((p) => (
          <button key={p.key} type="button" onClick={() => setPlatform(platform === p.key ? "" : p.key)} aria-pressed={platform === p.key} className={chip(platform === p.key)}>
            {p.icon} {p.key === "other" ? t("otherPlatform") : p.label} <span className="opacity-70">{counts[p.key] ?? 0}</span>
          </button>
        ))}
      </nav>

      {shown.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-muted">{items.length ? t("noMatch") : t("empty")}</p>
          {items.length ? (
            <button type="button" className="btn-secondary mt-4" onClick={() => { setPlatform(""); setQ(""); }}>{t("clearFilters")}</button>
          ) : (
            <Link href="/market/sell" className="btn-primary mt-4">{t("sellFirst")}</Link>
          )}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((l) => {
            const p = PLATFORMS.find((x) => x.key === l.platform) ?? PLATFORMS[PLATFORMS.length - 1];
            return (
              <li key={l.id} className="card flex flex-col overflow-hidden" data-testid="market-card">
                <Link href={`/market/${l.id}`} className="relative block aspect-video bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {l.image && <img src={l.image} alt="" loading="lazy" className="size-full object-cover" />}
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">{p.icon} {p.key === "other" ? t("otherPlatform") : p.label}</span>
                  {l.reserved && <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-black">{t("reserved")}</span>}
                </Link>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <Link href={`/market/${l.id}`} className="line-clamp-2 font-semibold">{l.title}</Link>
                  {l.details.length > 0 && (
                    <p className="flex flex-wrap gap-1.5 text-xs">
                      {l.details.map((d) => <span key={d.label} className="rounded-md bg-surface-2 px-2 py-0.5"><span className="text-muted">{d.label}:</span> {d.value}</span>)}
                    </p>
                  )}
                  <p className="text-xs text-muted">
                    {l.seller}{l.verified && <span className="text-primary" title={t("verified")}> ✓</span>}
                    {l.rating ? ` · ★ ${l.rating.toFixed(1)}` : ""} · {t("views", { n: l.views })}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <b className="text-lg">{l.price}</b>
                    <span className="flex gap-1.5">
                      <ShareButton compact url={l.shareUrl} text={l.shareText} />
                      <Link href={`/market/${l.id}`} className="btn-primary min-h-9 px-3 text-xs">{t("inspect")}</Link>
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
