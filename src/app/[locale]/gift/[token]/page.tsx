import * as UI from "@/components/Icons";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { revealCode } from "@/lib/orders";
import { audit } from "@/lib/audit";
import { t } from "@/lib/text";
import { GiftReveal } from "@/components/GiftReveal";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

/** Private gift page: the link the buyer sent on WhatsApp. No account needed; codes hidden until "Show". */
export default async function GiftPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  if (!/^[A-Za-z0-9_-]{30,40}$/.test(token)) notFound();
  const order = await prisma.order.findUnique({
    where: { giftToken: token },
    select: { id: true, status: true, recipientNote: true, user: { select: { name: true } }, items: { select: { id: true, productName: true, variantName: true, codes: { select: { codeEncrypted: true } } } } },
  });
  if (!order || order.status !== "FULFILLED") notFound();
  const tg = await getTranslations("gift");
  const from = order.user.name.trim().split(/\s+/)[0] || "Haiti Gaming";
  const items = order.items.map((i) => ({ id: i.id, title: `${t(i.productName, locale)} — ${t(i.variantName, locale)}`, codes: i.codes.map((c) => revealCode(c.codeEncrypted)) }));
  await audit(null, "code.view.gift", "Order", order.id, { codes: items.reduce((n, i) => n + i.codes.length, 0) });

  return (
    <div className="container-page max-w-lg py-10">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface/90 shadow-[0_30px_60px_-30px_rgba(29,78,216,.8)]">
        <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#1d4ed8] via-[#7c3aed] to-[#dc2626]" />
        <div className="on-dark relative overflow-hidden bg-[linear-gradient(140deg,#1e3a8a_0%,#1d4ed8_45%,#6d28d9_100%)] px-6 pb-7 pt-9 text-center text-white">
          <span aria-hidden className="ds-hide pointer-events-none absolute -right-14 -top-16 size-48 rounded-full bg-[#38bdf8]/35 blur-3xl" />
          <span aria-hidden className="ds-hide pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-[#f472b6]/30 blur-3xl" />
          <span className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-white/15 text-4xl shadow-lg backdrop-blur" aria-hidden><UI.GiftIcon width={30} height={30} /></span>
          <h1 className="display relative mt-4 text-2xl font-extrabold tracking-tight">{tg("pageTitle", { name: from })}</h1>
          {order.recipientNote && <p className="relative mx-auto mt-4 max-w-sm whitespace-pre-wrap rounded-2xl bg-black/25 px-5 py-4 text-lg italic">“{order.recipientNote}”</p>}
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          {items.map((i) => (
            <GiftReveal key={i.id} title={i.title} codes={i.codes} />
          ))}
          <p className="flex items-start gap-2 rounded-xl bg-[#0b0f19]/60 px-3 py-2.5 text-xs text-muted"><UI.LockIcon width={14} height={14} className="mt-0.5 shrink-0" /> {tg("privateNote")}</p>
        </div>
      </div>
      <p className="mt-6 text-center text-sm">
        <Link href="/store" className="btn-secondary min-h-11 px-5">{tg("shopToo")} →</Link>
      </p>
    </div>
  );
}
