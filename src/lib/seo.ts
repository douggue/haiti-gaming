import { locales } from "@/i18n/routing";

const base = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Canonical + hreflang links for a localized path ("" for home, "/store", …). */
export function alternates(locale: string, path: string) {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = `${base()}/${l}${path}`;
  languages["x-default"] = `${base()}/ht${path}`;
  return { canonical: `${base()}/${locale}${path}`, languages };
}
