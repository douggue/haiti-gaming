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
  announcement: { enabled: boolean; text: Record<string, string>; link: string };
};

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
}
