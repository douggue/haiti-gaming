import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategories } from "@/lib/catalog";
import { t } from "@/lib/text";
import { pageSeo } from "@/lib/seo";
import { CategoryCard } from "@/components/CategoryCard";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const tc = await getTranslations({ locale, namespace: "common" });
  return pageSeo(locale, "/categories", tc("categories"));
}

export default async function CategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [tc, categories] = await Promise.all([getTranslations("common"), getCategories()]);
  return (
    <div className="container-page py-6 sm:py-10">
      <header className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#1d4ed8]/25 via-surface/70 to-[#7c3aed]/15 p-5 sm:p-8">
        <span aria-hidden className="ds-hide pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-[#3b82f6]/25 blur-3xl" />
        <p className="eyebrow relative text-[#60a5fa]">Haiti Gaming</p>
        <h1 className="display relative mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{tc("categories")}</h1>
        <p className="relative mt-1 text-sm text-muted">{categories.length} {tc("categories").toLowerCase()}</p>
      </header>
      <div className="stagger mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {categories.map((c, i) => (
          <CategoryCard
            key={c.id}
            href={`/categories/${c.slug}`}
            name={t(c.name, locale)}
            count={`${c._count.products} ${tc("products")}`}
            sub={c.children.length > 0 ? c.children.map((ch) => t(ch.name, locale)).join(", ") : undefined}
            cover={c.cover}
            image={c.image}
            icon={c.icon}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
