import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "./db";

export type Settings = {
  /** HTG per 1 USD (mid rate) */
  htgPerUsd: number;
  /** Exchange spread applied against the customer, in basis points */
  exchangeSpreadBps: number;
  /** Flat exchange fee in basis points of the source amount */
  exchangeFeeBps: number;
  exchangeQuoteSeconds: number;
  minDepositHtg: number;
  maxDepositHtg: number;
  /** Manual deposits at or above this amount are held before becoming spendable */
  holdThresholdHtg: number;
  holdHours: number;
  /** Accounts younger than this many days get lower limits */
  newAccountDays: number;
  newAccountDailyLimitHtg: number;
  /** Orders at or above this total go to manual review before codes are released */
  reviewOrderThresholdHtg: number;
  natcashRecipientName: string;
  natcashRecipientPhone: string;
  natcashInstructions: Record<string, string>;
  moncashEnabled: boolean;
  natcashEnabled: boolean;
  whatsappNumber: string;
  supportHours: string;
  businessAddress: string;
  businessName: string;
  socialFacebook: string;
  socialInstagram: string;
  socialTiktok: string;
  announcement: { enabled: boolean; text: Record<string, string>; link: string; startsAt?: string; endsAt?: string };
  /** Header and footer links (Admin → Navigation). Empty = built-in links. */
  navigation: { header: NavLink[]; footer: NavLink[] };
  newsletterEnabled: boolean;
  /** New accounts on a browser already used by this many other accounts are flagged for review */
  maxAccountsPerDevice: number;
  /** Brand images (URLs). Empty = built-in logo / default artwork. */
  logoUrl: string;
  logoDarkUrl: string;
  /** Wallet adjustments at or above this HTG-equivalent amount need a second staff approval */
  approvalThresholdHtg: number;
  /** Paid orders not delivered after this many hours are refunded to the wallet automatically (0 = off) */
  autoRefundHours: number;
  referralEnabled: boolean;
  referralRewardHtg: number;
  referralMinOrderHtg: number;
  heroImageUrl: string;
  ogImageUrl: string;
  homepage: unknown;
  homepageDraft: unknown;
  homepageHistory: { at: string; by: string; config: unknown }[];
  theme: ThemeConfig;
  themeHistory: { at: string; by: string; theme: ThemeConfig }[];
};

export type NavLink = { label: Record<string, string>; href: string };

export type ThemeConfig = {
  primary: string;
  primaryDark: string;
  navy: string;
  midnight: string;
  radius: number;
  animations: boolean;
};

export const DEFAULT_THEME: ThemeConfig = { primary: "#1467F5", primaryDark: "#3D82FF", navy: "#0D1B35", midnight: "#050B18", radius: 16, animations: true };

// Amounts in minor units (centimes).
export const DEFAULT_SETTINGS: Settings = {
  htgPerUsd: 131.5,
  exchangeSpreadBps: 150,
  exchangeFeeBps: 0,
  exchangeQuoteSeconds: 120,
  minDepositHtg: 10_000,
  maxDepositHtg: 10_000_000,
  holdThresholdHtg: 2_500_000,
  holdHours: 24,
  newAccountDays: 3,
  newAccountDailyLimitHtg: 1_500_000,
  reviewOrderThresholdHtg: 2_000_000,
  natcashRecipientName: "Haiti Gaming",
  natcashRecipientPhone: "+509 0000 0000",
  natcashInstructions: {},
  moncashEnabled: true,
  natcashEnabled: true,
  whatsappNumber: "50900000000",
  supportHours: "Lun–Sam 8:00–20:00",
  businessAddress: "Port-au-Prince, Haïti",
  businessName: "Haiti Gaming",
  socialFacebook: "",
  socialInstagram: "",
  socialTiktok: "",
  announcement: { enabled: false, text: {}, link: "" },
  logoUrl: "",
  logoDarkUrl: "",
  approvalThresholdHtg: 1_000_000,
  autoRefundHours: 24,
  referralEnabled: false,
  referralRewardHtg: 10_000,
  referralMinOrderHtg: 50_000,
  heroImageUrl: "",
  ogImageUrl: "",
  homepage: null,
  homepageDraft: null,
  homepageHistory: [],
  theme: DEFAULT_THEME,
  themeHistory: [],
  navigation: { header: [], footer: [] },
  newsletterEnabled: false,
  maxAccountsPerDevice: 3,
};

export async function getSettings(): Promise<Settings> {
  const rows = await prisma.siteSetting.findMany();
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in DEFAULT_SETTINGS) merged[r.key] = r.value;
  return merged as Settings;
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
  try {
    revalidateTag("settings");
  } catch {
    // outside a Next.js request (seed/scripts): the 60-second expiry covers it
  }
}

/**
 * Cached copy for rendering public pages (logo, menus, announcement, contact numbers).
 * Refreshed as soon as staff save settings, and at most 60 seconds old otherwise.
 * Money paths (deposits, exchange, limits, checkout) keep using getSettings(), which always reads the database.
 */
const cachedSettings = unstable_cache(getSettings, ["site-settings"], { tags: ["settings"], revalidate: 60 });
export const getDisplaySettings = cache(() => cachedSettings());
