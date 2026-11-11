"use server";
import { prisma } from "@/lib/db";
import { assertUser } from "@/lib/session";
import { cartSchema, createOrder, OrderError, refundOrCancel, type FieldDef } from "@/lib/orders";
import { revalidatePath } from "next/cache";
import { InsufficientFundsError } from "@/lib/ledger";
import { LimitExceededError } from "@/lib/risk";
import { createMoncashPayment } from "@/lib/payments/moncash";
import { z } from "zod";
import { mustVerifyEmail } from "@/lib/verify-email";
import { normalizePhone } from "@/lib/phone";

const input = z.object({
  items: cartSchema,
  currency: z.enum(["HTG", "USD"]),
  method: z.enum(["WALLET", "MONCASH", "NATCASH", "MANUAL", "COD"]),
  manualMethodId: z.string().max(64).optional(),
  note: z.string().max(300).optional(),
  delivery: z.object({ zoneId: z.string().max(64), name: z.string().max(80), phone: z.string().max(30), address: z.string().max(300), note: z.string().max(300).optional() }).optional(),
});

export type PlaceOrderResult = { ok: true; orderId: string; redirect?: string } | { ok: false; error: string };

export async function placeOrder(raw: unknown): Promise<PlaceOrderResult> {
  let user;
  try {
    user = await assertUser();
  } catch {
    return { ok: false, error: "signin" };
  }
  if (await mustVerifyEmail(user.id)) return { ok: false, error: "verify_email" };
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid_field" };
  const { items, currency, method, note, manualMethodId, delivery } = parsed.data;

  try {
    const order = await createOrder({ userId: user.id, items, currency, method, manualMethodId, recipientNote: note, delivery: delivery ? { ...delivery, phone: normalizePhone(delivery.phone) ?? delivery.phone } : undefined });
    await rememberPlayerIds(user.id, items);

    if (method === "MONCASH") {
      const intent = await prisma.paymentIntent.create({
        data: { userId: user.id, orderId: order.id, provider: "MONCASH", amount: order.total, currency: "HTG" },
      });
      const url = await createMoncashPayment(intent.id, intent.amount);
      return { ok: true, orderId: order.id, redirect: url };
    }
    return { ok: true, orderId: order.id };
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, error: e.code };
    if (e instanceof InsufficientFundsError) return { ok: false, error: "insufficient" };
    if (e instanceof LimitExceededError) return { ok: false, error: "new_account_limit" };
    console.error("placeOrder failed", e);
    return { ok: false, error: "generic" };
  }
}

/** Save entered player IDs / account emails so repeat purchases take one tap. */
async function rememberPlayerIds(userId: string, items: z.infer<typeof cartSchema>) {
  const variants = await prisma.productVariant.findMany({ where: { id: { in: items.map((i) => i.variantId) } }, include: { product: true } });
  for (const item of items) {
    const v = variants.find((x) => x.id === item.variantId);
    const defs = (v?.product.fields ?? []) as FieldDef[];
    if (!v || defs.length === 0 || Object.keys(item.fields).length === 0) continue;
    const existing = await prisma.savedPlayerId.findMany({ where: { userId, productId: v.productId } });
    if (existing.some((s) => JSON.stringify(s.values) === JSON.stringify(item.fields))) continue;
    await prisma.savedPlayerId.create({ data: { userId, productId: v.productId, values: item.fields, label: Object.values(item.fields)[0] } });
  }
}

export type RefillLine = {
  variantId: string;
  productSlug: string;
  productName: Record<string, string>;
  variantName: Record<string, string>;
  accent: string | null;
  image: string | null;
  priceHtg: number;
  quantity: number;
  fields: Record<string, string>;
  physical?: boolean;
};

/**
 * "Change payment method" on an order that was never paid (e.g. the customer canceled on the MonCash page):
 * cancels that order (stock goes back) and returns its lines so the cart can be filled again for a new checkout.
 * Only the customer's own order, only while nothing was paid or sent for review. If MonCash still confirms the
 * old attempt later, that money lands in the customer's wallet (it is never lost).
 */
export async function cancelUnpaidOrder(orderId: string): Promise<{ ok: true; lines: RefillLine[] } | { ok: false; error: string }> {
  let user;
  try {
    user = await assertUser();
  } catch {
    return { ok: false, error: "signin" };
  }
  const order = await prisma.order.findFirst({
    where: { id: String(orderId).slice(0, 64), userId: user.id, status: "AWAITING_PAYMENT", paymentMethod: { not: "COD" } },
    include: {
      payments: { where: { status: { in: ["SUCCEEDED", "REVIEW"] } }, select: { id: true } },
      items: { include: { variant: { select: { product: { select: { slug: true, image: true, accent: true, fulfillmentType: true } } } } } },
    },
  });
  if (!order || order.payments.length > 0) return { ok: false, error: "not_found" };
  try {
    await refundOrCancel(order.id, user.id, "Canceled by the customer to change the payment method");
  } catch (e) {
    console.error("cancelUnpaidOrder failed", e);
    return { ok: false, error: "generic" };
  }
  revalidatePath("/[locale]/account/orders/[id]", "page");
  return {
    ok: true,
    lines: order.items.map((i) => ({
      variantId: i.variantId,
      productSlug: i.variant.product.slug,
      productName: i.productName as Record<string, string>,
      variantName: i.variantName as Record<string, string>,
      accent: i.variant.product.accent,
      image: i.variant.product.image,
      priceHtg: i.unitPrice,
      quantity: i.quantity,
      fields: (i.fieldValues ?? {}) as Record<string, string>,
      ...(i.variant.product.fulfillmentType === "PHYSICAL" ? { physical: true } : {}),
    })),
  };
}
