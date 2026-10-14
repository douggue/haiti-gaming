import { prisma, type Tx } from "./db";

export type NotificationType =
  | "deposit_approved"
  | "deposit_rejected"
  | "deposit_held"
  | "order_paid"
  | "order_fulfilled"
  | "order_refunded"
  | "exchange_done"
  | "wallet_adjusted";

export async function notify(
  userId: string,
  type: NotificationType,
  params: Record<string, string | number> = {},
  link?: string,
  db: Tx = prisma,
) {
  await db.notification.create({ data: { userId, type, params, link } });
  // Email and WhatsApp delivery plug in here once providers are configured (blueprint §15).
}
