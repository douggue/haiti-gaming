import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContentPage } from "@/components/ContentPage";
import { Link } from "@/i18n/navigation";
import { pageSeo } from "@/lib/seo";
import { getDisplaySettings } from "@/lib/settings";
import { BookIcon, ChatIcon, HeadsetIcon, PinIcon, WhatsAppIcon } from "@/components/Icons";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return pageSeo(locale, "/contact", t("contactTitle"));
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  const [t, th, tc, s] = await Promise.all([getTranslations("pages"), getTranslations("help"), getTranslations("common"), getDisplaySettings()]);
  const wa = `https://wa.me/${s.whatsappNumber}?text=${encodeURIComponent(tc("whatsappMessage"))}`;
  return (
    <ContentPage title={t("contactTitle")} eyebrow={th("heroEyebrow")} intro={t("contactBody")} icon={<HeadsetIcon />} wide>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface/80 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-500/20 text-red-300"><PinIcon width={18} height={18} /></span>
          <span><dt className="text-xs text-muted">{t("address")}</dt><dd className="font-semibold">{s.businessName}, {s.businessAddress}</dd></span>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface/80 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-300" aria-hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span>
          <span><dt className="text-xs text-muted">{t("hours")}</dt><dd className="font-semibold">{s.supportHours}</dd></span>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface/80 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#1fa855]/25 text-emerald-300"><WhatsAppIcon width={18} height={18} /></span>
          <span><dt className="text-xs text-muted">WhatsApp</dt><dd className="font-mono font-semibold">+{s.whatsappNumber}</dd></span>
        </div>
      </dl>
      {/* Ways to reach us (the help center has the questions and the other help cards) */}
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <a href={wa} target="_blank" rel="noopener" className="btn min-h-12 bg-[#15803d] text-white hover:bg-[#166534]">
          <WhatsAppIcon width={18} height={18} /> {th("chatNow")}
        </a>
        <Link href="/account/support" className="btn-secondary min-h-12"><ChatIcon width={18} height={18} /> {th("ticketTitle")}</Link>
        <Link href="/faq" className="btn-secondary min-h-12"><BookIcon width={18} height={18} /> {tc("helpCenter")}</Link>
      </div>
    </ContentPage>
  );
}
