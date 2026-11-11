import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContentPage } from "@/components/ContentPage";
import { pageSeo } from "@/lib/seo";
import { getDisplaySettings } from "@/lib/settings";
import { PayLogo } from "@/components/PayLogo";
import { BookIcon, LockIcon, WhatsAppIcon } from "@/components/Icons";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return pageSeo(locale, "/guides", t("guidesTitle"));
}

/** A small picture of what the customer sees at that step (a field, a PIN box…). */
function Mini({ label, value, tone = "text-text", mono = true }: { label: string; value: React.ReactNode; tone?: string; mono?: boolean }) {
  return (
    <div className="mt-3 rounded-xl border border-border bg-bg/60 px-3 py-2" aria-hidden>
      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">{label}</span>
      <span className={`mt-0.5 block text-sm font-bold ${mono ? "font-mono" : ""} ${tone}`}>{value}</span>
    </div>
  );
}

export default async function GuidesPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  const [t, tg, th, tc, s] = await Promise.all([getTranslations("pages"), getTranslations("guides"), getTranslations("home"), getTranslations("common"), getDisplaySettings()]);
  const guides = [
    {
      id: "moncash",
      title: t("guideMoncashTitle"),
      sub: tg("moncashSub"),
      steps: t.raw("guideMoncash") as string[],
      badge: <PayLogo brand="moncash" height={26} />,
      tone: "from-[#831843]/30",
      minis: [
        null,
        <Mini key="p" label={tg("exPhone")} value={<><span className="text-muted">+509</span> 3XXX XXXX</>} />,
        <Mini key="pin" label={tg("exPin")} value={<span className="inline-flex items-center gap-2"><LockIcon width={14} height={14} className="text-amber-300" /> • • • •</span>} />,
        <Mini key="ok" label="Haiti Gaming" value={<span className="inline-flex items-center gap-1.5"><span aria-hidden>✓</span> {tg("exConfirmed")}</span>} tone="text-emerald-300" mono={false} />,
      ],
    },
    {
      id: "natcash",
      title: t("guideNatcashTitle"),
      sub: tg("natcashSub"),
      steps: t.raw("guideNatcash") as string[],
      badge: <PayLogo brand="natcash" height={26} />,
      tone: "from-[#c2410c]/25",
      extra: `${s.natcashRecipientName} · ${s.natcashRecipientPhone}`,
      minis: [
        null,
        <Mini key="to" label={tg("exSendTo")} value={s.natcashRecipientPhone} />,
        <Mini key="ref" label={tg("exReference")} value="NC••••••••" />,
        <Mini key="ok" label="Haiti Gaming" value={<span className="inline-flex items-center gap-1.5"><span aria-hidden>✓</span> {tg("exChecked")}</span>} tone="text-emerald-300" mono={false} />,
      ],
    },
    {
      id: "player-id",
      title: t("guidePlayerIdTitle"),
      sub: tg("playerIdSub"),
      steps: t.raw("guidePlayerId") as string[],
      badge: <span className="grid size-[26px] place-items-center text-lg" aria-hidden>🎮</span>,
      tone: "from-[#1d4ed8]/25",
      minis: [null, <Mini key="id" label={tg("exPlayerId")} value="123456789" tone="text-[#93c5fd]" />, null],
    },
  ];
  const wa = `https://wa.me/${s.whatsappNumber}?text=${encodeURIComponent(tc("whatsappMessage"))}`;
  return (
    <ContentPage title={t("guidesTitle")} eyebrow={tg("eyebrow")} intro={tg("intro")} icon={<BookIcon />} wide>
      {/* Anti-fraud notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-400/40 border-l-4 border-l-amber-400 bg-amber-400/10 p-4 text-sm">
        <span className="text-xl" aria-hidden>⚠️</span>
        <p className="min-w-0 flex-1"><b className="block">{t("fraudTitle")}</b><span className="text-muted">{t("fraudBody")}</span></p>
        <span className="hidden shrink-0 items-center gap-1.5 self-center rounded-lg border border-amber-400/40 px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-amber-300 sm:inline-flex"><LockIcon width={13} height={13} /> {tg("noPin")}</span>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold">{tg("chooseMethod")}</p>
        <nav className="grid gap-2 sm:grid-cols-3">
          {guides.map((g) => (
            <a key={g.id} href={`#${g.id}`} className={`flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-br ${g.tone} to-surface/80 p-3 transition-colors hover:border-[#3b82f6]`}>
              <span className="shrink-0">{g.badge}</span>
              <span className="min-w-0">
                <b className="block text-sm">{g.title}</b>
                <span className="block text-xs text-muted">{g.sub}</span>
              </span>
            </a>
          ))}
        </nav>
      </div>

      {guides.map((g) => (
        <section key={g.id} id={g.id} className="scroll-mt-24 rounded-3xl border border-border bg-surface/80 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="display flex items-center gap-3 text-xl font-bold">{g.badge} {g.title}</h2>
            {g.extra && <p className="rounded-lg bg-surface-2 px-3 py-1.5 font-mono text-sm font-semibold">{g.extra}</p>}
          </div>
          <ol className={`mt-4 grid gap-3 sm:grid-cols-2 ${g.steps.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            {g.steps.map((step, i) => {
              const last = i === g.steps.length - 1;
              return (
                <li key={i} className="flex flex-col rounded-2xl border border-border bg-surface-2/60 p-4">
                  <span className={`eyebrow inline-block w-fit rounded-md px-2 py-0.5 ${last ? "bg-emerald-500/20 text-emerald-300" : "bg-red-600/20 text-red-300"}`}>{t("stepLabel")} {String(i + 1).padStart(2, "0")}</span>
                  <p className="mt-2 text-sm">{step}</p>
                  <div className="mt-auto">{g.minis[i]}</div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      {/* Still stuck: WhatsApp */}
      <section className="flex flex-col gap-4 rounded-3xl border border-[#1fa855]/40 bg-gradient-to-r from-[#1fa855]/15 via-surface/80 to-surface/80 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <b className="display block text-lg">{th("helpTitle")}</b>
          <span className="text-sm text-muted">{th("helpBody", { hours: s.supportHours })}</span>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a href={wa} target="_blank" rel="noopener" className="btn min-h-12 bg-[#1fa855] px-5 text-white hover:bg-[#178a45]"><WhatsAppIcon width={18} height={18} /> {tc("whatsappHelp")}</a>
          <Link href="/faq" className="btn-secondary min-h-12 px-5">{tc("faqShort")}</Link>
        </div>
      </section>
    </ContentPage>
  );
}
