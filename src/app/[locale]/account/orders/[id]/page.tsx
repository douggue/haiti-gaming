import { getAppFormatter } from "@/lib/formatter";
import { siteUrl } from "@/lib/site-url";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { itemTitle, revealCode } from "@/lib/orders";
import { audit } from "@/lib/audit";
import { t } from "@/lib/text";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { Celebrate } from "@/components/Celebrate";
import { NatcashOrderForm, MoncashRetryButton, ChangePaymentButton, PendingOrderCart } from "@/components/OrderPayment";
import type { FieldDef } from "@/lib/orders";
import { WhatsAppIcon } from "@/components/Icons";
import { ReviewRequest } from "@/components/ReviewRequest";
import { formatPhone } from "@/lib/phone";
import { randomToken } from "@/lib/crypto";
import { GiftShare } from "@/components/GiftShare";
import { MoneySplit } from "@/components/Money";
import { ProductArtSmall } from "@/components/cart/ProductArtSmall";

export default async function OrderPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale);
  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: {
      items: { include: { codes: true, variant: { include: { product: { select: { slug: true, image: true, accent: true, fields: true } } } } } },
      events: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { payments: true } },
      review: { select: { id: true, createdAt: true } },
      deliveryZone: { select: { name: true } },
    },
  });
  if (!order) notFound();
  const [to, tc, fmt, settings, ts] = await Promise.all([getTranslations("order"), getTranslations("common"), getAppFormatter(), getSettings(), getTranslations("support")]);

  const manual = order.manualMethodId ? await prisma.manualMethod.findUnique({ where: { id: order.manualMethodId } }) : null;
  const codes = order.items.flatMap((i) => i.codes);
  if (codes.length > 0) await audit(user.id, "code.view.customer", "Order", order.id, { codes: codes.length });

  const statusUrl = `${siteUrl()}/${locale}/order-status/${order.id}?t=${order.accessToken}`;
  // Gift: after delivery, a ready WhatsApp message for the person receiving it (codes go through a private link).
  let giftText: string | null = null;
  if (order.status === "FULFILLED") {
    const tg = await getTranslations("gift");
    const what = order.items.map((i) => `${t(i.variantName, locale)} ${t(i.productName, locale)}`).join(", ");
    const note = order.recipientNote ? `"${order.recipientNote}"\n\n` : "";
    if (codes.length > 0) {
      const token = order.giftToken ?? (await prisma.order.update({ where: { id: order.id }, data: { giftToken: randomToken(24) } })).giftToken!;
      giftText = `${note}${tg("messageCode", { what, url: `${siteUrl()}/${locale}/gift/${token}` })}`;
    } else {
      const ids = order.items.flatMap((i) => Object.values(i.fieldValues as Record<string, string>)).filter(Boolean).join(", ");
      giftText = `${note}${tg("messageTopup", { what })}${ids ? ` (${ids})` : ""}\n\n— Haiti Gaming · haitigaming.net`;
    }
  }
  const helpText = encodeURIComponent(`${tc("whatsappMessage")} ${to("title", { number: order.number })} ${statusUrl}`);
  const lastPayment = order.payments[0];

  const tco = await getTranslations("checkout");
  const method: Record<string, { label: string; tone: string }> = {
    MONCASH: { label: tco("moncash"), tone: "bg-[#9f1239]/40 text-[#fecdd3]" },
    NATCASH: { label: tco("natcash"), tone: "bg-[#ea580c]/25 text-[#fed7aa]" },
    WALLET: { label: tco("wallet"), tone: "bg-[#1d4ed8]/35 text-[#bfdbfe]" },
    COD: { label: tco("cod"), tone: "bg-emerald-500/20 text-emerald-300" },
    MANUAL: { label: manual ? t(manual.name, locale) : order.paymentMethod, tone: "bg-slate-500/25 text-slate-200" },
  };
  const paid = method[order.paymentMethod] ?? { label: order.paymentMethod, tone: "bg-surface-2 text-muted" };
  // The moment it worked: shown once on this phone, only right after paying or placing the order
  const tcel = await getTranslations("celebrate");
  const fresh = (d: Date | null | undefined) => !!d && Date.now() - d.getTime() < 20 * 60_000;
  const justPaid = ["PAID", "PROCESSING", "FULFILLED"].includes(order.status) && fresh(order.paidAt);
  const justPlaced = !justPaid && fresh(order.createdAt) && (order.status === "PAYMENT_REVIEW" || (order.paymentMethod === "COD" && order.status === "AWAITING_PAYMENT"));
  const payBox = "relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-400/10 to-surface/90 p-5";

  return (
    <div className="space-y-5">
      {justPaid && (
        <Celebrate
          onceKey={`paid_${order.id}`}
          title={tcel("paidTitle")}
          amount={formatMoney(order.total, order.currency, locale)}
          subtitle={order.status === "FULFILLED" ? tcel("paidDelivered") : tcel("paidProcessing")}
          cta={tcel("continue")}
        />
      )}
      {justPlaced && (
        <Celebrate
          kind="pending"
          onceKey={`placed_${order.id}`}
          title={tcel("placedTitle")}
          amount={formatMoney(order.total, order.currency, locale)}
          subtitle={order.paymentMethod === "COD" ? to("codWaiting") : tcel("placedSub")}
          cta={tcel("continue")}
        />
      )}
      <PendingOrderCart orderId={order.id} settled={["PAID", "PROCESSING", "FULFILLED", "PAYMENT_REVIEW"].includes(order.status)} />
      <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-text">← {tc("orders")}</Link>

      {/* Receipt header: number, date, status, how it was paid and the total */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(140deg,#111827_0%,#1e293b_60%,#1d2a5a_100%)] p-5 sm:p-6">
        <span aria-hidden className="ds-hide pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#3b82f6]/25 blur-3xl" />
        <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#1d4ed8] via-[#7c3aed] to-[#dc2626]" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="display text-2xl font-extrabold tracking-tight sm:text-3xl">{to("title", { number: order.number })}</h1>
            <p className="mt-0.5 text-sm text-muted">{to("placedOn", { date: fmt.dateTime(order.createdAt, { dateStyle: "long", timeStyle: "short" }) })}</p>
          </div>
          <StatusBadge status={order.status} label={to(`status.${order.status}`)} />
        </div>
        <div className="relative mt-5 flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-[#0b0f19]/60 px-4 py-3">
          <span>
            <span className="eyebrow block text-[10px] text-muted">{to("total")}</span>
            <MoneySplit minor={order.total} currency={order.currency} locale={locale} className="display text-[1.8rem] font-extrabold tracking-tight" />
          </span>
          <span className="text-right">
            <span className="eyebrow block text-[10px] text-muted">{to("paidWith")}</span>
            <span className={`mt-1 inline-block rounded-lg px-2.5 py-1 text-xs font-extrabold ${paid.tone}`}>{paid.label}</span>
          </span>
        </div>
      </section>


      {order.status === "AWAITING_PAYMENT" && order.paymentMethod === "MANUAL" && manual && (
        <section className={payBox}>
          <h2 className="display font-bold">{t(manual.name, locale)}</h2>
          {t(manual.instructions, locale) && <p className="mt-1 whitespace-pre-line text-sm">{t(manual.instructions, locale)}</p>}
          <p className="mt-1 text-sm text-muted">
            {to("payNatcashBody", { amount: formatMoney(order.total, "HTG", locale), name: manual.recipientName, phone: formatPhone(manual.recipientNumber) }).replace("NatCash", t(manual.name, locale))}
          </p>
          {lastPayment?.status === "REJECTED" && lastPayment.reviewNote && <p className="mt-3 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{lastPayment.reviewNote}</p>}
          <NatcashOrderForm orderId={order.id} phone={manual.recipientNumber} methodName={t(manual.name, locale)} />
        </section>
      )}
      {order.status === "AWAITING_PAYMENT" && order.paymentMethod === "NATCASH" && (
        <section className={payBox}>
          <h2 className="display font-bold">{to("payNatcashTitle")}</h2>
          <p className="mt-1 text-sm text-muted">
            {to("payNatcashBody", { amount: formatMoney(order.total, "HTG", locale), name: settings.natcashRecipientName, phone: formatPhone(settings.natcashRecipientPhone) })}
          </p>
          {lastPayment?.status === "REJECTED" && lastPayment.reviewNote && (
            <p className="mt-3 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{lastPayment.reviewNote}</p>
          )}
          <NatcashOrderForm orderId={order.id} phone={settings.natcashRecipientPhone} />
        </section>
      )}
      {order.status === "AWAITING_PAYMENT" && order.paymentMethod === "MONCASH" && (
        <section className={order._count.payments > 0 ? "rounded-2xl border border-danger/40 bg-danger-soft/60 p-5" : "rounded-2xl border border-border bg-surface/90 p-5"} role={order._count.payments > 0 ? "alert" : undefined}>
          {order._count.payments > 0 && (
            <>
              <h2 className="display font-bold text-danger">{to("payFailedTitle")}</h2>
              <p className="mt-1 text-sm text-muted">{to("payFailedBody")}</p>
            </>
          )}
          <div className="mt-4 flex flex-wrap items-start gap-2">
            <MoncashRetryButton orderId={order.id} />
            <ChangePaymentButton orderId={order.id} />
          </div>
        </section>
      )}
      {order.status === "AWAITING_PAYMENT" && (order.paymentMethod === "NATCASH" || order.paymentMethod === "MANUAL") && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface/80 px-4 py-3 text-sm">
          <span className="text-muted">{to("otherMethodHint")}</span>
          <ChangePaymentButton orderId={order.id} className="btn-secondary min-h-11 px-4 text-sm" />
        </div>
      )}
      {order.paymentMethod === "COD" && order.status === "AWAITING_PAYMENT" && (
        <p className="rounded-2xl border border-[#3b82f6]/30 bg-[#1d4ed8]/10 px-4 py-3 text-sm text-[#93c5fd]">{to("codWaiting")}</p>
      )}
      {order.status === "PAYMENT_REVIEW" && (
        <p className="rounded-2xl border border-amber-400/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          {to("proofSubmitted")} {to("reviewTime", { hours: settings.supportHours })}
        </p>
      )}
      {["PAID", "PROCESSING"].includes(order.status) && (
        <p className="flex items-center gap-2 rounded-2xl border border-[#3b82f6]/30 bg-[#1d4ed8]/10 px-4 py-3 text-sm text-[#93c5fd]">
          <span className="size-2 shrink-0 animate-pulse rounded-full bg-[#60a5fa]" aria-hidden /> {to("waitingDelivery")}
        </p>
      )}

      {/* Items: one card each, with the player ID or the codes and "buy again" */}
      <section className="space-y-3">
        <h2 className="display text-lg font-bold">{to("items")}</h2>
        {order.items.map((item) => {
          const values = Object.values(item.fieldValues as Record<string, string>).filter(Boolean);
          const product = item.variant.product;
          return (
            <div key={item.id} className="space-y-3 rounded-2xl border border-border bg-surface/90 p-4">
              <div className="flex items-start gap-3">
                <ProductArtSmall name={t(item.productName, locale)} accent={product.accent} image={product.image} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="display font-bold leading-snug">{itemTitle(item, locale)} × {item.quantity}</p>
                    <span className="display shrink-0 font-extrabold">{formatMoney(item.unitPrice * item.quantity, order.currency, locale)}</span>
                  </div>
                  {/* The order's status is in the header; a per-item badge only helps when items differ */}
                  {order.items.length > 1 && ["PAID", "PROCESSING", "FULFILLED"].includes(order.status) && <div className="mt-1"><StatusBadge status={item.status} label={to(`itemStatus.${item.status}`)} /></div>}
                </div>
              </div>
              {values.length > 0 && (
                <dl className="space-y-1 rounded-xl bg-[#0b0f19]/60 px-3 py-2.5 text-sm">
                  {Object.entries(item.fieldValues as Record<string, string>).filter(([, v]) => v).map(([k, v]) => {
                    const def = ((product.fields ?? []) as FieldDef[]).find((f) => f.key === k);
                    return (
                      <div key={k} className="flex items-center gap-2">
                        <dt className="shrink-0 text-xs font-semibold text-muted">{def ? t(def.label, locale) : to("details")}</dt>
                        <dd className="min-w-0 truncate font-mono font-semibold">{v}</dd>
                      </div>
                    );
                  })}
                </dl>
              )}
              {item.codes.length > 0 && (
                <div className="rounded-xl border border-[#3b82f6]/25 bg-[#1d4ed8]/10 p-3">
                  <p className="eyebrow mb-2 text-[10px] text-[#93c5fd]">{to("yourCodes")}</p>
                  <ul className="space-y-2">
                    {item.codes.map((c) => {
                      const code = revealCode(c.codeEncrypted);
                      return (
                        <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg bg-[#0b0f19]/70 px-3 py-2">
                          <code className="break-all font-mono text-sm font-semibold tracking-wide text-[#93c5fd]">{code}</code>
                          <CopyButton value={code} label={to("copy")} done={to("copied")} />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {item.deliveryNote && (
                <div className="rounded-xl bg-surface-2/70 p-3 text-sm">
                  <p className="font-semibold">{to("deliveryNote")}</p>
                  <p className="mt-1 whitespace-pre-wrap">{item.deliveryNote}</p>
                </div>
              )}
              <div className="flex justify-end">
                <Link href={`/products/${product.slug}`} className={`${order.status === "FULFILLED" ? "btn-primary" : "btn-secondary"} min-h-11 px-4 text-sm`}>↻ {to("buyAgain")}</Link>
              </div>
            </div>
          );
        })}
        {order.recipientNote && <p className="rounded-2xl border border-border bg-surface/80 p-4 text-sm"><span className="text-muted">{to("recipientNote")}:</span> {order.recipientNote}</p>}
      </section>

      {order.deliveryAddress && (
        <section className="space-y-1 rounded-2xl border border-border bg-surface/90 p-5 text-sm">
          <h2 className="display mb-2 font-bold">{to("deliveryTitle")}</h2>
          <p><b>{order.deliveryName}</b> · {order.deliveryPhone}</p>
          <p className="whitespace-pre-wrap">{order.deliveryAddress}</p>
          {order.deliveryZone && <p className="text-muted">{order.deliveryZone.name}{order.deliveryFee ? ` · ${formatMoney(order.deliveryFee, order.currency, locale)}` : ""}</p>}
          {order.deliveryNote && <p className="text-muted">{order.deliveryNote}</p>}
        </section>
      )}

      {giftText && <GiftShare text={giftText} hasNote={!!order.recipientNote} />}
      {order.status === "FULFILLED" && !order.review && <ReviewRequest orderId={order.id} city={(await prisma.user.findUnique({ where: { id: user.id }, select: { city: true } }))?.city ?? ""} />}
      {/* Thank-you stays visible for a day after the review is sent (the page re-renders right after saving) */}
      {order.status === "FULFILLED" && order.review && Date.now() - order.review.createdAt.getTime() < 86_400_000 && <ReviewRequest orderId={order.id} city="" submitted />}

      <section className="rounded-2xl border border-border bg-surface/90 p-5">
        <h2 className="display mb-4 font-bold">{to("timeline")}</h2>
        <ol className="relative space-y-4 border-l-2 border-[#3b82f6]/25 pl-5">
          {order.events.map((e, i) => (
            <li key={e.id} className="relative">
              <span
                className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-[#111827] ${i === order.events.length - 1 ? "bg-[#60a5fa] shadow-[0_0_0_4px_rgba(59,130,246,.25)]" : "bg-[#3b82f6]/60"}`}
                aria-hidden
              />
              <p className="text-sm font-semibold">{to(`status.${e.status}`)}</p>
              <p className="text-xs text-muted">{fmt.dateTime(e.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Help */}
      <section className="flex flex-col gap-3 rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 to-surface/90 p-4 sm:flex-row sm:items-center sm:justify-between">
        <a href={`https://wa.me/${settings.whatsappNumber}?text=${helpText}`} target="_blank" rel="noopener" className="btn-secondary min-h-11 px-4">
          <WhatsAppIcon width={18} height={18} className="text-[#25d366]" /> {to("getHelp")}
        </a>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={statusUrl} label={to("shareStatus")} done={to("copied")} />
          <Link href={`/account/support?order=${order.id}`} className="btn-secondary">{ts("new")}</Link>
        </div>
      </section>
    </div>
  );
}
