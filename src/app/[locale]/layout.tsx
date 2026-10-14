import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getSettings } from "@/lib/settings";
import { getDisplayCurrency } from "@/lib/prefs";
import { CartProvider } from "@/components/cart/CartProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { alternates } from "@/lib/seo";
import "../globals.css";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F7FC" },
    { media: "(prefers-color-scheme: dark)", color: "#050B18" },
  ],
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: t("title"), template: "%s · Haiti Gaming" },
    description: t("description"),
    alternates: alternates(locale, ""),
    openGraph: { siteName: "Haiti Gaming", locale, type: "website" },
    manifest: "/manifest.webmanifest",
    icons: { icon: "/icon.svg" },
  };
}

// Applies the saved theme before paint to avoid a flash.
const themeScript = `try{var t=localStorage.getItem('hg_theme');if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [settings, currency, t] = await Promise.all([getSettings(), getDisplayCurrency(), getTranslations("common")]);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <CartProvider currency={currency} htgPerUsd={settings.htgPerUsd}>
            <AnnouncementBar settings={settings} locale={locale} />
            <Header />
            <main id="main">{children}</main>
            <Footer settings={settings} />
            <WhatsAppButton number={settings.whatsappNumber} />
          </CartProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
