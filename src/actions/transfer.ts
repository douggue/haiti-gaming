"use server";
import { revalidatePath } from "next/cache";
import { assertUser } from "@/lib/session";
import { parseAmount } from "@/lib/money";
import { mustVerifyEmail } from "@/lib/verify-email";
import { findRecipient, sendTransfer, TransferError } from "@/lib/transfer";
import { audit } from "@/lib/audit";

type R = { ok: true; name?: string; code?: string } | { ok: false; error: string };

/** Shows who a code belongs to ("Jean P.") before sending. */
export async function lookupRecipient(code: string): Promise<R> {
  try {
    const user = await assertUser();
    const r = await findRecipient(String(code).slice(0, 20));
    if (!r) return { ok: false, error: "recipient" };
    if (r.id === user.id) return { ok: false, error: "self" };
    return { ok: true, name: r.name, code: r.code };
  } catch {
    return { ok: false, error: "error" };
  }
}

export async function sendMoney(form: FormData): Promise<R> {
  try {
    const user = await assertUser();
    if (await mustVerifyEmail(user.id)) return { ok: false, error: "verify_email" };
    const amount = parseAmount(String(form.get("amount") ?? ""));
    if (!amount) return { ok: false, error: "amount" };
    const key = String(form.get("key") ?? "").slice(0, 64);
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(key)) return { ok: false, error: "error" };
    const r = await sendTransfer(user.id, String(form.get("code") ?? ""), amount, String(form.get("note") ?? ""), key);
    if (r.transfer) await audit(user.id, "transfer.send", "Transfer", r.transfer.id, { to: r.to.code, amount });
    revalidatePath("/[locale]/account/wallet/transfer", "page");
    return { ok: true, name: r.to.name, code: r.to.code };
  } catch (e) {
    if (e instanceof TransferError) return { ok: false, error: e.message };
    console.error("transfer failed", e);
    return { ok: false, error: "error" };
  }
}
