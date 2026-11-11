import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContentPage } from "@/components/ContentPage";
import { pageSeo } from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import { ArrowRightIcon, BoltIcon, ChatIcon, PinIcon, ShieldIcon } from "@/components/Icons";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return pageSeo(locale, "/about", t("aboutTitle"));
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  const [t, th, tc, tu] = await Promise.all([getTranslations("pages"), getTranslations("home"), getTranslations("common"), getTranslations("authUi")]);
  const values = [
    [BoltIcon, "trustDelivery", "bg-emerald-500/20 text-emerald-300"],
    [ShieldIcon, "trustSecure", "bg-[#3b82f6]/25 text-[#93c5fd]"],
    [ChatIcon, "trustSupport", "bg-violet-500/20 text-violet-300"],
    [PinIcon, "trustLocal", "bg-red-500/20 text-red-300"],
  ] as const;
  return (
    <ContentPage title={t("aboutTitle")} eyebrow={`🇭🇹 ${tu("madeInHaiti")}`} intro={t("aboutBody")} wide>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {values.map(([Icon, k, tone]) => (
          <li key={k} className="rounded-2xl border border-border bg-surface/80 p-5">
            <span className={`grid size-11 place-items-center rounded-xl ${tone}`}><Icon /></span>
            <b className="display mt-3 block">{th(k)}</b>
            <span className="mt-1 block text-sm text-muted">{th(`${k}Body`)}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        <Link href="/store" className="btn-primary min-h-12 px-6">{tc("store")} <ArrowRightIcon width={18} height={18} /></Link>
        <Link href="/contact" className="btn-secondary min-h-12 px-6">{tc("contact")}</Link>
      </div>
    </ContentPage>
  );
}
