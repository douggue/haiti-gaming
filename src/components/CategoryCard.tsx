import Image from "next/image";
import { Link } from "@/i18n/navigation";

/**
 * Category card (Admin → Products → categories):
 * - cover: big picture filling the whole card, with a dark fade so the white name stays readable
 * - no cover: a calm surface card with the small picture (or the category's icon) in a tinted tile
 */
export function CategoryCard({
  href, name, count, cover, image, icon, sub,
}: { href: string; name: string; count: string; cover?: string | null; image?: string | null; icon?: string | null; index?: number; sub?: string }) {
  return (
    <Link
      href={href}
      className={`${cover ? "on-dark ds-art bg-[#0f1626] " : "border border-border bg-gradient-to-br from-surface-2 to-surface "}lift animate-rise group relative flex min-h-[8.25rem] flex-col justify-between overflow-hidden rounded-2xl p-3 sm:aspect-[16/10] sm:min-h-0 sm:p-5`}
    >
      {cover ? (
        <>
          <Image src={cover} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" quality={70} className="object-cover transition-transform duration-500 group-hover:scale-105" />
          {/* Dark fade from the bottom so the white name stays readable on any picture */}
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          <span aria-hidden />
        </>
      ) : (
        <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-primary-soft text-2xl sm:h-12 sm:w-12" aria-hidden>
          {image ? <Image src={image} alt="" fill sizes="48px" className="object-cover" /> : icon || "🎮"}
        </span>
      )}
      <span className={`relative min-w-0 ${cover ? "text-white" : ""}`}>
        <span className="display block text-sm font-bold leading-tight sm:text-xl">{name}</span>
        <span className={`mt-0.5 block text-xs font-medium sm:text-sm ${cover ? "text-white/85" : "text-muted"}`}>{count}</span>
        {sub && <span className={`mt-1 hidden truncate text-xs sm:block ${cover ? "text-white/80" : "text-muted"}`}>{sub}</span>}
      </span>
    </Link>
  );
}
