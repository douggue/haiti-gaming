import { getLocale, getTranslations } from "next-intl/server";
import { minPrice, type ProductWithVariants } from "@/lib/catalog";
import { t } from "@/lib/text";
import { GameCard } from "./GameCard";
import { ProductArt } from "./ProductArt";

export { ProductArt };

export async function ProductCard({ product }: { product: ProductWithVariants }) {
  const locale = await getLocale();
  const tr = await getTranslations("common");
  const tp = await getTranslations("product");
  const name = t(product.name, locale);
  const onSale = product.variants.some((v) => v.salePriceHtg);
  return (
    <GameCard
      slug={product.slug}
      name={name}
      image={product.image}
      accent={product.accent}
      tags={product.tags ?? []}
      onSale={onSale}
      instant={product.fulfillmentType === "CODE_INVENTORY"}
      delivery={t(product.deliveryEstimate, locale)}
      price={minPrice(product)}
      soldOut={product.variants.length > 0 && product.variants.every((v) => v.soldOut || v.stock === 0)}
      labels={{ from: tr("from"), choose: tr("choose"), soldOut: tp("soldOut"), instant: tp("instantShort") }}
    />
  );
}
