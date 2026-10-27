import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { can, isStaff } from "@/lib/permissions";
import { realtime } from "@/lib/realtime";

/** Lets the browser listen to a private channel: its own user channel, or a Market chat it is part of (staff: any chat). */
export async function POST(req: Request) {
  const pusher = realtime();
  const user = await getUser();
  if (!pusher || !user) return new NextResponse("Forbidden", { status: 403 });
  const form = await req.formData();
  const socketId = String(form.get("socket_id") ?? "");
  const channel = String(form.get("channel_name") ?? "");
  if (!/^\d+\.\d+$/.test(socketId)) return new NextResponse("Bad request", { status: 400 });

  let ok = false;
  if (channel === `private-user-${user.id}`) ok = true;
  else if (channel.startsWith("private-chat-")) {
    const chat = await prisma.marketChat.findUnique({ where: { id: channel.slice("private-chat-".length) }, select: { buyerId: true, sellerId: true } });
    if (chat && (chat.buyerId === user.id || chat.sellerId === user.id)) ok = true;
    else if (chat && isStaff(user.role) && user.twoFactorEnabled) {
      ok = user.role === "CUSTOM" ? !!(await prisma.user.findUnique({ where: { id: user.id }, include: { customRole: true } }))?.customRole?.permissions.includes("orders.view") : can(user.role, "orders.view");
    }
  }
  if (!ok) return new NextResponse("Forbidden", { status: 403 });
  return NextResponse.json(pusher.authorizeChannel(socketId, channel));
}
