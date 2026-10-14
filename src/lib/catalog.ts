import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export const productCardInclude = {
  variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
  category: true,
} satisfies Prisma.ProductInclude;

export type ProductWithVariants = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

export function minPrice(p: ProductWithVariants) {
  const prices = p.variants.map((v) => v.salePriceHtg ?? v.priceHtg);
  return prices.length ? Math.min(...prices) : 0;
}

export async function getCategories() {
  return prisma.category.findMany({
    where: { isVisible: true, parentId: null },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: { where: { isPublished: true } } } } },
  });
}

export async function searchProducts(opts: { q?: string; category?: string; sort?: string; featured?: boolean; take?: number }) {
  const where: Prisma.ProductWhereInput = { isPublished: true, variants: { some: { isActive: true } } };
  if (opts.category) where.category = { slug: opts.category };
  if (opts.featured) where.isFeatured = true;
  if (opts.q) {
    const q = opts.q.trim().slice(0, 80);
    // Localized names are JSON; search the serialized value so any language matches.
    const ids = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Product" WHERE "isPublished" = true AND (name::text ILIKE ${"%" + q + "%"} OR slug ILIKE ${"%" + q + "%"})`;
    where.id = { in: ids.map((r) => r.id) };
  }
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    opts.sort === "newest" ? [{ createdAt: "desc" }] : [{ isFeatured: "desc" }, { sortOrder: "asc" }];
  const products = await prisma.product.findMany({ where, include: productCardInclude, orderBy, take: opts.take });
  if (opts.sort === "price_asc") products.sort((a, b) => minPrice(a) - minPrice(b));
  if (opts.sort === "price_desc") products.sort((a, b) => minPrice(b) - minPrice(a));
  return products;
}
