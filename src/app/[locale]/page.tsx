import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategories, searchProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { t } from "@/lib/text";
import { ProductCard } from "@/components/ProductCard";
import { ArrowRightIcon, BoltIcon, ChatIcon, PinIcon, ShieldIcon, WalletIcon } from "@/components/Icons";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [th, tc, tf, featured, categories, settings] = await Promise.all([
    getTranslations("home"),
    getTranslations("common"),
    getTranslations("faq"),
    searchProducts({ featured: true, take: 8 }),
    getCategories(),
    getSettings(),
  ]);

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.businessName,
    url: process.env.NEXT_PUBLIC_SITE_URL,
    address: settings.businessAddress,
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [1, 2, 3, 4].map((i) => ({
      "@type": "Question",
      name: tf(`q${i}`),
      acceptedAnswer: { "@type": "Answer", text: tf(`a${i}`) },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([orgJsonLd, faqJsonLd]) }} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-midnight text-white">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/40 blur-3xl" />
          <div className="absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-[#2b4fa8]/30 blur-3xl" />
          <svg className="absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden>
            <defs>
              <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M32 0H0v32" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="container-page relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="animate-rise">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#a9c4ff]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
              {th("eyebrow")}
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">{th("heroTitle")}</h1>
            <p className="mt-5 max-w-xl text-base text-[#c4d2ee] sm:text-lg">{th("heroSubtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/store" className="btn-primary min-h-12 px-6 text-base">
                {tc("shopNow")} <ArrowRightIcon width={18} height={18} />
              </Link>
              <Link href="/categories" className="btn min-h-12 border border-white/20 px-6 text-base text-white hover:bg-white/10">
                {tc("browseCategories")}
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-[#c4d2ee]">
              <span className="rounded-lg bg-[#e30613] px-2.5 py-1 text-xs font-extrabold tracking-wide text-white">MonCash</span>
              <span className="rounded-lg bg-[#f7a400] px-2.5 py-1 text-xs font-extrabold tracking-wide text-midnight">NatCash</span>
              <Link href="/guides" className="underline-offset-4 hover:text-white hover:underline">{th("payGuideLink")}</Link>
            </div>
          </div>
          <div className="relative hidden lg:block" aria-hidden>
            <div className="animate-rise rounded-3xl border border-white/10 bg-gradient-to-br from-navy to-midnight p-6 shadow-2xl [animation-delay:120ms]">
              <div className="flex items-center justify-between text-sm text-[#a9c4ff]">
                <span>{tc("wallet")}</span>
                <WalletIcon />
              </div>
              <p className="mt-6 text-4xl font-extrabold">12 450 <span className="text-lg font-semibold text-[#a9c4ff]">HTG</span></p>
              <p className="mt-1 text-sm text-[#7b92b8]">≈ $94.68 USD</p>
              <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
                {["+ HTG", "⇄ USD", "🎮"].map((x) => (
                  <span key={x} className="rounded-xl bg-white/5 py-3 font-semibold">{x}</span>
                ))}
              </div>
            </div>
            <div className="animate-rise absolute -bottom-6 -left-8 rounded-2xl border border-white/10 bg-surface p-4 text-text shadow-xl [animation-delay:240ms]">
              <p className="flex items-center gap-2 text-sm font-semibold"><BoltIcon className="text-success" width={16} height={16} /> 310 💎 Free Fire</p>
              <p className="mt-1 text-xs text-muted">✓ {th("trustDelivery")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-page mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight">{th("categoriesTitle")}</h2>
          <Link href="/categories" className="text-sm font-semibold text-primary">{tc("viewAll")}</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories.map((c) => (
            <Link key={c.id} href={`/categories/${c.slug}`} className="card lift flex items-center gap-3 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-xl" aria-hidden>{c.icon}</span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{t(c.name, locale)}</span>
                <span className="text-xs text-muted">{c._count.products}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="container-page mt-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight">{th("featured")}</h2>
          <Link href="/store" className="text-sm font-semibold text-primary">{tc("viewAll")}</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container-page mt-16">
        <div className="card overflow-hidden p-6 sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight">{th("howToPayTitle")}</h2>
          <p className="mt-1 text-muted">{th("howToPaySubtitle")}</p>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <li key={i} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary font-bold text-white">{i}</span>
                <div>
                  <h3 className="font-semibold">{th(`step${i}Title`)}</h3>
                  <p className="mt-1 text-sm text-muted">{th(`step${i}Body`)}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link href="/guides" className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            {th("payGuideLink")} <ArrowRightIcon width={16} height={16} />
          </Link>
        </div>
      </section>

      {/* Wallet promo */}
      <section className="container-page mt-6">
        <div className="flex flex-col items-start gap-5 rounded-2xl bg-navy p-6 text-white sm:flex-row sm:items-center sm:p-8">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary"><WalletIcon /></span>
          <div className="flex-1">
            <h2 className="text-lg font-bold">{th("walletTitle")}</h2>
            <p className="mt-1 text-sm text-[#c4d2ee]">{th("walletBody")}</p>
          </div>
          <Link href="/account/wallet" className="btn bg-white text-navy hover:bg-[#e6efff]">{th("walletCta")}</Link>
        </div>
      </section>

      {/* Trust */}
      <section className="container-page mt-16">
        <h2 className="text-2xl font-bold tracking-tight">{th("trustTitle")}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [BoltIcon, "trustDelivery"],
            [ShieldIcon, "trustSecure"],
            [ChatIcon, "trustSupport"],
            [PinIcon, "trustLocal"],
          ].map(([Icon, key]) => {
            const I = Icon as typeof BoltIcon;
            const k = key as string;
            return (
              <div key={k} className="card p-5">
                <I className="text-primary" />
                <h3 className="mt-3 font-semibold">{th(k)}</h3>
                <p className="mt-1 text-sm text-muted">{th(`${k}Body`)}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-muted">
          {settings.businessName} · {settings.businessAddress} · {settings.supportHours}
        </p>
      </section>

      {/* FAQ */}
      <section className="container-page mt-16">
        <h2 className="text-2xl font-bold tracking-tight">{th("faqTitle")}</h2>
        <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface">
          {[1, 2, 3, 4].map((i) => (
            <details key={i} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {tf(`q${i}`)}
                <span className="text-muted transition-transform group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="mt-3 text-sm text-muted">{tf(`a${i}`)}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
