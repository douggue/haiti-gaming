"use server";
import { prisma } from "@/lib/db";
import { assertStaff, assertUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import { notify } from "@/lib/notify";
import { parseAmount } from "@/lib/money";
import { redactContacts } from "@/lib/market-chat";
import { savePrivateImage, uploadsEnabled, UploadError } from "@/lib/storage";
import { chatChannel, publish, userChannel } from "@/lib/realtime";
import { systemLine } from "@/lib/market-chat-ops";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };
/** Known problems come back as a short code; anything unexpected is logged with a reference shown to the customer. */
const fail = (e: unknown): { ok: false; error: string } => {
  if (e instanceof Error && /^[a-z_]+$/.test(e.message)) return { ok: false, error: e.message };
  const ref = Math.random().toString(36).slice(2, 8).toUpperCase();
  console.error(`market chat failed [${ref}]`, e);
  return { ok: false, error: `error:${ref}` };
};

export type ChatMessage = {
  id: string;
  kind: "TEXT" | "IMAGE" | "OFFER" | "SYSTEM";
  body: string;
  image: string | null;
  offerAmount: number | null;
  offerStatus: string | null;
  mine: boolean;
  fromStaff: boolean;
  hidden: boolean;
  at: string;
};

// One sender can't flood a chat: 20 messages a minute (per server).
const hits = new Map<string, number[]>();
function tooFast(userId: string) {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < 60_000);
  hits.set(userId, [...recent, now]);
  if (hits.size > 5000) hits.clear();
  return recent.length >= 20;
}

/** The chat, if the signed-in person is its buyer or seller. */
async function myChat(chatId: string) {
  const user = await assertUser();
  const chat = await prisma.marketChat.findUnique({ where: { id: String(chatId).slice(0, 40) }, include: { listing: { select: { id: true, title: true, status: true, currency: true, price: true } } } });
  if (!chat || (chat.buyerId !== user.id && chat.sellerId !== user.id)) throw new Error("not_found");
  return { user, chat, role: chat.buyerId === user.id ? ("buyer" as const) : ("seller" as const) };
}

function toDto(m: { id: string; kind: string; body: string; imagePath: string | null; offerAmount: number | null; offerStatus: string | null; authorId: string | null; fromStaff: boolean; original: string | null; createdAt: Date }, me: string): ChatMessage {
  return {
    id: m.id,
    kind: m.kind as ChatMessage["kind"],
    body: m.body,
    image: m.imagePath ? `/api/market-chat/image/${m.id}` : null,
    offerAmount: m.offerAmount,
    offerStatus: m.offerStatus,
    mine: m.authorId === me && !m.fromStaff,
    fromStaff: m.fromStaff,
    hidden: !!m.original,
    at: m.createdAt.toISOString(),
  };
}

/**
 * Tell people about a new message: not while they have the chat open (seen in the last 12 s),
 * and only once per unread batch (no new notification while the previous one is still unread).
 */
async function ping(chat: { id: string; listing: { title: string } }, to: { id: string; readAt: Date | null }[]) {
  const link = `/account/messages/${chat.id}`;
  // Instant: the open chat redraws, and the recipients' header counters update on any page.
  await publish([chatChannel(chat.id), ...to.map((r) => userChannel(r.id))], "update");
  for (const r of to) {
    if (r.readAt && Date.now() - r.readAt.getTime() < 12_000) continue;
    if (await prisma.notification.findFirst({ where: { userId: r.id, link, readAt: null }, select: { id: true } })) continue;
    await notify(r.id, "market_message", { title: chat.listing.title }, link);
  }
}

