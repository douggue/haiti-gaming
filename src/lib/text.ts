/** Localized JSON text stored as { ht, fr, en, es }. Falls back to Kreyòl, then French, then any value. */
export type LocalizedText = Partial<Record<"ht" | "fr" | "en" | "es", string>>;

export function t(value: unknown, locale: string): string {
  if (!value || typeof value !== "object") return typeof value === "string" ? value : "";
  const v = value as LocalizedText;
  return (v as Record<string, string | undefined>)[locale] || v.ht || v.fr || v.en || Object.values(v).find(Boolean) || "";
}
