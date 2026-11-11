import * as UI from "@/components/Icons";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { pageSeo } from "@/lib/seo";
import { NewsCard } from "@/components/NewsCard";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "news" });
  return pageSeo(locale, "/news", t("title"), t("subtitle"));
}

export default async function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, articles] = await Promise.all([
    getTranslations("news"),
    prisma.newsArticle.findMany({ where: { isPublished: true, publishedAt: { lte: new Date() } }, orderBy: { publishedAt: "desc" }, take: 60 }),
  ]);
  return (
    <div className="container-page py-6 sm:py-10">
      <header className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#1d4ed8]/25 via-surface/70 to-[#7c3aed]/15 p-5 sm:p-8">
        <span aria-hidden className="ds-hide pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-[#3b82f6]/25 blur-3xl" />
        <p className="eyebrow relative text-[#60a5fa]">Haiti Gaming</p>
        <h1 className="display relative mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="relative mt-1 text-sm text-muted sm:text-base">{t("subtitle")}</p>
      </header>
      {articles.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-border bg-surface/70 p-10 text-center text-muted"><span className="mx-auto mb-2 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary" aria-hidden><UI.NewsIcon width={28} height={28} /></span>{t("empty")}</div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{articles.map((a) => <NewsCard key={a.id} article={a} locale={locale} />)}</div>
      )}
    </div>
  );
}
