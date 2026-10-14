export const HOME_SECTIONS = ["categories", "featured", "howItWorks", "wallet", "news", "trust", "faq"] as const;
export type HomeSectionId = (typeof HOME_SECTIONS)[number];

export const HOME_SECTION_LABELS: Record<HomeSectionId, string> = {
  categories: "Shop by category",
  featured: "Popular products",
  howItWorks: "How it works (3 steps)",
  wallet: "Wallet promotion",
  news: "Latest news (3 newest articles)",
  trust: "Why players choose us",
  faq: "Frequently asked questions",
};

export type HomepageConfig = {
  sections: { id: HomeSectionId; visible: boolean }[];
  /** Optional per-language overrides of the hero text; empty = default wording */
  hero: { eyebrow: Record<string, string>; title: Record<string, string>; subtitle: Record<string, string> };
  ctaHref: string;
};

export const DEFAULT_HOMEPAGE: HomepageConfig = {
  sections: HOME_SECTIONS.map((id) => ({ id, visible: true })),
  hero: { eyebrow: {}, title: {}, subtitle: {} },
  ctaHref: "/store",
};

/** Accepts stored JSON of any age and returns a complete, valid config (unknown sections dropped, new ones appended). */
export function normalizeHomepage(raw: unknown): HomepageConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<HomepageConfig>;
  const seen = new Set<string>();
  const sections = (Array.isArray(r.sections) ? r.sections : [])
    .filter((x) => x && HOME_SECTIONS.includes(x.id as HomeSectionId) && !seen.has(x.id) && seen.add(x.id))
    .map((x) => ({ id: x.id as HomeSectionId, visible: x.visible !== false }));
  for (const id of HOME_SECTIONS) if (!seen.has(id)) sections.push({ id, visible: true });
  return {
    sections,
    hero: { eyebrow: r.hero?.eyebrow ?? {}, title: r.hero?.title ?? {}, subtitle: r.hero?.subtitle ?? {} },
    ctaHref: typeof r.ctaHref === "string" && r.ctaHref.startsWith("/") ? r.ctaHref : "/store",
  };
}
