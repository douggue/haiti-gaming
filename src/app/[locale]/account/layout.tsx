import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { AccountNav } from "@/components/AccountNav";

export const metadata = { robots: { index: false } };

export default async function AccountLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUser(locale, `/${locale}/account`);
  const [ta, tc, tn] = await Promise.all([getTranslations("account"), getTranslations("common"), getTranslations("notifications")]);
  const items = [
    { href: "/account", label: ta("dashboard") },
    { href: "/account/orders", label: tc("orders") },
    { href: "/account/wallet", label: tc("wallet") },
    { href: "/account/notifications", label: tn("title") },
    { href: "/account/profile", label: ta("profile") },
    { href: "/account/security", label: ta("security") },
  ];
  return (
    <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-6 py-6 sm:py-10 lg:grid-cols-[220px_minmax(0,1fr)]">
      <AccountNav items={items} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
