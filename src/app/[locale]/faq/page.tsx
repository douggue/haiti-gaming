import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageSeo } from "@/lib/seo";
import { getDisplaySettings } from "@/lib/settings";
import { HelpSearch } from "@/components/HelpCenter";
import { HelpChannels } from "@/components/HelpChannels";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return pageSeo(locale, "/faq", t("faqTitle"));
}

/** Help center: search + questions, then the ways to reach the team. */
export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  const [t, tf, settings] = await Promise.all([getTranslations("help"), getTranslations("faq"), getDisplaySettings()]);
  // Each question gets a small colored tag naming its topic
  const tags = [
    [t("tagDelivery"), "bg-emerald-500/20 text-emerald-300"],
    [t("tagPayment"), "bg-[#831843]/50 text-pink-200"],
    [t("tagWallet"), "bg-[#3b82f6]/25 text-[#93c5fd]"],
    [t("tagOrder"), "bg-amber-500/20 text-amber-300"],
  ] as const;
  const items = [1, 2, 3, 4].map((i) => ({ q: tf(`q${i}`), a: tf(`a${i}`), tag: tags[i - 1][0], tone: tags[i - 1][1] }));
  const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })) };
  return (
    <div className="container-page py-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#1d4ed8]/25 via-surface/70 to-[#7c3aed]/15 px-5 pb-14 pt-8 text-center sm:px-8 sm:pb-16 sm:pt-12">
        <span aria-hidden className="ds-hide pointer-events-none absolute -left-16 -top-20 size-64 rounded-full bg-[#3b82f6]/25 blur-3xl" />
        <span aria-hidden className="ds-hide pointer-events-none absolute -bottom-24 -right-10 size-64 rounded-full bg-[#7c3aed]/25 blur-3xl" />
        <p className="relative inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-300">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> {t("heroEyebrow")}
        </p>
        <h1 className="display relative mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">{t("heroTitle")}</h1>
        <p className="relative mx-auto mt-2 max-w-2xl text-sm text-muted sm:text-base">{t("heroBody")}</p>
      </header>
      {/* The search box sits on the edge of the header card */}
      <div className="relative z-10 -mt-[3.25rem] px-2">
        <HelpSearch items={items} />
      </div>
      <HelpChannels settings={settings} />
    </div>
  );
}
