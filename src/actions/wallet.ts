"use server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { parseAmount, usdToHtg } from "@/lib/money";
import { createMoncashPayment, moncashAvailable } from "@/lib/payments/moncash";
import { assertWithinNewAccountLimit, LimitExceededError } from "@/lib/risk";
import { postExchange, quoteExchange } from "@/lib/wallet";
import { InsufficientFundsError } from "@/lib/ledger";
import { addEvent } from "@/lib/orders";
import { notify } from "@/lib/notify";
import { savePrivateImage, uploadsEnabled, UploadError } from "@/lib/storage";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const refSchema = z.string().trim().min(4).max(40).regex(/^[A-Za-z0-9-]+$/);
const phoneSchema = z.string().trim().max(20).optional();
/** EVM (0x + 64 hex) or Tron (64 hex) transaction hash */
const txHashSchema = z.string().trim().regex(/^(0x)?[0-9a-fA-F]{64}$/);

/** Start a wallet deposit. MonCash returns a redirect URL; NatCash records the customer's reference for review. */
export async function createDeposit(form: FormData): Promise<ActionResult<{ redirect?: string }>> {
  const user = await assertUser();
  const { verifyTurnstile } = await import("@/lib/turnstile");
  const { headers } = await import("next/headers");
  if (!(await verifyTurnstile(String(form.get("cf-turnstile-response") ?? ""), (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim()))) {
    return { ok: false, error: "captcha" };
  }
  const settings = await getSettings();
  const method = form.get("method");
  const amount = parseAmount(String(form.get("amount") ?? ""));
  // Crypto methods credit the USD wallet: the amount is in USD, limits are compared in HTG.
  const manual = method === "MANUAL" ? await prisma.manualMethod.findUnique({ where: { id: String(form.get("manualMethodId") ?? "") } }) : null;
  const currency = manual?.currency ?? "HTG";
  const amountHtg = amount ? (currency === "USD" ? usdToHtg(amount, settings.htgPerUsd) : amount) : 0;
  if (!amount || amountHtg < settings.minDepositHtg || amountHtg > settings.maxDepositHtg) return { ok: false, error: "amount" };

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  try {
    await assertWithinNewAccountLimit(prisma, dbUser, amountHtg, settings);
  } catch (e) {
    if (e instanceof LimitExceededError) return { ok: false, error: "new_account_limit" };
    throw e;
  }

  if (method === "MONCASH") {
    if (!moncashAvailable(settings.moncashEnabled)) return { ok: false, error: "method_unavailable" };
    const intent = await prisma.paymentIntent.create({ data: { userId: user.id, provider: "MONCASH", amount, currency: "HTG" } });
    return { ok: true, redirect: await createMoncashPayment(intent.id, amount) };
  }

  if (method === "NATCASH" || method === "MANUAL") {
    let manualMethodId: string | null = null;
    if (method === "NATCASH" && !settings.natcashEnabled) return { ok: false, error: "method_unavailable" };
    if (method === "MANUAL") {
      const m = manual;
      if (!m || !m.isEnabled || !m.allowDeposits) return { ok: false, error: "method_unavailable" };
      manualMethodId = m.id;
    }
    const ref = (manual?.kind === "crypto" ? txHashSchema : refSchema).safeParse(form.get("reference"));
    if (!ref.success) return { ok: false, error: manual?.kind === "crypto" ? "tx_hash" : "reference" };
    const phone = phoneSchema.safeParse(form.get("payerPhone") ?? undefined);
    let evidencePath: string | null = null;
    const file = form.get("evidence");
    if (file instanceof File && file.size > 0 && uploadsEnabled()) {
      try {
        evidencePath = await savePrivateImage(file, "evidence");
      } catch (e) {
        if (e instanceof UploadError) return { ok: false, error: "upload" };
        throw e;
      }
    }
    try {
      await prisma.paymentIntent.create({
        data: {
          userId: user.id, provider: method, manualMethodId, amount, currency, status: "REVIEW",
          providerRef: manual?.kind === "crypto" ? ref.data.toLowerCase() : ref.data.toUpperCase(), payerPhone: phone.success ? phone.data : null, evidencePath,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "duplicate_ref" };
      throw e;
    }
    revalidatePath("/[locale]/account/wallet", "page");
    return { ok: true };
  }
  return { ok: false, error: "method_unavailable" };
}

/** Customer submits NatCash proof for an order awaiting payment. */
export async function submitOrderNatcash(form: FormData): Promise<ActionResult> {
  const user = await assertUser();
  const orderId = String(form.get("orderId"));
  const ref = refSchema.safeParse(form.get("reference"));
  if (!ref.success) return { ok: false, error: "reference" };
  const order = await prisma.order.findFirst({ where: { id: orderId, userId: user.id, paymentMethod: { in: ["NATCASH", "MANUAL"] }, status: "AWAITING_PAYMENT" } });
  if (!order) return { ok: false, error: "not_found" };
  let evidencePath: string | null = null;
  const file = form.get("evidence");
  if (file instanceof File && file.size > 0 && uploadsEnabled()) {
    try {
      evidencePath = await savePrivateImage(file, "evidence");
    } catch {
      return { ok: false, error: "upload" };
    }
  }
  const phone = phoneSchema.safeParse(form.get("payerPhone") ?? undefined);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.paymentIntent.create({
        data: {
          userId: user.id, orderId: order.id, provider: order.paymentMethod === "MANUAL" ? "MANUAL" : "NATCASH", manualMethodId: order.manualMethodId, amount: order.total, currency: "HTG", status: "REVIEW",
          providerRef: ref.data.toUpperCase(), payerPhone: phone.success ? phone.data : null, evidencePath,
        },
      });
      await tx.order.update({ where: { id: order.id }, data: { status: "PAYMENT_REVIEW" } });
      await addEvent(tx, order.id, "PAYMENT_REVIEW", `${order.paymentMethod === "MANUAL" ? "Manual payment" : "NatCash"} reference ${ref.data.toUpperCase()}`);
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "duplicate_ref" };
    throw e;
  }
  revalidatePath(`/[locale]/account/orders/${order.id}`, "page");
  return { ok: true };
}

/** Pay an unpaid MonCash order again (e.g. the customer canceled on the MonCash page). */
export async function retryMoncash(orderId: string): Promise<ActionResult<{ redirect: string }>> {
  const user = await assertUser();
  const order = await prisma.order.findFirst({ where: { id: orderId, userId: user.id, paymentMethod: "MONCASH", status: "AWAITING_PAYMENT" } });
  if (!order) return { ok: false, error: "not_found" };
  const intent = await prisma.paymentIntent.create({ data: { userId: user.id, orderId: order.id, provider: "MONCASH", amount: order.total, currency: "HTG" } });
  return { ok: true, redirect: await createMoncashPayment(intent.id, intent.amount) };
}

export async function requestQuote(from: "HTG" | "USD", amountInput: string): Promise<ActionResult<{ quote: { id: string; from: string; to: string; fromAmount: number; toAmount: number; rate: number; fee: number; expiresAt: string } }>> {
  const user = await assertUser();
  if (from !== "HTG" && from !== "USD") return { ok: false, error: "invalid" };
  const amount = parseAmount(amountInput);
  if (!amount || amount > 100_000_000) return { ok: false, error: "invalidAmount" };
  const settings = await getSettings();
  const q = quoteExchange(from, amount, settings);
  if (q.toAmount < 1) return { ok: false, error: "tooSmall" };
  const expiresAt = new Date(Date.now() + settings.exchangeQuoteSeconds * 1000);
  const quote = await prisma.exchangeQuote.create({
    data: { userId: user.id, fromCurrency: from, toCurrency: q.to, fromAmount: amount, toAmount: q.toAmount, rate: new Prisma.Decimal(q.rate.toFixed(8)), feeAmount: q.fee, expiresAt },
  });
  return { ok: true, quote: { id: quote.id, from, to: q.to, fromAmount: amount, toAmount: q.toAmount, rate: q.rate, fee: q.fee, expiresAt: expiresAt.toISOString() } };
}

export async function confirmExchange(quoteId: string): Promise<ActionResult> {
  const user = await assertUser();
  try {
    await prisma.$transaction(async (tx) => {
      // Mark used first: the conditional update makes a double-submit a no-op.
      const used = await tx.exchangeQuote.updateMany({
        where: { id: quoteId, userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (used.count !== 1) throw new Error("expired");
      const q = await tx.exchangeQuote.findUniqueOrThrow({ where: { id: quoteId } });
      await postExchange(tx, q);
    });
  } catch (e) {
    if (e instanceof InsufficientFundsError) return { ok: false, error: "insufficient" };
    if (e instanceof Error && e.message === "expired") return { ok: false, error: "quoteExpired" };
    throw e;
  }
  await notify(user.id, "exchange_done", {}, "/account/wallet");
  revalidatePath("/[locale]/account/wallet", "page");
  return { ok: true };
}
