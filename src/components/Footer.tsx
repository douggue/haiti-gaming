import { unstable_cache } from "next/cache";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Settings } from "@/lib/settings";
import { Logo } from "./Logo";
import { PinIcon, WhatsAppIcon } from "./Icons";
import { DataSaverToggle } from "./DataSaverToggle";
import { PayLogo } from "./PayLogo";
import { InstallLink } from "./InstallPrompt";
import { NewsletterForm } from "./NewsletterForm";
import { prisma } from "@/lib/db";
import { t as txt } from "@/lib/text";
import { getLocale } from "next-intl/server";

const footerPages = unstable_cache(
  () => prisma.page.findMany({ where: { isPublished: true, showInFooter: true }, select: { slug: true, title: true }, orderBy: { createdAt: "asc" } }),
  ["footer-pages"],
  { tags: ["pages"], revalidate: 300 },
);

export async function Footer({ settings, signedIn = false }: { settings: Settings; signedIn?: boolean }) {
  const t = await getTranslations("common");
  const tp = await getTranslations("pages");
  const tf = await getTranslations("footer");
  const locale = await getLocale();
  const pages = await footerPages();
  const extra = settings.navigation?.footer ?? [];
  const socials = [
    ["Facebook", settings.socialFacebook],
    ["Instagram", settings.socialInstagram],
    ["TikTok", settings.socialTiktok],
  ].filter(([, url]) => url);

  const wa = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(t("whatsappMessage"))}`;
  const head = "mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-text";
  const link = "inline-block py-2 transition-colors hover:text-text";

  return (
    <footer className="mt-20 border-t border-border bg-surface/80 backdrop-blur">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_1fr_1fr_1.6fr]">
        <div className="space-y-4 sm:col-span-2 lg:col-span-1">
          <Logo src={settings.logoUrl} darkSrc={settings.logoDarkUrl} alt={settings.businessName} />
          <p className="max-w-xs text-sm text-muted">{t("footerTagline")}</p>
          <p className="flex items-start gap-2 text-sm text-muted">
            <PinIcon width={16} height={16} className="mt-0.5 shrink-0" />
            <span>
              {settings.businessName} · {settings.businessAddress}
            </span>
          </p>
          <a href={wa} target="_blank" rel="noopener" className="bg-wa inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold">
            <WhatsAppIcon width={18} height={18} /> +{settings.whatsappNumber}
          </a>
        </div>
        <div>
          <h2 className={head}>{t("store")}</h2>
          <ul className="text-sm text-muted">
            <li><Link href="/store" className={link}>{t("store")}</Link></li>
            <li><Link href="/categories" className={link}>{t("categories")}</Link></li>
            {settings.marketEnabled && <li><Link href="/market" className={link}>{t("market")}</Link></li>}
            <li><Link href="/news" className={link}>{t("news")}</Link></li>
            <li><Link href="/account/wallet" className={link}>{t("wallet")}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className={head}>{t("help")}</h2>
          <ul className="text-sm text-muted">
            <li><Link href="/guides" className={link}>{t("guides")}</Link></li>
            <li><Link href="/faq" className={link}>{t("faq")}</Link></li>
            <li><Link href="/contact" className={link}>{t("contact")}</Link></li>
            <li><Link href="/about" className={link}>{t("about")}</Link></li>
            <li>
              <a href={`https://wa.me/${settings.whatsappNumber}`} className={link} rel="noopener" target="_blank">
                {t("whatsappHelp")}
              </a>
            </li>
            <li className="text-xs">{tp("hours")}: {settings.supportHours}</li>
          </ul>
        </div>
        <div>
          <h2 className={head}>Legal</h2>
          <ul className="text-sm text-muted">
            <li><Link href="/terms" className={link}>{t("terms")}</Link></li>
            <li><Link href="/privacy" className={link}>{t("privacy")}</Link></li>
            <li><Link href="/refunds" className={link}>{t("refunds")}</Link></li>
            {pages.map((p) => <li key={p.slug}><Link href={`/p/${p.slug}`} className={link}>{txt(p.title, locale)}</Link></li>)}
            {extra.map((l) => <li key={l.href}>{l.href.startsWith("https://") ? <a href={l.href} rel="noopener" target="_blank" className={link}>{txt(l.label, locale)}</a> : <Link href={l.href} className={link}>{txt(l.label, locale)}</Link>}</li>)}
          </ul>
          {socials.length > 0 && (
            <>
              <h2 className={`${head} mt-6`}>{t("followUs")}</h2>
              <ul className="flex flex-wrap gap-3 text-sm text-muted">
                {socials.map(([name, url]) => (
                  <li key={name}><a href={url} rel="noopener" target="_blank" className={link}>{name}</a></li>
                ))}
              </ul>
            </>
          )}
        </div>
        {/* Accepted payments + data saver */}
        <div className="space-y-4 sm:col-span-2 lg:col-span-1">
          <h2 className={head}>{t("acceptedPayments")}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <PayLogo brand="moncash" height={26} />
            <PayLogo brand="natcash" height={26} />
          </div>
          {/* Signed-in customers have this switch in Account → settings (one place per page) */}
          {!signedIn && (
            <div className="rounded-2xl border border-border bg-surface-2/60 p-3">
              <DataSaverToggle />
            </div>
          )}
          <InstallLink />
        </div>
      </div>
      {settings.newsletterEnabled && <div className="container-page pb-6"><NewsletterForm /></div>}
      <div className="border-t border-border">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-center text-xs text-muted sm:flex-row sm:text-left">
          <span>© {new Date().getFullYear()} {settings.businessName}. {t("rights")}</span>
          <span>🇭🇹 {tf("madeWithPride")}</span>
        </div>
      </div>
    </footer>
  );
}
