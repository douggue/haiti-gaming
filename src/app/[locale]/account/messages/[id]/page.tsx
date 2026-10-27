import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { shortName } from "@/lib/trust";
import { listingImages } from "@/lib/market-data";
import { rulesAccepted } from "@/lib/market-rules";
import { ChatRoom } from "@/components/market/ChatRoom";

export default async function ChatPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const chat = await prisma.marketChat.findUnique({
    where: { id },
    include: {
      listing: { select: { id: true, title: true, price: true, currency: true, images: true, status: true } },
      buyer: { select: { name: true } },
      seller: { select: { name: true, marketVendor: { select: { shopName: true } } } },
      messages: { orderBy: { createdAt: "asc" }, take: 300 },
    },
  });
  if (!chat || (chat.buyerId !== user.id && chat.sellerId !== user.id)) notFound();
  const role = chat.buyerId === user.id ? "buyer" : "seller";
  // The "new messages" line goes above the first message that arrived since the person last looked.
  const readBefore = role === "buyer" ? chat.buyerReadAt : chat.sellerReadAt;
  const firstUnread = chat.messages.find((m) => (m.authorId !== user.id || m.fromStaff) && (!readBefore || m.createdAt > readBefore));
  const otherReadAt = role === "buyer" ? chat.sellerReadAt : chat.buyerReadAt;
  const now = new Date();
  await prisma.$transaction([
    prisma.marketChat.update({ where: { id }, data: role === "buyer" ? { buyerReadAt: now } : { sellerReadAt: now } }),
    prisma.notification.updateMany({ where: { userId: user.id, link: `/account/messages/${id}`, readAt: null }, data: { readAt: now } }),
  ]);
  const [settings, me] = await Promise.all([getSettings(), prisma.user.findUnique({ where: { id: user.id }, select: { marketRulesAt: true } })]);
  return (
    <ChatRoom
      chatId={chat.id}
      role={role}
      otherName={role === "buyer" ? (chat.seller.marketVendor?.shopName ?? shortName(chat.seller.name)) : shortName(chat.buyer.name)}
      listing={{ id: chat.listing.id, title: chat.listing.title, price: chat.listing.price, currency: chat.listing.currency, image: listingImages(chat.listing.images)[0] ?? null, status: chat.listing.status }}
      agreedPrice={chat.agreedPrice}
      firstUnreadId={firstUnread?.id ?? null}
      otherReadAt={otherReadAt?.toISOString() ?? null}
      rulesAccepted={rulesAccepted(me?.marketRulesAt, settings)}
      initial={chat.messages.map((m) => ({
        id: m.id,
        kind: m.kind as "TEXT",
        body: m.body,
        image: m.imagePath ? `/api/market-chat/image/${m.id}` : null,
        offerAmount: m.offerAmount,
        offerStatus: m.offerStatus,
        mine: m.authorId === user.id && !m.fromStaff,
        fromStaff: m.fromStaff,
        hidden: !!m.original,
        at: m.createdAt.toISOString(),
      }))}
    />
  );
}
