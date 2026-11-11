import type { Metadata } from "next";
import { jsonLd as toJsonLd } from "@/lib/json-ld";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { formatDate, t } from "@/lib/text";
import { contentSeo } from "@/lib/seo";
import { Link } from "@/i18n/navigation";

type P = Promise<{ locale: string; slug: string }>;
const load = (slug: string) => prisma.newsArticle.findFirst({ where: { slug, isPublished: true, publishedAt: { lte: new Date() } } });

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { locale, slug } = await params;
  const a = await load(slug);
  if (!a) return {};
  return contentSeo(locale, `/news/${slug}`, { title: t(a.title, locale), description: t(a.excerpt, locale), image: a.image, type: "article" });
}

export default async function ArticlePage({ params }: { params: P }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const a = await load(slug);
  if (!a) notFound();
  const tn = await getTranslations("news");
  const title = t(a.title, locale);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    datePublished: a.publishedAt?.toISOString(),
    dateModified: a.updatedAt.toISOString(),
    ...(a.image ? { image: [a.image] } : {}),
  };
  return (
    <article className="container-page max-w-3xl py-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }} />
      <Link href="/news" className="inline-flex min-h-9 items-center rounded-full border border-border bg-surface/80 px-3 text-sm text-muted hover:text-text">← {tn("back")}</Link>
      {a.publishedAt && <time className="eyebrow mt-5 block text-[#60a5fa]" dateTime={a.publishedAt.toISOString()}>{formatDate(a.publishedAt, locale, "long")}</time>}
      <h1 className="display mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      {a.image && (
        <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-3xl border border-border bg-surface-2">
          <Image src={a.image} alt="" fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
        </div>
      )}
      {/* Plain text with paragraphs: no HTML is ever rendered from the editor. */}
      <div className="mt-6 space-y-4 rounded-3xl border border-border bg-surface/80 p-5 text-[15px] leading-relaxed sm:p-7">
        {t(a.body, locale).split(/\n{2,}/).map((para, i) => <p key={i} className="whitespace-pre-line">{para}</p>)}
      </div>
    </article>
  );
}
