"use client";
import { Link, usePathname } from "@/i18n/navigation";
import { SignOutButton } from "./HeaderClient";
import { BagIcon, BellIcon, GiftIcon, HeadsetIcon, HomeIcon, LockIcon, ShieldIcon, UserIcon, WalletIcon } from "./Icons";

const ICONS = { home: HomeIcon, orders: BagIcon, wallet: WalletIcon, support: HeadsetIcon, bell: BellIcon, gift: GiftIcon, user: UserIcon, shield: ShieldIcon, lock: LockIcon };

export function AccountNav({ items }: { items: { href: string; label: string; icon: string }[] }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/account" ? pathname === "/account" : pathname.startsWith(href));
  return (
    <nav aria-label="Account" className="min-w-0 lg:sticky lg:top-24 lg:h-fit">
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:px-0">
        {items.map((i) => {
          const Icon = ICONS[i.icon as keyof typeof ICONS] ?? HomeIcon;
          return (
            <li key={i.href} className="shrink-0">
              <Link
                href={i.href}
                aria-current={active(i.href) ? "page" : undefined}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium ${active(i.href) ? "bg-primary text-white" : "text-muted hover:bg-surface-2 hover:text-text"}`}
              >
                <Icon width={17} height={17} />
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 hidden lg:block">
        <SignOutButton className="btn-ghost w-full justify-start text-muted" />
      </div>
    </nav>
  );
}
