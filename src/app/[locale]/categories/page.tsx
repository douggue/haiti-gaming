import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategories } from "@/lib/catalog";
import { t } from "@/lib/text";
import { pageSeo } from "@/lib/seo";
import { CategoryIcon } from "@/components/CategoryIcon";

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
    <div className="container-page py-8 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight">{tc("categories")}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {categories.map((c) => (
          <Link key={c.id} href={`/categories/${c.slug}`} className="card lift flex items-center gap-4 p-5">
            <CategoryIcon image={c.image} icon={c.icon} size={56} />
            <span>
              <span className="block text-lg font-semibold">{t(c.name, locale)}</span>
              <span className="text-sm text-muted">{c._count.products}{c.children.length > 0 && ` · ${c.children.map((ch) => t(ch.name, locale)).join(", ")}`}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
