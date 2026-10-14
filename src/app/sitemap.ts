import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { locales } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { isVisible: true }, select: { slug: true, updatedAt: true } }),
  ]);
  const paths: { path: string; lastModified?: Date }[] = [
    { path: "" }, { path: "/store" }, { path: "/categories" }, { path: "/guides" }, { path: "/faq" },
    { path: "/about" }, { path: "/contact" }, { path: "/terms" }, { path: "/privacy" }, { path: "/refunds" },
    ...categories.map((c) => ({ path: `/categories/${c.slug}`, lastModified: c.updatedAt })),
    ...products.map((p) => ({ path: `/products/${p.slug}`, lastModified: p.updatedAt })),
  ];
  return paths.flatMap(({ path, lastModified }) =>
    locales.map((l) => ({
      url: `${base}/${l}${path}`,
      lastModified,
      alternates: { languages: Object.fromEntries(locales.map((x) => [x, `${base}/${x}${path}`])) },
    })),
  );
}
