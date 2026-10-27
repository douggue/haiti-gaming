import { siteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = siteUrl();
  const extra = (await getSettings().catch(() => null))?.robotsDisallow ?? [];
  // Extra paths from Admin → SEO apply in every language (/ht/…, /fr/…).
  const localized = extra.flatMap((p) => [p, `/*${p}`]);
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/*/account", "/*/checkout", "/*/cart", "/*/auth", "/*/gift/", ...localized] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
