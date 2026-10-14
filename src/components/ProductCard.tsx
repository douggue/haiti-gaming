import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { minPrice, type ProductWithVariants } from "@/lib/catalog";
import { t } from "@/lib/text";
import { Price } from "./Money";
import { BoltIcon } from "./Icons";

/** Original artwork: an accent-colored tile with the product's initials, so no third-party imagery is needed. */
export function ProductArt({ name, accent, size = "md" }: { name: string; accent?: string | null; size?: "md" | "lg" }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const color = accent ?? "#1467F5";
  return (
    <div
      className={`relative grid place-items-center overflow-hidden ${size === "lg" ? "aspect-[4/3] rounded-3xl" : "aspect-[4/3] rounded-xl"}`}
      style={{ background: `linear-gradient(135deg, ${color} 0%, #0D1B35 100%)` }}
      aria-hidden
    >
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/5" />
      <span className={`font-black tracking-tight text-white drop-shadow ${size === "lg" ? "text-6xl" : "text-3xl"}`}>{initials}</span>
    </div>
  );
}

export async function ProductCard({ product }: { product: ProductWithVariants }) {
  const locale = await getLocale();
  const tr = await getTranslations("common");
  const tp = await getTranslations("product");
  const name = t(product.name, locale);
  const onSale = product.variants.some((v) => v.salePriceHtg);
  return (
    <Link href={`/products/${product.slug}`} className="card lift group flex flex-col p-3">
      <div className="relative">
        <ProductArt name={name} accent={product.accent} />
        {onSale && <span className="badge absolute left-2 top-2 bg-danger text-white">−%</span>}
      </div>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
        <h3 className="line-clamp-2 font-semibold leading-snug">{name}</h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
          {product.fulfillmentType === "CODE_INVENTORY" ? (
            <><BoltIcon width={13} height={13} className="text-success" /> {tp("instant")}</>
          ) : (
            t(product.deliveryEstimate, locale)
          )}
        </p>
        <p className="mt-auto pt-3 text-sm">
          <span className="text-muted">{tr("from")} </span>
          <Price htg={minPrice(product)} className="font-bold text-text" />
        </p>
      </div>
    </Link>
  );
}
