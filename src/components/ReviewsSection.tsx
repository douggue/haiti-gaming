import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { cityFlag } from "@/lib/cities";
import { t } from "@/lib/text";
import { Avatar } from "./Avatar";

/** Homepage reviews: approved reviews staff ticked "On homepage" in Admin → Trust. Nothing is shown until there is one. */
export async function ReviewsSection({ locale }: { locale: string }) {
  const [tr, reviews, stats] = await Promise.all([
    getTranslations("trust"),
    prisma.review.findMany({
      where: { status: "approved", onHome: true, quote: { not: "" } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { product: { select: { name: true } } },
    }),
    prisma.review.aggregate({ where: { status: "approved" }, _avg: { rating: true }, _count: true }),
  ]);
  if (!reviews.length) return null;
  const avg = (stats._avg.rating ?? 5).toFixed(1).replace(".", locale === "en" ? "." : ",");
  return (
    <section className="container-page mt-16">
      <div className="flex flex-col items-center text-center">
        <span className="eyebrow link-accent text-primary">{tr("reviewsEyebrow")}</span>
        <h2 className="display mt-3 text-3xl font-bold leading-tight sm:text-4xl">
          {tr("reviewsTitle")} <span className="text-primary">{tr("reviewsTitleAccent")}</span>
        </h2>
        <p className="mt-2 text-sm text-muted">{tr("reviewsSummary", { avg, count: stats._count })}</p>
      </div>
      {/* Phones: a sideways scroller (one card and a peek of the next); computers: a grid */}
      <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3">
        {reviews.map((r) => (
          <figure key={r.id} className="card flex w-[85%] shrink-0 snap-start flex-col gap-3 p-5 sm:p-6 md:w-auto">
            <div className="flex items-center justify-between gap-2">
              <span className="text-lg tracking-[2px] text-[#ffc53d]" aria-label={tr("starsN", { n: r.rating })}>
                {"★".repeat(r.rating)}
                <span className="text-border">{"★".repeat(5 - r.rating)}</span>
              </span>
              {r.product && <span className="truncate rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-bold text-muted">{t(r.product.name, locale)}</span>}
            </div>
            <blockquote className="flex-1 text-[15px] leading-relaxed">“{r.quote}”</blockquote>
            <figcaption className="flex items-center gap-3">
              <Avatar name={r.name} size={40} />
              <span className="min-w-0">
                <b className="block">{r.name}</b>
                <span className="text-sm text-muted">
                  {r.city && <>{cityFlag(r.city)} {r.city} · </>}
                  <span className="text-success">✓ {r.source === "order" ? tr("verifiedOrder") : tr("verifiedCustomer")}</span>
                </span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
