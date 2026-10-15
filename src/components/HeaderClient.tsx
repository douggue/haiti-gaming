"use client";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Flag } from "./Flags";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, locales, type Locale } from "@/i18n/routing";
import { setCurrency, saveLocalePreference } from "@/actions/prefs";
import { authClient } from "@/lib/auth-client";
import { useStore } from "./cart/CartProvider";
import { BagIcon, BookIcon, CartIcon, CloseIcon, FileIcon, HelpIcon, HomeIcon, MenuIcon, MoonIcon, NewsIcon, StoreIcon, SunIcon, TagIcon, UserIcon, WalletIcon } from "./Icons";

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

/** HTG | USD toggle: prices everywhere switch at once; the choice is remembered (cookie and profile). */
export function CurrencySwitch({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("common");
  const { currency } = useStore();
  const [shown, setShown] = useState(currency);
  const [pending, start] = useTransition();
  useEffect(() => setShown(currency), [currency]);
  const pick = (c: "HTG" | "USD") => {
    if (c === shown || pending) return;
    setShown(c); // highlight at once; prices update when the page refreshes
    start(() => setCurrency(c));
  };
  return (
    <div role="radiogroup" aria-label={t("currency")} className={`inline-flex shrink-0 rounded-full border border-border bg-surface-2 p-0.5 ${pending ? "opacity-70" : ""}`}>
      {(["HTG", "USD"] as const).map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={shown === c}
          onClick={() => pick(c)}
          className={`rounded-full font-bold transition-colors ${compact ? "min-h-8 px-2 text-[11px]" : "min-h-9 px-3 text-xs"} ${shown === c ? "bg-primary text-white shadow-sm" : "text-muted hover:text-text"}`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

/** Switch language and stay on the same page; signed-in customers keep the choice on their account. */
function useChangeLocale() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const [pending, start] = useTransition();
  const change = (next: Locale) => {
    if (next === locale) return;
    start(() => {
      saveLocalePreference(next);
      // @ts-expect-error -- params are compatible with the current pathname
      router.replace({ pathname, params }, { locale: next });
    });
  };
  return { locale, change, pending };
}

/** Header: the current flag; tapping it opens the four languages. */
export function LocaleSwitch() {
  const t = useTranslations("common");
  const { locale, change, pending } = useChangeLocale();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t("language")}: ${localeNames[locale]}`}
        className={`grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-2 transition-transform hover:scale-105 ${pending ? "opacity-60" : ""}`}
      >
        <Flag locale={locale} size={24} />
      </button>
      {open && (
        <ul role="listbox" aria-label={t("language")} className="animate-rise absolute right-0 top-11 z-50 w-44 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-2xl">
          {locales.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={l === locale}
                onClick={() => {
                  setOpen(false);
                  change(l);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${l === locale ? "bg-primary-soft text-primary" : "hover:bg-surface-2"}`}
              >
                <Flag locale={l} size={22} />
                {localeNames[l]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Row of four flags (menu, sign-in and sign-up pages): one tap changes the language. */
export function LanguageFlags({ className = "" }: { className?: string }) {
  const t = useTranslations("common");
  const { locale, change, pending } = useChangeLocale();
  return (
    <div role="radiogroup" aria-label={t("language")} className={`flex items-center gap-2 ${pending ? "opacity-60" : ""} ${className}`}>
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={l === locale}
          aria-label={localeNames[l]}
          title={localeNames[l]}
          onClick={() => change(l)}
          className={`grid h-10 w-10 place-items-center rounded-full border-2 transition-transform hover:scale-110 ${l === locale ? "border-primary bg-primary-soft shadow-[0_0_14px_var(--glow)]" : "border-transparent opacity-70 hover:opacity-100"}`}
        >
          <Flag locale={l} size={26} />
        </button>
      ))}
    </div>
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

/** Icon for a menu link, chosen from its address (custom menu links get a page icon). */
function navIcon(href: string) {
  if (href === "/" || href === "") return HomeIcon;
  if (href.startsWith("/store")) return StoreIcon;
  if (href.startsWith("/categor")) return TagIcon;
  if (href.startsWith("/guide")) return BookIcon;
  if (href.startsWith("/news")) return NewsIcon;
  if (href.startsWith("/faq") || href.startsWith("/help") || href.startsWith("/support")) return HelpIcon;
  if (href.startsWith("/account/wallet")) return WalletIcon;
  if (href.startsWith("/account/orders")) return BagIcon;
  if (href.startsWith("/account")) return UserIcon;
  return FileIcon;
}

function MenuLink({ href, label }: { href: string; label: string }) {
  const Icon = navIcon(href);
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-2xl px-2 py-2 font-semibold hover:bg-surface-2">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary transition-transform group-hover:scale-105">
        <Icon width={20} height={20} />
      </span>
      <span className="flex-1">{label}</span>
      <span className="text-muted transition-transform group-hover:translate-x-0.5" aria-hidden>›</span>
    </Link>
  );
}

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
      <button type="button" className="btn-ghost min-h-10 px-2 sm:px-2.5 md:hidden" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(true)}>
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
            {nav.map((n) => <MenuLink key={n.href} href={n.href} label={n.label} />)}
            <div className="my-3 border-t border-border" />
            {signedIn ? (
              <>
                <MenuLink href="/account" label={t("account")} />
                <MenuLink href="/account/wallet" label={t("wallet")} />
                <MenuLink href="/account/orders" label={t("orders")} />
                <SignOutButton className="btn-secondary mt-2" />
              </>
            ) : (
              <div className="grid gap-2">
                <Link href="/auth/login" className="btn-secondary">{t("signIn")}</Link>
                <Link href="/auth/register" className="btn-primary">{t("signUp")}</Link>
              </div>
            )}
            <div className="mt-auto space-y-3 rounded-2xl border border-border bg-surface-2/60 p-3">
              <LanguageFlags className="justify-between" />
              <div className="flex items-center justify-between gap-2">
                <CurrencySwitch />
                <ThemeToggle withLabel />
              </div>
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
