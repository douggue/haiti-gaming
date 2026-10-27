import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { AccountNav } from "@/components/AccountNav";
import { getSettings } from "@/lib/settings";
import { getUser } from "@/lib/session";
import { unreadChatIds } from "@/lib/market-data";

export const metadata = { robots: { index: false } };

export default async function AccountLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUser(locale, `/${locale}/account`);
  const [ta, tc, tn] = await Promise.all([getTranslations("account"), getTranslations("common"), getTranslations("notifications")]);
  const settings = await getSettings();
  const user = await getUser();
  const unread = settings.marketEnabled && user ? (await unreadChatIds(user.id)).size : 0;
  // Most used first: on phones the row scrolls sideways, so Support stays in view.
  const items = [
    { href: "/account", label: ta("dashboard"), icon: "home" },
    { href: "/account/orders", label: tc("orders"), icon: "orders" },
    { href: "/account/wallet", label: tc("wallet"), icon: "wallet" },
    { href: "/account/support", label: ta("support"), icon: "support" },
    ...(settings.marketEnabled
      ? [
          { href: "/account/messages", label: unread ? `${ta("messages")} (${unread})` : ta("messages"), icon: "chat" },
          { href: "/account/market", label: ta("market"), icon: "market" },
        ]
      : []),
    { href: "/account/notifications", label: tn("title"), icon: "bell" },
    ...(settings.referralEnabled ? [{ href: "/account/referrals", label: ta("referrals"), icon: "gift" }] : []),
    { href: "/account/profile", label: ta("profile"), icon: "user" },
    { href: "/account/security", label: ta("security"), icon: "shield" },
    { href: "/account/privacy", label: ta("privacy"), icon: "lock" },
  ];
  return (
    <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-6 py-6 sm:py-10 lg:grid-cols-[220px_minmax(0,1fr)]">
      <AccountNav items={items} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
