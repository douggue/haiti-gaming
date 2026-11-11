import { getAppFormatter } from "@/lib/formatter";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { itemTitle } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { Link } from "@/i18n/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { WhatsAppIcon } from "@/components/Icons";

export const metadata = { robots: { index: false, follow: false } };

function sameToken(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Public order status, reachable with the order's private link (?t=token) without signing in.
 * Shows progress only: delivered codes stay behind sign-in on the order page.
 */
export default async function OrderStatusPage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { t: token = "" } = await searchParams;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true, events: { orderBy: { createdAt: "asc" } } } });
  if (!order || !token || !sameToken(token, order.accessToken)) notFound();
  const [to, tc, fmt, settings] = await Promise.all([getTranslations("order"), getTranslations("common"), getAppFormatter(), getSettings()]);
  const help = encodeURIComponent(`${tc("whatsappMessage")} ${to("title", { number: order.number })}`);
  return (
    <div className="container-page max-w-2xl space-y-5 py-6 sm:py-10">
      <div className="relative flex flex-wrap items-start justify-between gap-3 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#1d4ed8]/25 via-surface/70 to-[#7c3aed]/15 p-5 sm:p-7">
        <span aria-hidden className="ds-hide pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#3b82f6]/25 blur-3xl" />
        <div className="relative">
          <p className="eyebrow text-[#60a5fa]">Haiti Gaming</p>
          <h1 className="display mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{to("title", { number: order.number })}</h1>
          <p className="text-sm text-muted">{to("placedOn", { date: fmt.dateTime(order.createdAt, { dateStyle: "long", timeStyle: "short" }) })}</p>
        </div>
        <span className="relative"><StatusBadge status={order.status} label={to(`status.${order.status}`)} /></span>
      </div>
      <section className="card divide-y divide-border">
        {order.items.map((i) => (
          <div key={i.id} className="flex items-center justify-between gap-3 p-4 text-sm">
            <span>{itemTitle(i, locale)} × {i.quantity}</span>
            <StatusBadge status={i.status} label={to(`itemStatus.${i.status}`)} />
          </div>
        ))}
        <div className="flex items-end justify-between p-4"><span className="eyebrow text-muted">{to("total")}</span><span className="display text-xl font-extrabold text-[#60a5fa]">{formatMoney(order.total, order.currency, locale)}</span></div>
      </section>
      <section className="card p-5">
        <h2 className="display mb-4 font-bold">{to("timeline")}</h2>
        <ol className="relative space-y-4 border-l border-border pl-5">
          {order.events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-surface bg-primary" aria-hidden />
              <p className="text-sm font-medium">{to(`status.${e.status}`)}</p>
              <p className="text-xs text-muted">{fmt.dateTime(e.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>
            </li>
          ))}
        </ol>
      </section>
      <div className="flex flex-wrap gap-3">
        <Link href={`/account/orders/${order.id}`} className="btn-primary min-h-12">{tc("signIn")} → {to("yourCodes")}</Link>
        <a href={`https://wa.me/${settings.whatsappNumber}?text=${help}`} target="_blank" rel="noopener" className="btn-secondary min-h-12">
          <WhatsAppIcon width={18} height={18} className="text-[#1fa855]" /> {to("getHelp")}
        </a>
      </div>
    </div>
  );
}
