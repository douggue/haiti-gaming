import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { can } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";
import { platformOf } from "@/lib/market";
import { formatPhone, waNumber } from "@/lib/phone";
import { staffChatMessage } from "@/actions/market-chat";
import { ActionForm } from "@/components/admin/ActionButton";
import { PageTitle } from "@/components/admin/ui";
import { LiveRefresh } from "@/components/LiveRefresh";
import { realtimeConfig } from "@/lib/realtime";

export const metadata = { title: "Market chat" };

/** Staff view of a buyer ↔ seller chat: everything as typed (hidden contact details too), and a box to write as the agent. */
export default async function AdminChat({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff("orders.view");
  const { id } = await params;
  const chat = await prisma.marketChat.findUnique({
    where: { id },
    include: {
      listing: { select: { id: true, title: true, platform: true, price: true, currency: true, status: true } },
      buyer: { select: { id: true, name: true, email: true, phone: true } },
      seller: { select: { id: true, name: true, email: true, phone: true, marketVendor: { select: { shopName: true, whatsapp: true } } } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!chat) notFound();
  const money = (n: number) => formatMoney(n, chat.listing.currency, "en");
  const who = (authorId: string | null, fromStaff: boolean, name?: string) => (fromStaff ? `Agent (${name ?? "staff"})` : authorId === chat.buyerId ? "Buyer" : "Seller");
  const sellerPhone = chat.seller.marketVendor?.whatsapp ?? chat.seller.phone;
  const live = realtimeConfig();
  return (
    <>
      {live && <LiveRefresh config={live} channel={`private-chat-${chat.id}`} />}
      <PageTitle
        title={`${platformOf(chat.listing.platform).icon} ${chat.listing.title}`}
        sub={`Listed ${money(chat.listing.price)}${chat.agreedPrice ? ` · offer accepted at ${money(chat.agreedPrice)}` : ""} · ${chat.listing.status}`}
        actions={<Link href="/admin/market?tab=chats" className="btn-secondary min-h-9 px-3 text-xs">← Chats</Link>}
      />
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <section className="card space-y-2 p-4">
          {chat.messages.length === 0 && <p className="text-sm text-muted">No messages.</p>}
          {chat.messages.map((m) => (
            <div key={m.id} className={`rounded-xl p-3 text-sm ${m.fromStaff ? "border border-primary/40 bg-primary/10" : m.authorId === chat.buyerId ? "bg-surface-2" : "bg-surface-2/50"}`}>
              <p className="text-xs text-muted"><b>{who(m.authorId, m.fromStaff, m.author?.name)}</b> · {m.createdAt.toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}</p>
              {m.kind === "OFFER" && <p className="font-semibold">💰 Offer {money(m.offerAmount ?? 0)} · {m.offerStatus}</p>}
              {m.imagePath && (
                <a href={`/api/market-chat/image/${m.id}`} target="_blank" rel="noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/market-chat/image/${m.id}`} alt="" className="mt-1 max-h-48 rounded-lg" />
                </a>
              )}
              {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
              {m.original && <p className="mt-1 rounded-lg bg-warning-soft px-2 py-1 text-xs text-warning">⚠ Typed (hidden from the other side): {m.original}</p>}
            </div>
          ))}
          {can(staff, "orders.manage") && (
            <ActionForm action={staffChatMessage.bind(null, chat.id)} resetOnSuccess className="space-y-2 border-t border-border pt-3">
              <textarea name="text" rows={3} maxLength={1000} required placeholder="Write as the Haiti Gaming agent (buyer and seller both see it)" className="input py-2" />
              <button className="btn-primary min-h-10">Send as agent</button>
            </ActionForm>
          )}
        </section>
        <section className="card h-fit space-y-2 p-4 text-sm">
          <h2 className="font-semibold">People</h2>
          <p><span className="text-muted">Buyer:</span> <Link href={`/admin/customers/${chat.buyer.id}`} className="text-primary">{chat.buyer.name}</Link> · {chat.buyer.email}{chat.buyer.phone && <> · <a href={`https://wa.me/${waNumber(chat.buyer.phone)}`} target="_blank" rel="noopener" className="text-[#1fa855]">{formatPhone(chat.buyer.phone)} ↗</a></>}</p>
          <p><span className="text-muted">Seller:</span> <Link href={`/admin/customers/${chat.seller.id}`} className="text-primary">{chat.seller.marketVendor?.shopName ?? chat.seller.name}</Link> · {chat.seller.email}{sellerPhone && <> · <a href={`https://wa.me/${waNumber(sellerPhone)}`} target="_blank" rel="noopener" className="text-[#1fa855]">{formatPhone(sellerPhone)} ↗</a></>}</p>
          <Link href={`/ht/market/${chat.listing.id}`} target="_blank" className="btn-secondary min-h-9 px-3 text-xs">Open listing ↗</Link>
        </section>
      </div>
    </>
  );
}
