"use client";
import { Link, usePathname } from "@/i18n/navigation";
import { SignOutButton } from "./HeaderClient";
import { BagIcon, BellIcon, ChatIcon, GiftIcon, HeadsetIcon, HomeIcon, LockIcon, ShieldIcon, TagIcon, UserIcon, WalletIcon } from "./Icons";

const ICONS = { home: HomeIcon, orders: BagIcon, wallet: WalletIcon, support: HeadsetIcon, bell: BellIcon, gift: GiftIcon, user: UserIcon, shield: ShieldIcon, lock: LockIcon, market: TagIcon, chat: ChatIcon };

/**
 * Computers: the account sidebar. Phones: no second menu (the bottom bar and the dashboard list already lead
 * everywhere) — only "← Account" on the pages one level down; deeper pages have their own back link.
 */
export function AccountNav({ items, backLabel }: { items: { href: string; label: string; icon: string }[]; backLabel: string }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/account" ? pathname === "/account" : pathname.startsWith(href));
  const depth = pathname.split("/").filter(Boolean).length;
  return (
    <>
      {depth === 2 && (
        <Link href="/account" className="-mb-3 inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-semibold text-muted hover:text-text lg:hidden" data-testid="account-back">
          <span aria-hidden>←</span> {backLabel}
        </Link>
      )}
      <nav aria-label="Account" className="hidden min-w-0 lg:sticky lg:top-24 lg:block lg:h-fit">
        <ul className="flex flex-col gap-1">
          {items.map((i) => {
            const Icon = ICONS[i.icon as keyof typeof ICONS] ?? HomeIcon;
            return (
              <li key={i.href}>
                <Link
                  href={i.href}
                  aria-current={active(i.href) ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-colors ${active(i.href) ? "border-[#3b82f6]/50 bg-[#1d4ed8]/20 text-[#93c5fd] " : "border-transparent text-muted hover:bg-surface-2 hover:text-text"}`}
                >
                  <Icon width={17} height={17} />
                  {i.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-4">
          <SignOutButton className="btn-ghost w-full justify-start text-muted" />
        </div>
      </nav>
    </>
  );
}