/** Opening a chat also clears its notifications. */
async function markSeen(chatId: string, role: "buyer" | "seller", userId: string, before?: { readAt: Date | null; lastAt: Date }) {
  const now = new Date();
  await prisma.$transaction([
    prisma.marketChat.update({ where: { id: chatId }, data: role === "buyer" ? { buyerReadAt: now } : { sellerReadAt: now } }),
    prisma.notification.updateMany({ where: { userId, link: `/account/messages/${chatId}`, readAt: null }, data: { readAt: now } }),
  ]);
  // The other side's ✓ turns into ✓✓ right away (only when there was something new to read; after saving).
  if (before && (!before.readAt || before.lastAt > before.readAt)) await publish(chatChannel(chatId), "read", { role });
}

/** Online dot: remember when the person was last active (at most one write every 20 s). */
async function touch(userId: string) {
  await prisma.user.updateMany({ where: { id: userId, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: new Date(Date.now() - 20_000) } }] }, data: { lastSeenAt: new Date() } });
}

/** "Ekri machann nan": opens (or reopens) the buyer's chat with the seller about a listing. */
export async function openChat(listingId: string): Promise<R<{ id: string }>> {
  try {
    const user = await assertUser();
    const s = await getSettings();
    if (!s.marketEnabled) return { ok: false, error: "closed" };
    const l = await prisma.marketListing.findUnique({ where: { id: String(listingId).slice(0, 40) }, select: { id: true, sellerId: true, status: true } });
    if (!l || !["ACTIVE", "RESERVED"].includes(l.status)) return { ok: false, error: "unavailable" };
    if (l.sellerId === user.id) return { ok: false, error: "own" };
    const chat = await prisma.marketChat.upsert({ where: { listingId_buyerId: { listingId: l.id, buyerId: user.id } }, create: { listingId: l.id, buyerId: user.id, sellerId: l.sellerId }, update: {} });
    return { ok: true, id: chat.id };
  } catch (e) {
    return fail(e);
  }
}

/** New messages since `after` (ISO), and marks the chat as read. */
export type ChatState = { closed: boolean; reopenPending: boolean; agentCalled: boolean; otherSeenAt: string | null };

export async function chatUpdates(chatId: string, after?: string): Promise<R<{ messages: ChatMessage[]; agreedPrice: number | null; listingStatus: string; otherReadAt: string | null; state: ChatState }>> {
  try {
    const { user, chat, role } = await myChat(chatId);
    const since = after ? new Date(after) : null;
    const rows = await prisma.marketMessage.findMany({
      where: { chatId: chat.id, ...(since && !isNaN(+since) ? { OR: [{ createdAt: { gt: since } }, { kind: "OFFER" }] } : {}) },
      orderBy: { createdAt: "asc" },
      take: 300,
    });
    await markSeen(chat.id, role, user.id, { readAt: role === "buyer" ? chat.buyerReadAt : chat.sellerReadAt, lastAt: chat.lastAt });
    await touch(user.id);
    const other = role === "buyer" ? chat.sellerReadAt : chat.buyerReadAt;
    const seen = await prisma.user.findUnique({ where: { id: role === "buyer" ? chat.sellerId : chat.buyerId }, select: { lastSeenAt: true } });
    return {
      ok: true,
      messages: rows.map((m) => toDto(m, user.id)),
      agreedPrice: chat.agreedPrice,
      listingStatus: chat.listing.status,
      otherReadAt: other?.toISOString() ?? null,
      state: { closed: !!chat.closedAt, reopenPending: !!chat.reopenAt, agentCalled: !!chat.agentCalledAt, otherSeenAt: seen?.lastSeenAt?.toISOString() ?? null },
    };
  } catch (e) {
    return fail(e);
  }
}

