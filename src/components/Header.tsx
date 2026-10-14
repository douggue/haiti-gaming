import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { isStaff } from "@/lib/permissions";
import { getDisplaySettings } from "@/lib/settings";
import { t as txt } from "@/lib/text";
import { Logo } from "./Logo";
import { BellIcon, SearchIcon, UserIcon } from "./Icons";
import { CartButton, CurrencySwitch, LocaleSwitch, MobileMenu, ThemeToggle } from "./HeaderClient";

export async function Header() {
  const t = await getTranslations("common");
  const locale = await getLocale();
  const [user, settings] = await Promise.all([getUser(), getDisplaySettings()]);
  const unread = user ? await prisma.notification.count({ where: { userId: user.id, readAt: null } }) : 0;
  const custom = settings.navigation?.header ?? [];
  const nav = custom.length ? custom.map((l) => ({ href: l.href, label: txt(l.label, locale) })) : [
    { href: "/store", label: t("store") },
    { href: "/categories", label: t("categories") },
    { href: "/guides", label: t("guides") },
    { href: "/news", label: t("news") },
    { href: "/faq", label: t("faq") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-3">
        <Link href="/" className="shrink-0">
          <Logo src={settings.logoUrl} darkSrc={settings.logoDarkUrl} alt={settings.businessName} />
        </Link>
        <nav className="ml-4 hidden min-w-0 shrink items-center gap-1 overflow-hidden md:flex" aria-label="Main">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-text">
              {n.label}
            </Link>
          ))}
        </nav>
        <form action={`/${locale}/store`} className="ml-auto hidden min-w-40 flex-1 2xl:block 2xl:max-w-xs" role="search">
          <label className="relative block">
            <span className="sr-only">{t("search")}</span>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" width={18} height={18} />
            <input name="q" type="search" placeholder={t("searchPlaceholder")} className="input min-h-10 pl-9" />
          </label>
        </form>
        <div className="ml-auto flex shrink-0 items-center gap-1 2xl:ml-2">
          <div className="hidden items-center gap-1.5 md:flex">
            <LocaleSwitch />
            <CurrencySwitch />
            <ThemeToggle />
          </div>
          <Link href="/store" className="btn-ghost min-h-10 px-2.5 2xl:hidden" aria-label={t("search")}>
            <SearchIcon />
          </Link>
          {user && (
            <Link href="/account/notifications" className="btn-ghost relative min-h-10 px-2.5" aria-label={`${t("notifications")} (${unread})`}>
              <BellIcon />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-surface" />}
            </Link>
          )}
          <CartButton />
          {user ? (
            <Link href="/account" className="btn-ghost hidden min-h-10 px-2.5 md:inline-flex" aria-label={t("account")}>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-navy text-xs font-bold text-white">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
            </Link>
          ) : (
            <Link href="/auth/login" className="btn-primary glow-btn hidden min-h-10 md:inline-flex">
              <UserIcon width={18} height={18} />
              {t("signIn")}
            </Link>
          )}
          {user && isStaff(user.role) && (
            <a href="/admin" className="btn-secondary hidden min-h-10 lg:inline-flex">{t("admin")}</a>
          )}
          <MobileMenu nav={nav} signedIn={!!user} name={user?.name} />
        </div>
      </div>
    </header>
  );
}
