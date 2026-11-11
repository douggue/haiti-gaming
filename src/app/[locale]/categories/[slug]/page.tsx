import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { searchProducts } from "@/lib/catalog";
import { t } from "@/lib/text";
import { contentSeo } from "@/lib/seo";
import { ProductCard } from "@/components/ProductCard";
import { Link } from "@/i18n/navigation";
import { CategoryIcon } from "@/components/CategoryIcon";

type P = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { locale, slug } = await params;
  const c = await prisma.category.findUnique({ where: { slug } });
  if (!c) return {};
  return contentSeo(locale, `/categories/${slug}`, { title: t(c.name, locale), description: t(c.description, locale).slice(0, 160) || undefined, image: c.cover || c.image });
}

export default async function CategoryPage({ params }: { params: P }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const category = await prisma.category.findUnique({ where: { slug }, include: { parent: true, children: { where: { isVisible: true }, orderBy: { sortOrder: "asc" } } } });
  if (!category || !category.isVisible) notFound();
  const [tc, ts, products] = await Promise.all([getTranslations("common"), getTranslations("store"), searchProducts({ category: slug })]);
  return (
    <div className="container-page py-6 sm:py-10">
      <nav className="text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/categories" className="hover:text-text">{tc("categories")}</Link> /{" "}
        {category.parent && <><Link href={`/categories/${category.parent.slug}`} className="hover:text-text">{t(category.parent.name, locale)}</Link> / </>}
        <span>{t(category.name, locale)}</span>
      </nav>
      <header className="relative mt-3 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#1d4ed8]/25 via-surface/70 to-[#7c3aed]/15 p-5 sm:p-7">
        <span aria-hidden className="ds-hide pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#3b82f6]/25 blur-3xl" />
        <div className="relative flex items-center justify-between gap-3">
          <h1 className="display flex min-w-0 items-center gap-3 text-2xl font-extrabold tracking-tight sm:text-4xl"><CategoryIcon image={category.image} icon={category.icon} size={48} /> {t(category.name, locale)}</h1>
          <p className="shrink-0 rounded-full border border-border bg-surface-2/70 px-3 py-1.5 text-xs font-semibold sm:text-sm">{ts("results", { count: products.length })}</p>
        </div>
        {category.children.length > 0 && (
          <nav className="relative mt-4 flex flex-wrap gap-2" aria-label={ts("subcategories")}>
            {category.children.map((c) => (
              <Link key={c.id} href={`/categories/${c.slug}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3.5 text-sm font-semibold hover:border-[#3b82f6]/60">{c.icon} {t(c.name, locale)}</Link>
            ))}
          </nav>
        )}
      </header>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
