import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { getDisplaySettings } from "@/lib/settings";
import { BagIcon, BookIcon, ChatIcon, PinIcon, TagIcon, WhatsAppIcon } from "./Icons";

type S = Awaited<ReturnType<typeof getDisplaySettings>>;

/** Where to get help: WhatsApp (number and hours from Settings), orders, a support request, the payment guide, the Market. */
export async function HelpChannels({ settings }: { settings: S }) {
  const [t, tc, tp] = await Promise.all([getTranslations("help"), getTranslations("common"), getTranslations("pages")]);
  const wa = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(tc("whatsappMessage"))}`;
  const cards = [
    { href: "/account/orders", icon: BagIcon, title: t("ordersTitle"), body: t("ordersBody"), tone: "bg-[#3b82f6]/25 text-[#93c5fd]" },
    { href: "/account/support", icon: ChatIcon, title: t("ticketTitle"), body: t("ticketBody"), tone: "bg-violet-500/20 text-violet-300" },
    { href: "/guides", icon: BookIcon, title: t("guideTitle"), body: t("guideBody"), tone: "bg-amber-500/20 text-amber-300" },
    ...(settings.marketEnabled ? [{ href: "/market", icon: TagIcon, title: t("marketTitle"), body: t("marketBody"), tone: "bg-red-500/20 text-red-300" }] : []),
    { href: "/contact", icon: PinIcon, title: tc("contact"), body: t("contactBody"), tone: "bg-emerald-500/20 text-emerald-300" },
  ];
  return (
    <section className="mt-12">
      <p className="eyebrow text-[#60a5fa]">{t("channelsEyebrow")}</p>
      <h2 className="display mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{t("channelsTitle")}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* WhatsApp first and biggest: it's the fastest way */}
        <div className="flex flex-col rounded-2xl border border-[#1fa855]/40 bg-gradient-to-b from-[#1fa855]/15 to-surface/80 p-5 sm:col-span-2 lg:col-span-1 lg:row-span-2">
          <div className="flex items-center justify-between gap-2">
            <span className="grid size-11 place-items-center rounded-xl bg-[#1fa855] text-white"><WhatsAppIcon /></span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-400" /> WhatsApp</span>
          </div>
          <b className="display mt-3 text-lg">{tc("whatsappHelp")}</b>
          <a href={wa} target="_blank" rel="noopener" className="mt-0.5 font-mono text-sm font-semibold text-emerald-300">+{settings.whatsappNumber}</a>
          <p className="mt-2 text-sm text-muted">{t("waBody")}</p>
          <dl className="mt-3 rounded-xl bg-bg/50 px-3 py-2 text-xs">
            <dt className="text-muted">{tp("hours")}</dt>
            <dd className="font-semibold">{settings.supportHours}</dd>
          </dl>
          <a href={wa} target="_blank" rel="noopener" className="btn mt-4 min-h-12 bg-[#1fa855] text-white hover:bg-[#178a45] lg:mt-auto">
            <WhatsAppIcon width={18} height={18} /> {t("chatNow")}
          </a>
        </div>
        {cards.map(({ href, icon: Icon, title, body, tone }) => (
          <Link key={href} href={href} className="group flex flex-col rounded-2xl border border-border bg-surface/80 p-5 transition-colors hover:border-[#3b82f6]/50">
            <span className={`grid size-11 place-items-center rounded-xl ${tone}`}><Icon /></span>
            <b className="display mt-3">{title}</b>
            <span className="mt-1 text-sm text-muted">{body}</span>
            <span className="mt-3 text-sm font-bold text-[#60a5fa] transition-transform group-hover:translate-x-0.5">{t("open")} →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
