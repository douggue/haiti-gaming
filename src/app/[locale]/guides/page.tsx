import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContentPage } from "@/components/ContentPage";
import { pageSeo } from "@/lib/seo";
import { getDisplaySettings } from "@/lib/settings";
import { PayLogo } from "@/components/PayLogo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return pageSeo(locale, "/guides", t("guidesTitle"));
}

export default async function GuidesPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  const [t, s] = await Promise.all([getTranslations("pages"), getDisplaySettings()]);
  const guides = [
    { id: "moncash", title: t("guideMoncashTitle"), steps: t.raw("guideMoncash") as string[], badge: <PayLogo brand="moncash" height={26} /> },
    { id: "natcash", title: t("guideNatcashTitle"), steps: t.raw("guideNatcash") as string[], badge: <PayLogo brand="natcash" height={26} />, extra: `${s.natcashRecipientName} · ${s.natcashRecipientPhone}` },
    { id: "player-id", title: t("guidePlayerIdTitle"), steps: t.raw("guidePlayerId") as string[], badge: <span aria-hidden>🎮</span> },
  ];
  return (
    <ContentPage title={t("guidesTitle")}>
      {/* Anti-fraud notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
        <span className="text-xl" aria-hidden>⚠️</span>
        <p><b className="block">{t("fraudTitle")}</b><span className="text-muted">{t("fraudBody")}</span></p>
      </div>
      <nav className="grid gap-2 sm:grid-cols-3">
        {guides.map((g, i) => (
          <a key={g.id} href={`#${g.id}`} className={`flex items-center gap-3 rounded-2xl border-2 p-3 font-semibold transition-colors hover:border-[#3b82f6] ${i === 0 ? "border-[#3b82f6] bg-[#1d4ed8]/15" : "border-border bg-surface/80"}`}>
            <span className="shrink-0">{g.badge}</span>
            <span className="text-sm">{g.title}</span>
          </a>
        ))}
      </nav>
      {guides.map((g) => (
        <section key={g.id} id={g.id} className="scroll-mt-24 rounded-3xl border border-border bg-surface/80 p-5 sm:p-6">
          <h2 className="display flex items-center gap-3 text-xl font-bold">{g.badge} {g.title}</h2>
          {g.extra && <p className="mt-2 inline-block rounded-lg bg-surface-2 px-3 py-1.5 font-mono text-sm font-semibold">{g.extra}</p>}
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {g.steps.map((step, i) => (
              <li key={i} className="rounded-2xl border border-border bg-surface-2/60 p-4">
                <span className={`eyebrow inline-block rounded-md px-2 py-0.5 ${i === g.steps.length - 1 ? "bg-emerald-500/20 text-emerald-300" : "bg-red-600/20 text-red-300"}`}>{t("stepLabel")} 0{i + 1}</span>
                <p className="mt-2 text-sm">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </ContentPage>
  );
}
