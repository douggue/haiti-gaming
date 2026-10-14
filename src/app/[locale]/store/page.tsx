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
import { FiltersPanel } from "@/components/FiltersPanel";

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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-3xl font-bold sm:text-4xl">{ts("title")}</h1>
          <p className="mt-1 text-muted">{ts("subtitle")}</p>
        </div>
        <h2 className="text-sm font-normal text-muted">{ts("results", { count: products.length })}</h2>
      </div>

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

      <nav className="-mx-4 mt-5 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:rounded-2xl sm:border sm:border-border sm:bg-surface sm:p-1.5" aria-label={tc("categories")}>
        <Link href={qs({ category: undefined })} className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold ${!sp.category ? "glow-btn bg-primary text-white" : "text-muted hover:text-text"}`}>
          {ts("all")}
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={qs({ category: c.slug })}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold ${sp.category === c.slug ? "glow-btn bg-primary text-white" : "text-muted hover:text-text"}`}
          >
            {c.icon} {t(c.name, locale)}
          </Link>
        ))}
      </nav>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside>
          <FiltersPanel title={ts("filters")} defaultOpen={!!(sp.tag || sp.min || sp.max)}>
            {tags.length > 0 && (
              <div className="space-y-2" aria-label={ts("tag")}>
                <p className="text-xs font-bold uppercase tracking-wider text-muted">{ts("tag")}</p>
                <div className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
                  <Link href={qs({ tag: undefined })} className={`rounded-xl px-3 py-2 text-sm font-semibold ${!sp.tag ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-text"}`}>{ts("anyTag")}</Link>
                  {tags.map((tg) => (
                    <Link key={tg} href={qs({ tag: tg })} className={`rounded-xl px-3 py-2 text-sm font-semibold ${sp.tag === tg ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-text"}`}>{tg}</Link>
                  ))}
                </div>
              </div>
            )}
            <form className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">{ts("price")} ({currency})</p>
              {(["q", "category", "sort", "tag"] as const).map((k) => sp[k] ? <input key={k} type="hidden" name={k} value={sp[k]} /> : null)}
              <div className="grid grid-cols-2 gap-2">
                <label><span className="mb-1 block text-xs text-muted">{ts("priceMin")}</span><input name="min" inputMode="decimal" defaultValue={sp.min} className="input" /></label>
                <label><span className="mb-1 block text-xs text-muted">{ts("priceMax")}</span><input name="max" inputMode="decimal" defaultValue={sp.max} className="input" /></label>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary flex-1">{ts("apply")}</button>
                {filtered && <Link href="/store" className="btn-ghost text-sm">{ts("clear")}</Link>}
              </div>
            </form>
          </FiltersPanel>
        </aside>

        <div className="min-w-0">
          {products.length === 0 ? (
            <div className="card p-10 text-center text-muted">{ts("noResults")}</div>
          ) : (
            <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
