import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategories, getTags, searchProducts } from "@/lib/catalog";
import { getDisplayCurrency } from "@/lib/prefs";
import { getDisplaySettings } from "@/lib/settings";
import { t } from "@/lib/text";
import { pageSeo } from "@/lib/seo";
import { ProductCard } from "@/components/ProductCard";
import { SearchIcon } from "@/components/Icons";

type SP = Promise<{ q?: string; category?: string; sort?: string; tag?: string; min?: string; max?: string }>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const ts = await getTranslations({ locale, namespace: "store" });
  return pageSeo(locale, "/store", ts("title"), ts("subtitle"));
}

export default async function StorePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SP }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const [currency, settings] = await Promise.all([getDisplayCurrency(), getDisplaySettings()]);
  // Price filters are typed in the visitor's display currency; prices are stored in HTG.
  const toHtg = (v?: string) => {
    const n = Number(v);
    if (!v || !Number.isFinite(n) || n < 0) return undefined;
    return Math.round(n * 100 * (currency === "USD" ? settings.htgPerUsd : 1));
  };
  const [ts, tc, categories, tags, products] = await Promise.all([
    getTranslations("store"),
    getTranslations("common"),
    getCategories(),
    getTags(),
    searchProducts({ q: sp.q, category: sp.category, sort: sp.sort, tag: sp.tag, minHtg: toHtg(sp.min), maxHtg: toHtg(sp.max) }),
  ]);
  const filtered = !!(sp.tag || sp.min || sp.max || sp.category || sp.q);

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: sp.q, category: sp.category, sort: sp.sort, tag: sp.tag, min: sp.min, max: sp.max, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/store?${s}` : "/store";
  };

  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight">{ts("title")}</h1>
      <p className="mt-1 text-muted">{ts("subtitle")}</p>

      <form className="mt-6 flex flex-col gap-3 sm:flex-row" role="search">
        <label className="relative flex-1">
          <span className="sr-only">{tc("search")}</span>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" width={18} height={18} />
          <input name="q" type="search" defaultValue={sp.q} placeholder={tc("searchPlaceholder")} className="input pl-9" />
        </label>
        {sp.category && <input type="hidden" name="category" value={sp.category} />}
        {sp.tag && <input type="hidden" name="tag" value={sp.tag} />}
        <label className="sm:w-56">
          <span className="sr-only">{ts("sort")}</span>
          <select name="sort" defaultValue={sp.sort ?? ""} className="input">
            <option value="">{ts("sortFeatured")}</option>
            <option value="price_asc">{ts("sortPriceLow")}</option>
            <option value="price_desc">{ts("sortPriceHigh")}</option>
            <option value="newest">{ts("sortNewest")}</option>
          </select>
        </label>
        <button className="btn-primary">{tc("search")}</button>
      </form>

      <nav className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2" aria-label={tc("categories")}>
        <Link href={qs({ category: undefined })} className={`badge shrink-0 px-4 py-2 text-sm ${!sp.category ? "bg-primary text-white" : "border border-border bg-surface"}`}>
          {ts("all")}
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={qs({ category: c.slug })}
            className={`badge shrink-0 px-4 py-2 text-sm ${sp.category === c.slug ? "bg-primary text-white" : "border border-border bg-surface"}`}
          >
            {c.icon} {t(c.name, locale)}
          </Link>
        ))}
      </nav>

      <details className="mt-2" open={!!(sp.tag || sp.min || sp.max)}>
        <summary className="cursor-pointer text-sm font-semibold">{ts("filters")}</summary>
        <div className="mt-3 space-y-3">
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2" aria-label={ts("tag")}>
              <span className="text-sm text-muted">{ts("tag")}:</span>
              <Link href={qs({ tag: undefined })} className={`badge px-3 py-1.5 ${!sp.tag ? "bg-navy text-white" : "border border-border bg-surface"}`}>{ts("anyTag")}</Link>
              {tags.map((tg) => (
                <Link key={tg} href={qs({ tag: tg })} className={`badge px-3 py-1.5 ${sp.tag === tg ? "bg-navy text-white" : "border border-border bg-surface"}`}>{tg}</Link>
              ))}
            </div>
          )}
          <form className="flex flex-wrap items-end gap-2">
            {(["q", "category", "sort", "tag"] as const).map((k) => sp[k] ? <input key={k} type="hidden" name={k} value={sp[k]} /> : null)}
            <label><span className="mb-1 block text-xs text-muted">{ts("priceMin")} ({currency})</span><input name="min" inputMode="decimal" defaultValue={sp.min} className="input w-32" /></label>
            <label><span className="mb-1 block text-xs text-muted">{ts("priceMax")} ({currency})</span><input name="max" inputMode="decimal" defaultValue={sp.max} className="input w-32" /></label>
            <button className="btn-secondary">{ts("apply")}</button>
            {filtered && <Link href="/store" className="btn-ghost text-sm">{ts("clear")}</Link>}
          </form>
        </div>
      </details>

      <h2 className="mt-4 text-sm font-normal text-muted">{ts("results", { count: products.length })}</h2>
      {products.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-muted">{ts("noResults")}</div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
