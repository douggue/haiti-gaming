"use client";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, locales, type Locale } from "@/i18n/routing";
import { setCurrency, saveLocalePreference } from "@/actions/prefs";
import { authClient } from "@/lib/auth-client";
import { useStore } from "./cart/CartProvider";
import { CartIcon, CloseIcon, HomeIcon, MenuIcon, MoonIcon, StoreIcon, SunIcon, UserIcon, WalletIcon } from "./Icons";

export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const t = useTranslations("common");
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("hg_theme", next ? "dark" : "light");
    } catch {}
  }
  return (
    <button type="button" onClick={toggle} className="btn-ghost min-h-10 px-2.5" aria-label={`${t("theme")}: ${dark ? t("dark") : t("light")}`}>
      {dark ? <SunIcon /> : <MoonIcon />}
      {withLabel && <span>{dark ? t("light") : t("dark")}</span>}
    </button>
  );
}

export function CurrencySwitch() {
  const t = useTranslations("common");
  const { currency } = useStore();
  const [pending, start] = useTransition();
  return (
    <label className="relative">
      <span className="sr-only">{t("currency")}</span>
      <select
        value={currency}
        disabled={pending}
        onChange={(e) => start(() => setCurrency(e.target.value as "HTG" | "USD"))}
        className="min-h-10 cursor-pointer appearance-none rounded-lg border border-border bg-surface px-2.5 text-sm font-semibold"
      >
        <option value="HTG">HTG</option>
        <option value="USD">USD</option>
      </select>
    </label>
  );
}

export function LocaleSwitch() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label>
      <span className="sr-only">{t("language")}</span>
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Locale;
          start(() => {
            saveLocalePreference(next);
            // @ts-expect-error -- params are compatible with the current pathname
            router.replace({ pathname, params }, { locale: next });
          });
        }}
        className="min-h-10 cursor-pointer appearance-none rounded-lg border border-border bg-surface px-2.5 text-sm font-semibold"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {l.toUpperCase()} · {localeNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CartButton() {
  const t = useTranslations("common");
  const { count, ready } = useStore();
  return (
    <Link href="/cart" className="btn-ghost relative min-h-10 px-2.5" aria-label={`${t("cart")} (${count})`}>
      <CartIcon />
      {ready && count > 0 && (
        <span key={count} className="pop absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-white shadow-[0_0_10px_var(--glow)]">
          {count}
        </span>
      )}
    </Link>
  );
}

export function SignOutButton({ className = "btn-secondary" }: { className?: string }) {
  const t = useTranslations("common");
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      {t("signOut")}
    </button>
  );
}

type NavItem = { href: string; label: string };

export function MobileMenu({ nav, signedIn, name }: { nav: NavItem[]; signedIn: boolean; name?: string }) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" className="btn-ghost min-h-10 px-2.5 md:hidden" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(true)}>
        <MenuIcon />
        <span className="sr-only">{t("menu")}</span>
      </button>
      {/* Rendered into <body>: the header's backdrop blur would otherwise trap this fixed panel inside the 64px header. */}
      {open && mounted && createPortal(
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" id="mobile-menu">
          <button type="button" aria-label={t("close")} className="absolute inset-0 bg-midnight/60" onClick={() => setOpen(false)} />
          <div className="animate-rise absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col gap-1 overflow-y-auto bg-surface p-4 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">{name ?? t("menu")}</span>
              <button type="button" className="btn-ghost min-h-10 px-2.5" onClick={() => setOpen(false)}>
                <CloseIcon />
                <span className="sr-only">{t("close")}</span>
              </button>
            </div>
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-xl px-3 py-3 font-medium hover:bg-surface-2">
                {n.label}
              </Link>
            ))}
            <div className="my-3 border-t border-border" />
            {signedIn ? (
              <>
                <Link href="/account" className="rounded-xl px-3 py-3 font-medium hover:bg-surface-2">{t("account")}</Link>
                <Link href="/account/wallet" className="rounded-xl px-3 py-3 font-medium hover:bg-surface-2">{t("wallet")}</Link>
                <Link href="/account/orders" className="rounded-xl px-3 py-3 font-medium hover:bg-surface-2">{t("orders")}</Link>
                <SignOutButton className="btn-secondary mt-2" />
              </>
            ) : (
              <div className="grid gap-2">
                <Link href="/auth/login" className="btn-secondary">{t("signIn")}</Link>
                <Link href="/auth/register" className="btn-primary">{t("signUp")}</Link>
              </div>
            )}
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-6">
              <LocaleSwitch />
              <CurrencySwitch />
              <ThemeToggle withLabel />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/** Phone-only bottom navigation: the five places customers go most. */
export function BottomNav({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const { count, ready } = useStore();
  const items = [
    { href: "/", label: t("home"), icon: HomeIcon, active: pathname === "/" },
    { href: "/store", label: t("store"), icon: StoreIcon, active: pathname.startsWith("/store") || pathname.startsWith("/categories") || pathname.startsWith("/products") },
    { href: "/cart", label: t("cart"), icon: CartIcon, active: pathname.startsWith("/cart") || pathname.startsWith("/checkout"), badge: ready ? count : 0 },
    { href: signedIn ? "/account/wallet" : "/auth/login?next=/account/wallet", label: t("wallet"), icon: WalletIcon, active: pathname.startsWith("/account/wallet") },
    { href: signedIn ? "/account" : "/auth/login", label: signedIn ? t("account") : t("signIn"), icon: UserIcon, active: (pathname.startsWith("/account") && !pathname.startsWith("/account/wallet")) || pathname.startsWith("/auth") },
  ];
  return (
    <nav
      aria-label={t("menu")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", paddingLeft: "env(safe-area-inset-left, 0px)", paddingRight: "env(safe-area-inset-right, 0px)" }}
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {items.map(({ href, label, icon: Icon, active, badge }) => (
          <li key={label} className="min-w-0">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${active ? "text-primary" : "text-muted hover:text-text"}`}
            >
              <span className={`relative grid h-7 w-12 place-items-center rounded-full transition-colors ${active ? "bg-primary-soft" : ""}`}>
                <Icon width={20} height={20} />
                {!!badge && (
                  <span key={badge} className="pop absolute -right-0.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">{badge}</span>
                )}
              </span>
              <span className="max-w-full truncate px-1">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
