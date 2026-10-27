import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { can, isStaff } from "@/lib/permissions";
import { imageContentType, readPrivateFile } from "@/lib/storage";

/** Market chat photos: the buyer and seller of that chat, and staff who handle Market deals. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return new NextResponse("Forbidden", { status: 403 });
  const { id } = await params;
  const m = await prisma.marketMessage.findUnique({ where: { id }, select: { imagePath: true, chat: { select: { buyerId: true, sellerId: true } } } });
  if (!m?.imagePath) return new NextResponse("Not found", { status: 404 });
  const party = m.chat.buyerId === user.id || m.chat.sellerId === user.id;
  const staffOk =
    isStaff(user.role) &&
    !!user.twoFactorEnabled &&
    (user.role === "CUSTOM" ? (await prisma.user.findUnique({ where: { id: user.id }, include: { customRole: true } }))?.customRole?.permissions.includes("orders.view") : can(user.role, "orders.view"));
  if (!party && !staffOk) return new NextResponse("Forbidden", { status: 403 });
  const buf = await readPrivateFile(m.imagePath);
  return new NextResponse(new Uint8Array(buf), { headers: { "content-type": imageContentType(buf), "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff" } });
}
