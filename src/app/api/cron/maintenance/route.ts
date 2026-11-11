import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyMoncashIntent } from "@/lib/payments/verify";
import { releaseHold } from "@/lib/wallet";
import { notify } from "@/lib/notify";
import { getSettings } from "@/lib/settings";
import { refundOrCancel } from "@/lib/orders";
import { OPEN, runSupplierCron } from "@/lib/suppliers/orders";

/**
 * Scheduled maintenance (call every 5–10 minutes with `Authorization: Bearer $CRON_SECRET`, e.g. Vercel Cron or Inngest):
 * - re-checks pending MonCash payments in case a callback was lost
 * - releases held deposits whose hold period ended
 * - expires abandoned payment intents
 * - sends supplier orders and checks the ones still pending (see src/lib/suppliers/orders.ts)
 * - refunds paid orders that were not delivered within `autoRefundHours` (nothing delivered, no open risk review,
 *   no supplier order still running)
 */
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const result: Record<string, number> = { moncashChecked: 0, holdsReleased: 0, expired: 0, autoRefunded: 0 };
  try {
    Object.assign(result, await runSupplierCron());
  } catch (e) {
    console.error("Supplier cron failed", e);
  }

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

  const settings = await getSettings();
  if (settings.autoRefundHours > 0) {
    const cutoff = new Date(now.getTime() - settings.autoRefundHours * 3_600_000);
    const stuck = await prisma.order.findMany({
      where: {
        status: { in: ["PAID", "PROCESSING"] },
        paidAt: { lt: cutoff },
        items: { none: { status: "DELIVERED" } },
        riskFlags: { none: { status: "OPEN" } },
        NOT: { items: { some: { supplierOrders: { some: { status: { in: OPEN } } } } } },
        // Accessories are delivered by hand and take longer: never refunded automatically
        deliveryAddress: null,
      },
      select: { id: true },
      take: 50,
    });
    for (const o of stuck) {
      try {
        await refundOrCancel(o.id, null, `Not delivered within ${settings.autoRefundHours} hours: refunded automatically`);
        result.autoRefunded++;
      } catch (e) {
        console.error("Auto-refund failed", o.id, e);
      }
    }
  }
  try {
    result.analyticsDays = await rollUpAnalytics();
  } catch (e) {
    console.error("Analytics roll-up failed", e);
  }
  return NextResponse.json(result);
}

/**
 * Visitor statistics: keeps a daily total (visitors, page views) for every finished day, then deletes the detailed
 * events older than 90 days. Safe to run any number of times: totals are recomputed while the details still exist.
 */
async function rollUpAnalytics() {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await prisma.$queryRaw<{ day: string; visitors: bigint; pageviews: bigint }[]>`
    SELECT to_char("at" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
           COUNT(DISTINCT "visitorHash") AS visitors,
           COUNT(*) FILTER (WHERE "type" = 'pageview') AS pageviews
    FROM "AnalyticsEvent"
    WHERE "at" < ${new Date(`${today}T00:00:00Z`)} AND "at" >= ${new Date(Date.now() - 92 * 86_400_000)}
    GROUP BY 1`;
  for (const r of rows) {
    const data = { visitors: Number(r.visitors), pageviews: Number(r.pageviews) };
    await prisma.analyticsDaily.upsert({ where: { day: r.day }, create: { day: r.day, ...data }, update: data });
  }
  await prisma.analyticsEvent.deleteMany({ where: { at: { lt: new Date(Date.now() - 90 * 86_400_000) } } });
  return rows.length;
}
