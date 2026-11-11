import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContentPage } from "@/components/ContentPage";
import { HelpChannels } from "@/components/HelpChannels";
import { pageSeo } from "@/lib/seo";
import { getDisplaySettings } from "@/lib/settings";
import { HeadsetIcon, PinIcon, WhatsAppIcon } from "@/components/Icons";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return pageSeo(locale, "/contact", t("contactTitle"));
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  const [t, th, s] = await Promise.all([getTranslations("pages"), getTranslations("help"), getDisplaySettings()]);
  return (
    <ContentPage title={t("contactTitle")} eyebrow={th("heroEyebrow")} intro={t("contactBody")} icon={<HeadsetIcon />} wide>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface/80 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-500/20 text-red-300"><PinIcon width={18} height={18} /></span>
          <span><dt className="text-xs text-muted">{t("address")}</dt><dd className="font-semibold">{s.businessName}, {s.businessAddress}</dd></span>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface/80 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-300" aria-hidden>🕗</span>
          <span><dt className="text-xs text-muted">{t("hours")}</dt><dd className="font-semibold">{s.supportHours}</dd></span>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface/80 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#1fa855]/25 text-emerald-300"><WhatsAppIcon width={18} height={18} /></span>
          <span><dt className="text-xs text-muted">WhatsApp</dt><dd className="font-mono font-semibold">+{s.whatsappNumber}</dd></span>
        </div>
      </dl>
      <HelpChannels settings={s} />
    </ContentPage>
  );
}
