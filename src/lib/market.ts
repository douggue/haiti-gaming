/** Market platforms (client-safe). Icons are emoji so they work everywhere without image files. */
export const PLATFORMS = [
  { key: "freefire", label: "Free Fire", icon: "🔥" },
  { key: "pubg", label: "PUBG Mobile", icon: "🎯" },
  { key: "codm", label: "Call of Duty Mobile", icon: "🪖" },
  { key: "efootball", label: "eFootball", icon: "⚽" },
  { key: "tiktok", label: "TikTok", icon: "🎵" },
  { key: "instagram", label: "Instagram", icon: "📸" },
  { key: "facebook", label: "Facebook", icon: "👍" },
  { key: "youtube", label: "YouTube", icon: "▶️" },
  { key: "other", label: "Other", icon: "🎮" },
] as const;

export type PlatformKey = (typeof PLATFORMS)[number]["key"];
export const platformOf = (key: string) => PLATFORMS.find((p) => p.key === key) ?? PLATFORMS[PLATFORMS.length - 1];
export const isPlatform = (key: unknown): key is PlatformKey => PLATFORMS.some((p) => p.key === key);

export type Detail = { label: string; value: string };

/** Commission kept from the seller: basis points of the price, rounded to the unit. */
export function commissionOf(price: number, bps: number) {
  return Math.round((price * bps) / 10_000);
}
