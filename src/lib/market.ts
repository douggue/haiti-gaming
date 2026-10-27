/** Market platforms (client-safe). Icons are emoji so they work everywhere without image files. */
export const PLATFORMS = [
  { key: "freefire", label: "Free Fire", icon: "🔥", color: "from-orange-500 to-red-600" },
  { key: "pubg", label: "PUBG Mobile", icon: "🎯", color: "from-amber-400 to-yellow-700" },
  { key: "codm", label: "Call of Duty Mobile", icon: "🪖", color: "from-emerald-600 to-zinc-900" },
  { key: "efootball", label: "eFootball", icon: "⚽", color: "from-sky-500 to-blue-800" },
  { key: "tiktok", label: "TikTok", icon: "🎵", color: "from-fuchsia-500 to-cyan-500" },
  { key: "instagram", label: "Instagram", icon: "📸", color: "from-pink-500 via-rose-500 to-amber-400" },
  { key: "facebook", label: "Facebook", icon: "👍", color: "from-blue-500 to-indigo-800" },
  { key: "youtube", label: "YouTube", icon: "▶️", color: "from-red-500 to-rose-800" },
  { key: "other", label: "Other", icon: "🎮", color: "from-violet-500 to-indigo-700" },
] as const;

export type PlatformKey = (typeof PLATFORMS)[number]["key"];
export const platformOf = (key: string) => PLATFORMS.find((p) => p.key === key) ?? PLATFORMS[PLATFORMS.length - 1];
export const isPlatform = (key: unknown): key is PlatformKey => PLATFORMS.some((p) => p.key === key);

export type Detail = { label: string; value: string };

/** Commission kept from the seller: basis points of the price, rounded to the unit. */
export function commissionOf(price: number, bps: number) {
  return Math.round((price * bps) / 10_000);
}
