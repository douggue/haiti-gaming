import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatMoney } from "@/lib/money";
import { shortName } from "@/lib/trust";
import { listingImages, unreadChats } from "@/lib/market-data";

export default async function Messages({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const [t, fmt] = await Promise.all([getTranslations("chat"), getFormatter()]);
  const [chats, unread] = await Promise.all([
    prisma.marketChat.findMany({
      where: { OR: [{ buyerId: user.id }, { sellerId: user.id }], messages: { some: {} } },
      orderBy: { lastAt: "desc" },
      take: 100,
      include: {
        listing: { select: { title: true, images: true, price: true, currency: true } },
        buyer: { select: { name: true } },
        seller: { select: { name: true, marketVendor: { select: { shopName: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    unreadChats(user.id),
  ]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
      </div>
      {chats.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-3xl" aria-hidden>💬</p>
          <p className="mt-2 text-muted">{t("none")}</p>
          <Link href="/market" className="btn-primary mt-4">{t("browse")}</Link>
        </div>
      ) : (
        <ul className="card divide-y divide-border overflow-hidden">
          {chats.map((c) => {
            const buyer = c.buyerId === user.id;
            const other = buyer ? (c.seller.marketVendor?.shopName ?? shortName(c.seller.name)) : shortName(c.buyer.name);
            const m = c.messages[0];
            const preview = !m ? "" : m.kind === "OFFER" ? `💰 ${formatMoney(m.offerAmount ?? 0, c.listing.currency, locale)}` : m.kind === "IMAGE" && !m.body ? `📷 ${t("photo")}` : m.fromStaff ? `🛡️ ${m.body}` : m.body;
            const isNew = unread.get(c.id) ?? 0;
            return (
              <li key={c.id}>
                <Link href={`/account/messages/${c.id}`} className="flex items-center gap-3 p-4 hover:bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={listingImages(c.listing.images)[0]} alt="" className="size-12 shrink-0 rounded-xl bg-surface-2 object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <b className="truncate text-sm">{other}</b>
                      <span className="shrink-0 text-[11px] text-muted">{Date.now() - c.lastAt.getTime() < 86_400_000 ? fmt.dateTime(c.lastAt, { timeStyle: "short" }) : fmt.dateTime(c.lastAt, { dateStyle: "short" })}</span>
                    </span>
                    <span className="block truncate text-xs text-muted">{buyer ? t("youBuy") : t("youSell")} · {c.listing.title}</span>
                    <span className={`block truncate text-sm ${isNew ? "font-semibold" : "text-muted"}`}>{preview}</span>
                  </span>
                  {isNew > 0 && <span className="grid min-w-6 shrink-0 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-white" aria-label={t("unreadCount", { n: isNew })}>{isNew}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
