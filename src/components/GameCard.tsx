import { Link } from "@/i18n/navigation";
import { Price } from "./Money";
import { BoltIcon } from "./Icons";
import { ProductArt } from "./ProductArt";

export type GameCardLabels = { from: string; choose: string; soldOut: string; instant: string };

/**
 * Product card (homepage, store, categories): picture with badges, name, delivery line,
 * then "From" + bold price and a compact Choose button. Labels come from the caller so this works on both
 * server pages and the live-filtering store.
 */
export function GameCard({
  slug, name, image, accent, tags, onSale, instant, delivery, price, soldOut, labels, fav,
}: {
  slug: string;
  name: string;
  image: string | null;
  accent: string | null;
  tags: string[];
  onSale: boolean;
  instant: boolean;
  delivery: string;
  price: number;
  soldOut: boolean;
  labels: GameCardLabels;
  /** Star button (store only), drawn top-left over the picture */
  fav?: React.ReactNode;
}) {
  return (
    <Link href={`/products/${slug}`} className="game-card lift group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-2.5 transition-shadow sm:p-3">
      <div className="relative overflow-hidden rounded-xl">
        <div className="transition-transform duration-300 group-hover:scale-[1.04]">
          <ProductArt name={name} accent={accent} image={image} />
        </div>
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
        {tags[0] && <span className="absolute bottom-1.5 left-1.5 max-w-[calc(100%-3.5rem)] truncate rounded-md bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">{tags.slice(0, 2).join(" · ")}</span>}
        {onSale && <span className="absolute bottom-1.5 right-1.5 rounded-md bg-red-600 px-1.5 py-0.5 text-[11px] font-extrabold text-white shadow">−%</span>}
        {fav}
      </div>
      <div className="flex flex-1 flex-col px-0.5 pt-3">
        <h3 className="display line-clamp-2 text-[15px] font-bold leading-snug">{name}</h3>
        {/* Delivery line under the name (the art stays clear): instant in green, otherwise the estimate */}
        {instant ? (
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-emerald-400"><BoltIcon width={13} height={13} /> {labels.instant}</p>
        ) : delivery ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted">{delivery}</p>
        ) : null}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="min-w-0 leading-tight">
            <span className="block text-xs text-muted">{labels.from}</span>
            <Price htg={price} className="display block whitespace-nowrap text-[15px] font-extrabold text-text sm:text-lg" />
          </p>
          {soldOut ? (
            <span className="shrink-0 rounded-lg bg-surface-2 px-2.5 py-2 text-xs font-bold text-danger">{labels.soldOut}</span>
          ) : (
            /* The whole card is the link: a round arrow shows it, so the price never has to wrap beside a button */
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-white transition-transform group-hover:translate-x-0.5" title={labels.choose}>
              <span className="sr-only">{labels.choose}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m9 6 6 6-6 6" /></svg>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