/** Text and/or one photo. Phone numbers, emails and links are hidden (staff still sees the original). */
export async function sendChatMessage(chatId: string, form: FormData): Promise<R> {
  try {
    const { user, chat, role } = await myChat(chatId);
    if (chat.closedAt) return { ok: false, error: "chat_closed" };
    if (tooFast(user.id)) return { ok: false, error: "too_fast" };
    const text = String(form.get("text") ?? "").trim().slice(0, 1000);
    const file = form.get("image");
    const hasFile = file instanceof File && file.size > 0;
    if (!text && !hasFile) return { ok: false, error: "empty" };
    let imagePath: string | null = null;
    if (hasFile) {
      if (!uploadsEnabled()) return { ok: false, error: "upload" };
      try {
        imagePath = await savePrivateImage(file, "market-chat");
      } catch (e) {
        if (e instanceof UploadError) return { ok: false, error: "upload" };
        throw e;
      }
    }
    const r = redactContacts(text);
    await prisma.$transaction([
      prisma.marketMessage.create({ data: { chatId: chat.id, authorId: user.id, kind: imagePath ? "IMAGE" : "TEXT", body: r.body, original: r.hidden ? text : null, imagePath } }),
      prisma.marketChat.update({ where: { id: chat.id }, data: { lastAt: new Date(), ...(role === "buyer" ? { buyerReadAt: new Date() } : { sellerReadAt: new Date() }) } }),
    ]);
    await ping(chat, [role === "buyer" ? { id: chat.sellerId, readAt: chat.sellerReadAt } : { id: chat.buyerId, readAt: chat.buyerReadAt }]);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Buyer proposes a price (listing currency). A new offer replaces an unanswered one. */
export async function makeOffer(chatId: string, amount: string): Promise<R> {
  try {
    const { user, chat, role } = await myChat(chatId);
    if (role !== "buyer") return { ok: false, error: "not_buyer" };
    if (chat.closedAt) return { ok: false, error: "chat_closed" };
    if (chat.listing.status !== "ACTIVE") return { ok: false, error: "unavailable" };
    const minor = parseAmount(amount);
    if (!minor || minor < 100 || minor > chat.listing.price * 2) return { ok: false, error: "offer_amount" };
    await prisma.$transaction([
      prisma.marketMessage.updateMany({ where: { chatId: chat.id, kind: "OFFER", offerStatus: "PENDING" }, data: { offerStatus: "DECLINED" } }),
      prisma.marketMessage.create({ data: { chatId: chat.id, authorId: user.id, kind: "OFFER", offerAmount: minor, offerStatus: "PENDING" } }),
      prisma.marketChat.update({ where: { id: chat.id }, data: { lastAt: new Date(), buyerReadAt: new Date() } }),
    ]);
    await ping(chat, [{ id: chat.sellerId, readAt: chat.sellerReadAt }]);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Seller accepts or declines. An accepted offer becomes the price when the buyer taps Buy. */
export async function answerOffer(messageId: string, accept: boolean): Promise<R> {
  try {
    const user = await assertUser();
    const m = await prisma.marketMessage.findUnique({ where: { id: String(messageId).slice(0, 40) }, include: { chat: { include: { listing: { select: { title: true, status: true } } } } } });
    if (!m || m.kind !== "OFFER" || m.chat.sellerId !== user.id) return { ok: false, error: "not_found" };
    if (m.offerStatus !== "PENDING") return { ok: false, error: "answered" };
    if (m.chat.closedAt) return { ok: false, error: "chat_closed" };
    if (accept && m.chat.listing.status !== "ACTIVE") return { ok: false, error: "unavailable" };
    await prisma.$transaction([
      prisma.marketMessage.update({ where: { id: m.id }, data: { offerStatus: accept ? "ACCEPTED" : "DECLINED" } }),
      ...(accept ? [prisma.marketChat.update({ where: { id: m.chatId }, data: { agreedPrice: m.offerAmount } })] : []),
      prisma.marketChat.update({ where: { id: m.chatId }, data: { lastAt: new Date(), sellerReadAt: new Date() } }),
    ]);
    await publish([chatChannel(m.chatId), userChannel(m.chat.buyerId)], "update");
    await notify(m.chat.buyerId, accept ? "market_offer_accepted" : "market_offer_declined", { title: m.chat.listing.title }, `/account/messages/${m.chatId}`);
    await audit(user.id, accept ? "market.offer.accept" : "market.offer.decline", "MarketMessage", m.id, { amount: m.offerAmount });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** "… is typing": shown to the other side for a few seconds (the browser sends it at most every 3 s). */
export async function chatTyping(chatId: string): Promise<void> {
  try {
    const { role } = await myChat(chatId);
    await publish(chatChannel(chatId), "typing", { role });
  } catch {}
}

/** Staff writes in a chat as the Haiti Gaming agent. */
export async function staffChatMessage(chatId: string, form: FormData): Promise<{ ok: true; message?: string } | { ok: false; error: string }> {
  try {
    const staff = await assertStaff("orders.manage");
    const text = String(form.get("text") ?? "").trim().slice(0, 1000);
    if (!text) return { ok: false, error: "Write a message" };
    const chat = await prisma.marketChat.findUniqueOrThrow({ where: { id: chatId }, include: { listing: { select: { title: true } } } });
    await prisma.$transaction([
      prisma.marketMessage.create({ data: { chatId, authorId: staff.id, kind: "TEXT", body: text, fromStaff: true } }),
      prisma.marketChat.update({ where: { id: chatId }, data: { lastAt: new Date(), agentCalledAt: null } }),
    ]);
    await ping(chat, [
      { id: chat.buyerId, readAt: chat.buyerReadAt },
      { id: chat.sellerId, readAt: chat.sellerReadAt },
    ]);
    await audit(staff.id, "market.chat.staff_message", "MarketChat", chatId);
    return { ok: true, message: "Sent" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unexpected error" };
  }
}

/** "Rele ajan an": asks a staff member to join the chat (shown in Admin → Market → Chats). */
export async function callAgent(chatId: string): Promise<R> {
  try {
    const { chat, role } = await myChat(chatId);
    if (chat.agentCalledAt && Date.now() - chat.agentCalledAt.getTime() < 10 * 60_000) return { ok: false, error: "agent_already" };
    await prisma.marketChat.update({ where: { id: chat.id }, data: { agentCalledAt: new Date() } });
    await systemLine(chat.id, role === "buyer" ? "agent_called_buyer" : "agent_called_seller");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** After a deal, the chat is closed; buyer or seller can ask staff to reopen it, with a reason. */
export async function requestReopen(chatId: string, reason: string): Promise<R> {
  try {
    const { user, chat } = await myChat(chatId);
    if (!chat.closedAt) return { ok: false, error: "not_closed" };
    if (chat.reopenAt) return { ok: false, error: "reopen_pending" };
    const text = reason.trim().slice(0, 500);
    if (text.length < 5) return { ok: false, error: "reason" };
    await prisma.marketChat.update({ where: { id: chat.id }, data: { reopenReason: text, reopenById: user.id, reopenAt: new Date() } });
    await systemLine(chat.id, "reopen_requested");
    await audit(user.id, "market.chat.reopen_request", "MarketChat", chat.id, { reason: text });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Staff: approve (chat open again) or refuse a reopen request. */
export async function decideReopen(chatId: string, approve: boolean): Promise<{ ok: true; message?: string } | { ok: false; error: string }> {
  try {
    const staff = await assertStaff("orders.manage");
    const chat = await prisma.marketChat.findUniqueOrThrow({ where: { id: chatId }, include: { listing: { select: { title: true } } } });
    if (!chat.reopenAt) return { ok: false, error: "No request to answer" };
    await prisma.marketChat.update({ where: { id: chatId }, data: { reopenAt: null, reopenReason: null, reopenById: null, ...(approve ? { closedAt: null } : {}) } });
    await systemLine(chatId, approve ? "reopened" : "reopen_refused");
    for (const uid of [chat.buyerId, chat.sellerId]) await notify(uid, approve ? "market_chat_reopened" : "market_chat_reopen_refused", { title: chat.listing.title }, `/account/messages/${chatId}`);
    await audit(staff.id, approve ? "market.chat.reopen" : "market.chat.reopen_refuse", "MarketChat", chatId);
    return { ok: true, message: approve ? "Chat reopened" : "Request refused" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unexpected error" };
  }
}
