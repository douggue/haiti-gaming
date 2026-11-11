import { getAppFormatter } from "@/lib/formatter";
import Image from "next/image";
import type { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { t } from "@/lib/text";
import { BagIcon } from "../Icons";
import { PayLogo } from "../PayLogo";
import { CheckCheckIcon, KeyIcon, ReceiptIcon, ReorderIcon } from "./AccountIcons";

/** What a card needs from each order (codes are only counted here, never read: they show on the order page). */
export const orderCardInclude = {
  items: {
    include: {
      _count: { select: { codes: true } },
      variant: { select: { product: { select: { slug: true, image: true, name: true } } } },
    },
  },
} satisfies Prisma.OrderInclude;
export type CardOrder = Prisma.OrderGetPayload<{ include: typeof orderCardInclude }>;

export const ACTIVE_STATUSES = ["AWAITING_PAYMENT", "PAYMENT_REVIEW", "PAID", "PROCESSING"] as const;
export type OrderTab = "all" | "active" | "done";
export function tabWhere(tab: OrderTab): Prisma.OrderWhereInput {
  if (tab === "active") return { status: { in: [...ACTIVE_STATUSES] } };
  if (tab === "done") return { status: "FULFILLED" };
  return {};
}
export function parseTab(v: string | undefined): OrderTab {
  return v === "active" || v === "done" ? v : "all";
}

const STATUS_TONE: Record<string, string> = {
  AWAITING_PAYMENT: "text-amber-400",
  PAYMENT_REVIEW: "text-amber-400",
  PAID: "text-[#60a5fa]",
  PROCESSING: "text-[#60a5fa]",
  FULFILLED: "text-emerald-400",
  FAILED: "text-danger",
  CANCELED: "text-muted",
  REFUNDED: "text-muted",
};

/** Tout / Aktif / Fini, as links so the page works without JavaScript. */
export async function OrderTabs({ base, tab, counts }: { base: string; tab: OrderTab; counts: Record<OrderTab, number> }) {
  const ta = await getTranslations("accountUi");
  return (
    <nav className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-surface/70 p-1 text-sm font-bold" aria-label={ta("orderHistory")}>
      {(["all", "active", "done"] as const).map((k) => (
        <Link
          key={k}
          href={k === "all" ? base : `${base}?tab=${k}`}
          scroll={false}
          aria-current={tab === k ? "page" : undefined}
          className={`rounded-xl px-2 py-2.5 text-center transition-colors ${tab === k ? "bg-surface-2 text-text shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]" : "text-muted hover:text-text"}`}
        >
          {ta(`tab_${k}`)} ({counts[k]})
        </Link>
      ))}
    </nav>
  );
}

function PayBadge({ method, walletLabel, otherLabel }: { method: string; walletLabel: string; otherLabel: string }) {
  if (method === "MONCASH" || method === "NATCASH") {
    return <span className="grid h-8 shrink-0 place-items-center rounded-lg bg-white/95 px-2"><PayLogo brand={method === "MONCASH" ? "moncash" : "natcash"} height={16} /></span>;
  }
  return (
    <span className={`grid h-8 shrink-0 place-items-center rounded-lg px-2.5 text-xs font-extrabold ${method === "WALLET" ? "bg-[#1d4ed8] text-white" : "bg-surface-2 text-muted"}`}>
      {method === "WALLET" ? walletLabel : otherLabel}
    </span>
  );
}

export async function OrderCard({ order, locale }: { order: CardOrder; locale: string }) {
  const [ta, to, fmt] = await Promise.all([getTranslations("accountUi"), getTranslations("order"), getAppFormatter()]);
  const first = order.items[0];
  const product = first?.variant.product;
  const name = first ? `${t(first.productName, locale)} — ${t(first.variantName, locale)}` : `#${order.number}`;
  const codes = order.items.reduce((n, i) => n + i._count.codes, 0);
  const fulfilled = order.status === "FULFILLED";
  // The customer's own player ID / email for this order, so they recognise it at a glance
  const fieldValue = first ? Object.values((first.fieldValues ?? {}) as Record<string, string>).find((v) => typeof v === "string" && v.trim()) : undefined;
  const ageMs = Date.now() - order.createdAt.getTime();
  const when = ageMs < 7 * 864e5 ? fmt.relativeTime(order.createdAt) : fmt.dateTime(order.createdAt, { dateStyle: "medium" });
  const finished = ["FULFILLED", "FAILED", "CANCELED", "REFUNDED"].includes(order.status);
  const href = `/account/orders/${order.id}`;

  return (
    <li className="rounded-3xl border border-border bg-surface/80 p-3.5 sm:p-4">
      <div className="flex items-start gap-3">
        <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface-2 text-[#60a5fa]">
          {product?.image ? <Image src={product.image} alt="" fill sizes="48px" className="object-cover" /> : <BagIcon width={22} height={22} />}
        </span>
        <span className="min-w-0 flex-1">
          <Link href={href} className="display line-clamp-2 text-[15px] font-bold leading-snug hover:text-primary">
            {name}{order.items.length > 1 ? ` +${order.items.length - 1}` : ""}
          </Link>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
            #{order.number} <span aria-hidden>•</span>
            <span className={`inline-flex items-center gap-1 font-semibold ${STATUS_TONE[order.status] ?? "text-muted"}`}>
              {fulfilled && <CheckCheckIcon width={13} height={13} />}
              {to(`status.${order.status}`)}
            </span>
          </span>
        </span>
        <b className="display shrink-0 text-base font-extrabold tabular-nums sm:text-lg">{formatMoney(order.total, order.currency, locale)}</b>
      </div>

      <div className="mt-3 flex items-center gap-2.5 rounded-2xl bg-black/20 p-2">
        <PayBadge method={order.paymentMethod} walletLabel={ta("walletShort")} otherLabel={order.paymentMethod === "COD" ? ta("cashShort") : ta("otherShort")} />
        <span className="min-w-0 flex-1 truncate text-xs">
          {fulfilled && codes > 0 ? (
            <span className="inline-flex items-center gap-1 font-semibold text-[#93c5fd]"><KeyIcon width={14} height={14} /> {ta("codesReady", { n: codes })}</span>
          ) : fieldValue ? (
            <span className="text-muted">{ta("deliveredTo")} <b className="font-mono text-text">{fieldValue}</b></span>
          ) : (
            <span className="text-muted">{order.items.reduce((n, i) => n + i.quantity, 0)} × {ta("items")}</span>
          )}
        </span>
        <span className="shrink-0 pr-1 text-[11px] text-muted">{when}</span>
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Link href={href} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-surface-2 px-3.5 text-sm font-bold hover:bg-surface-2/70">
          <ReceiptIcon width={16} height={16} /> {ta("viewDetails")}
        </Link>
        {fulfilled && codes > 0 ? (
          <Link href={href} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#c7d2fe] px-3.5 text-sm font-bold text-[#1e1b4b] hover:bg-[#dbe1ff]">
            <KeyIcon width={16} height={16} /> {ta("seeCodes")}
          </Link>
        ) : finished && product ? (
          <Link href={`/products/${product.slug}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#1d4ed8] px-3.5 text-sm font-bold text-white hover:bg-[#2563eb]">
            <ReorderIcon width={16} height={16} /> {ta("reorder")}
          </Link>
        ) : null}
      </div>
    </li>
  );
}
