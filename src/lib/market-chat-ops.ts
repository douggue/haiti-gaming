import "server-only";
import { prisma } from "@/lib/db";
import { chatChannel, publish } from "@/lib/realtime";

/** A line written by the site itself in a Market chat (shown translated as chat.sys_<code>). */
export async function systemLine(chatId: string, code: string) {
  await prisma.$transaction([
    prisma.marketMessage.create({ data: { chatId, kind: "SYSTEM", body: code } }),
    prisma.marketChat.update({ where: { id: chatId }, data: { lastAt: new Date() } }),
  ]);
  await publish(chatChannel(chatId), "update");
}

/** Deal finished: every chat about the account closes (buyer or seller can ask staff to reopen it). */
export async function closeChatsFor(listingId: string) {
  const chats = await prisma.marketChat.findMany({ where: { listingId, closedAt: null }, select: { id: true } });
  for (const c of chats) {
    await prisma.marketChat.update({ where: { id: c.id }, data: { closedAt: new Date() } });
    await systemLine(c.id, "closed");
  }
}
