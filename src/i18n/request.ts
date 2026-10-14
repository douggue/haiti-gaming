import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  // Missing keys fall back to Kreyòl, then English.
  const [own, ht, en] = await Promise.all([
    import(`../messages/${locale}.json`).then((m) => m.default),
    import(`../messages/ht.json`).then((m) => m.default),
    import(`../messages/en.json`).then((m) => m.default),
  ]);
  return { locale, messages: deepMerge(deepMerge(en, ht), own) };
});

function deepMerge(base: Record<string, unknown>, over: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) && typeof base[k] === "object"
      ? deepMerge(base[k] as Record<string, unknown>, v as Record<string, unknown>)
      : v;
  }
  return out;
}
