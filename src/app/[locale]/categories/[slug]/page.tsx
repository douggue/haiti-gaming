import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { searchProducts } from "@/lib/catalog";
import { t } from "@/lib/text";
import { alternates } from "@/lib/seo";
import { ProductCard } from "@/components/ProductCard";
import { Link } from "@/i18n/navigation";

type P = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { locale, slug } = await params;
  const c = await prisma.category.findUnique({ where: { slug } });
  if (!c) return {};
  return { title: t(c.name, locale), alternates: alternates(locale, `/categories/${slug}`) };
}

export default async function CategoryPage({ params }: { params: P }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category || !category.isVisible) notFound();
  const [tc, ts, products] = await Promise.all([getTranslations("common"), getTranslations("store"), searchProducts({ category: slug })]);
  return (
    <div className="container-page py-8 sm:py-12">
      <nav className="text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/categories" className="hover:text-text">{tc("categories")}</Link> / <span>{t(category.name, locale)}</span>
      </nav>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{category.icon} {t(category.name, locale)}</h1>
      <p className="mt-2 text-sm text-muted">{ts("results", { count: products.length })}</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
