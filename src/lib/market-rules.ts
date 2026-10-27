import en from "@/messages/en.json";
import ht from "@/messages/ht.json";
import fr from "@/messages/fr.json";
import es from "@/messages/es.json";
import type { Settings } from "@/lib/settings";

const LOCALES = { ht, fr, en, es } as const;
type L = keyof typeof LOCALES;
const ORDER = ["rule1", "rule7", "rule2", "rule3", "rule4", "rule5", "rule6"] as const;

/** The standard rules shipped with the site, in one language. */
export function defaultRules(locale: string): string[] {
  const m = (LOCALES[locale as L] ?? ht).market as Record<string, string>;
  return ORDER.map((k) => m[k]).filter(Boolean);
}

/** Rules shown to customers: staff's own wording if set (Kreyòl when a language is left empty), else the standard ones. */
export function marketRules(settings: Pick<Settings, "marketRules">, locale: string): string[] {
  const custom = settings.marketRules?.[locale as L]?.filter(Boolean) ?? [];
  if (custom.length) return custom;
  const anyCustom = Object.values(settings.marketRules ?? {}).some((l) => l?.some(Boolean));
  const kreyol = settings.marketRules?.ht?.filter(Boolean) ?? [];
  return anyCustom && kreyol.length ? kreyol : defaultRules(locale);
}

/** Accepted, and not before staff last asked everyone to accept again. */
export function rulesAccepted(at: Date | null | undefined, settings: Pick<Settings, "marketRulesUpdatedAt">) {
  if (!at) return false;
  const changed = settings.marketRulesUpdatedAt ? Date.parse(settings.marketRulesUpdatedAt) : 0;
  return at.getTime() >= changed;
}
