import "server-only";
import { randomInt } from "node:crypto";
import { prisma } from "./db";
import { post, walletAccount, InsufficientFundsError } from "./ledger";
import { getSettings } from "./settings";
import { notify } from "./notify";
import { shortName } from "./trust";

/** No 0/O, 1/I/L: easy to read out over the phone. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_RE = /^HG-[A-HJ-NP-Z2-9]{6}$/;

export function normalizeCode(input: string) {
  const c = input.trim().toUpperCase().replace(/[\s_]/g, "").replace(/^HG-?/, "");
  return `HG-${c}`;
}

/** The customer's transfer code, created the first time it's needed. */
export async function transferCodeFor(userId: string): Promise<string> {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { transferCode: true } });
  if (u.transferCode) return u.transferCode;
  for (let i = 0; i < 8; i++) {
    const code = "HG-" + Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
    const done = await prisma.user.updateMany({ where: { id: userId, transferCode: null }, data: { transferCode: code } }).catch(() => ({ count: 0 }));
    if (done.count === 1) return code;
    const again = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { transferCode: true } });
    if (again.transferCode) return again.transferCode;
  }
  throw new Error("Could not create a transfer code");
}

/** Who a code belongs to, shown before sending ("Jean P."). Only active customers can receive. */
export async function findRecipient(code: string) {
  const c = normalizeCode(code);
  if (!CODE_RE.test(c)) return null;
  const u = await prisma.user.findUnique({ where: { transferCode: c }, select: { id: true, name: true, status: true } });
  if (!u || u.status !== "ACTIVE") return null;
  return { id: u.id, name: shortName(u.name), code: c };
}

/** Sent in the last 24 hours, HTG centimes. */
export async function sentToday(userId: string) {
  const r = await prisma.transfer.aggregate({ where: { fromUserId: userId, createdAt: { gte: new Date(Date.now() - 86_400_000) } }, _sum: { amount: true } });
  return r._sum.amount ?? 0;
}

export class TransferError extends Error {}

/**
 * Wallet to wallet, gourdes only, no fee. `key` makes a double tap send once.
 * Errors: self, recipient, amount, limit, funds, disabled.
 */
export async function sendTransfer(fromUserId: string, code: string, amount: number, note: string, key: string) {
  const settings = await getSettings();
  if (!settings.transfersEnabled) throw new TransferError("disabled");
  if (!Number.isSafeInteger(amount) || amount < 100 || amount > 100_000_000) throw new TransferError("amount");
  const to = await findRecipient(code);
  if (!to) throw new TransferError("recipient");
  if (to.id === fromUserId) throw new TransferError("self");
  const cleanNote = note.trim().slice(0, 140) || null;

  const result = await prisma.$transaction(async (tx) => {
    // One transfer at a time per sender, so two quick sends can't both pass the daily limit.
    await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${fromUserId} FOR UPDATE`;
    const since = new Date(Date.now() - 86_400_000);
    const sum = (await tx.transfer.aggregate({ where: { fromUserId, createdAt: { gte: since } }, _sum: { amount: true } }))._sum.amount ?? 0;
    if (sum + amount > settings.transferDailyLimitHtg) throw new TransferError("limit");
    const [fromW, toW] = [await walletAccount(tx, fromUserId, "HTG"), await walletAccount(tx, to.id, "HTG")];
    const posted = await post(tx, {
      type: "TRANSFER",
      idempotencyKey: `transfer:${fromUserId}:${key}`,
      description: `Transfer to ${to.code}`,
      createdById: fromUserId,
      metadata: { to: to.id, code: to.code },
      entries: [
        { accountId: fromW.id, currency: "HTG", amount: -amount },
        { accountId: toW.id, currency: "HTG", amount },
      ],
    }).catch((e) => {
      if (e instanceof InsufficientFundsError) throw new TransferError("funds");
      throw e;
    });
    if (posted.duplicate) return null;
    return tx.transfer.create({ data: { fromUserId, toUserId: to.id, amount, note: cleanNote } });
  });
  if (result) {
    const from = await prisma.user.findUniqueOrThrow({ where: { id: fromUserId }, select: { name: true } });
    await notify(to.id, "transfer_received", { amount, currency: "HTG", name: shortName(from.name) }, "/account/wallet/transfer");
    await notify(fromUserId, "transfer_sent", { amount, currency: "HTG", name: to.name }, "/account/wallet/transfer");
  }
  return { to, transfer: result };
}
