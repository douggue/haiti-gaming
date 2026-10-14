import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getBalances } from "@/lib/ledger";
import { getSettings } from "@/lib/settings";
import { CheckoutForm } from "@/components/cart/CheckoutForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("title"), robots: { index: false } };
}

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser(locale, `/${locale}/checkout`);
  const [balances, settings] = await Promise.all([getBalances(prisma, user.id), getSettings()]);
  return (
    <div className="container-page py-8 sm:py-12">
      <CheckoutForm
        balances={{ HTG: balances.HTG.available, USD: balances.USD.available }}
        moncashEnabled={settings.moncashEnabled}
        natcashEnabled={settings.natcashEnabled}
      />
    </div>
  );
}
