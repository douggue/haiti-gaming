import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyMoncashIntent } from "@/lib/payments/verify";
import { releaseHold } from "@/lib/wallet";
import { notify } from "@/lib/notify";

/**
 * Scheduled maintenance (call every 5–10 minutes with `Authorization: Bearer $CRON_SECRET`, e.g. Vercel Cron or Inngest):
 * - re-checks pending MonCash payments in case a callback was lost
 * - releases held deposits whose hold period ended
 * - expires abandoned payment intents
 */
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const result = { moncashChecked: 0, holdsReleased: 0, expired: 0 };

  const pending = await prisma.paymentIntent.findMany({
    where: { provider: "MONCASH", status: "PENDING", createdAt: { gte: new Date(now.getTime() - 86_400_000) } },
    take: 50,
  });
  for (const p of pending) {
    try {
      await verifyMoncashIntent(p.id);
      result.moncashChecked++;
    } catch (e) {
      console.error("MonCash poll failed", p.id, e);
    }
  }

  const held = await prisma.paymentIntent.findMany({ where: { status: "SUCCEEDED", holdUntil: { lte: now } }, take: 100 });
  for (const h of held) {
    const released = await prisma.$transaction(async (tx) => {
      const r = await releaseHold(tx, h);
      await tx.paymentIntent.update({ where: { id: h.id }, data: { holdUntil: null } });
      return !r.duplicate;
    });
    if (released) {
      result.holdsReleased++;
      await notify(h.userId, "deposit_approved", { amount: h.amount, currency: h.currency }, "/account/wallet");
    }
  }

  const expired = await prisma.paymentIntent.updateMany({
    where: { provider: "MONCASH", status: "PENDING", createdAt: { lt: new Date(now.getTime() - 86_400_000) } },
    data: { status: "EXPIRED" },
  });
  result.expired = expired.count;
  return NextResponse.json(result);
}
