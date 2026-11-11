import { prisma } from "./db";
import { shortName } from "./trust";

type Tx = { type: string; description: string | null; createdById: string | null; metadata: unknown };
type T = (key: string, values?: Record<string, string | number>) => string;

const PROVIDER: Record<string, string> = { MONCASH: "MonCash", NATCASH: "NatCash", WALLET: "Bous", MANUAL: "", CRYPTO: "USDT" };

/** Names of the other person in wallet transfers, looked up once for a list of ledger rows. */
export async function transferNames(rows: { transaction: Tx }[]) {
  const ids = new Set<string>();
  for (const r of rows) {
    if (r.transaction.type !== "TRANSFER") continue;
    if (r.transaction.createdById) ids.add(r.transaction.createdById);
    const to = (r.transaction.metadata as { to?: string } | null)?.to;
    if (to) ids.add(to);
  }
  if (ids.size === 0) return new Map<string, string>();
  const users = await prisma.user.findMany({ where: { id: { in: [...ids] } }, select: { id: true, name: true } });
  return new Map(users.map((u) => [u.id, shortName(u.name)]));
}

/**
 * The detail line under a wallet movement, in the visitor's language. The ledger keeps its English system text
 * ("MONCASH payment …", "Transfer to HG-…"); this turns it into words a customer reads.
 * `t` is the "wallet" namespace, `tOrder` the "order" one.
 */
export function ledgerDetail(tx: Tx, amount: number, names: Map<string, string>, t: T, tOrder: T): string | undefined {
  const d = tx.description ?? "";
  if (tx.type === "TRANSFER") {
    if (amount > 0) {
      const from = tx.createdById ? names.get(tx.createdById) : undefined;
      return from ? t("d_from", { name: from }) : undefined;
    }
    const meta = tx.metadata as { to?: string; code?: string } | null;
    const to = (meta?.to && names.get(meta.to)) || meta?.code;
    return to ? t("d_to", { name: to }) : undefined;
  }
  let m = /^(\w+) payment (\S+)( \(held\))?$/.exec(d);
  if (m) {
    const provider = PROVIDER[m[1]] ?? m[1];
    return [provider, m[2]].filter(Boolean).join(" · ");
  }
  if (/^Hold released for payment /.test(d)) return t("d_released");
  if ((m = /^Order #(\d+)$/.exec(d))) return tOrder("title", { number: m[1] });
  if ((m = /^Refund for order #(\d+)/.exec(d))) return t("d_refund", { number: m[1] });
  if (/^Referral reward/.test(d)) return t("d_referral");
  if ((m = /^Exchange (\w+) → (\w+)$/.exec(d))) return `${m[1]} → ${m[2]}`;
  if (/^Adjustment/.test(d)) return t("d_adjustment");
  return d || undefined;
}
