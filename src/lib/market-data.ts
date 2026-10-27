import { prisma } from "@/lib/db";

export type SellerStats = { sold: number; rating: number | null; ratings: number };

/** Sold accounts and average buyer rating per seller. */
export async function sellerStats(ids: string[]): Promise<Map<string, SellerStats>> {
  const out = new Map<string, SellerStats>();
  if (!ids.length) return out;
  const rows = await prisma.marketDeal.groupBy({
    by: ["sellerId"],
    where: { sellerId: { in: [...new Set(ids)] }, status: "COMPLETED" },
    _count: { _all: true },
    _avg: { rating: true },
  });
  const rated = await prisma.marketDeal.groupBy({
    by: ["sellerId"],
    where: { sellerId: { in: [...new Set(ids)] }, status: "COMPLETED", rating: { not: null } },
    _count: { _all: true },
  });
  const r = new Map(rated.map((x) => [x.sellerId, x._count._all]));
  for (const row of rows) out.set(row.sellerId, { sold: row._count._all, rating: row._avg.rating, ratings: r.get(row.sellerId) ?? 0 });
  return out;
}

export const listingImages = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
export const listingDetails = (v: unknown): { label: string; value: string }[] =>
  Array.isArray(v) ? v.filter((d): d is { label: string; value: string } => !!d && typeof d.label === "string" && typeof d.value === "string") : [];
