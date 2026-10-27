import { siteUrl } from "./site-url";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { t } from "@/lib/text";
import { locales } from "@/i18n/routing";

const base = () => siteUrl();

/** Canonical + hreflang links for a localized path ("" for home, "/store", …). */
export function alternates(locale: string, path: string) {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = `${base()}/${l}${path}`;
  languages["x-default"] = `${base()}/ht${path}`;
  return { canonical: `${base()}/${locale}${path}`, languages };
}

/** Metadata for a fixed page, applying any title/description override from Admin → SEO. */
export async function pageSeo(locale: string, path: string, title?: string, description?: string): Promise<Metadata> {
  const o = await prisma.pageSeo.findUnique({ where: { path } }).catch(() => null);
  const oTitle = o ? t(o.title, locale) : "";
  const oDesc = o ? t(o.description, locale) : "";
  return {
    ...(oTitle ? { title: path === "/" ? { absolute: oTitle } : oTitle } : title ? { title } : {}),
    ...(oDesc || description ? { description: oDesc || description } : {}),
    alternates: alternates(locale, path === "/" ? "" : path),
    ...(o?.ogImage ? { openGraph: { images: [o.ogImage] } } : {}),
    ...(o?.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/**
 * Content pages (product, category, news, custom page): their own title/description/image, replaced by anything
 * set for that path in Admin → SEO, plus "hide from Google".
 */
export async function contentSeo(locale: string, path: string, d: { title: string; description?: string; image?: string | null; type?: "article" | "website" }): Promise<Metadata> {
  const o = await prisma.pageSeo.findUnique({ where: { path } }).catch(() => null);
  const title = (o && t(o.title, locale)) || d.title;
  const description = (o && t(o.description, locale)) || d.description || undefined;
  const image = o?.ogImage || d.image || undefined;
  return {
    title,
    description,
    alternates: alternates(locale, path),
    openGraph: { title, description, ...(d.type ? { type: d.type } : {}), ...(image ? { images: [image] } : {}) },
    ...(o?.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
