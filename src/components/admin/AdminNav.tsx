"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Logo } from "../Logo";
import { MenuIcon, CloseIcon, HomeIcon, CartIcon, WalletIcon, ChatIcon, StoreIcon, UserIcon } from "../Icons";

export function AdminNav({ items, user, logo }: { items: { href: string; label: string; group?: string; badge?: number }[]; user: { name: string; role: string }; logo?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const active = (h: string) => (h === "/admin" ? pathname === "/admin" : pathname.startsWith(h));
  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label="Admin">
      {items.map((i, n) => (
        <div key={i.href}>
        {i.group && i.group !== items[n - 1]?.group && <p className="mb-1 mt-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#7b92b8]">{i.group}</p>}
        <Link href={i.href} onClick={() => setOpen(false)} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${active(i.href) ? "bg-primary text-white" : "text-[#c4d2ee] hover:bg-white/5"}`}>
          {i.label}
          {!!i.badge && <span className="rounded-full bg-warning px-2 text-xs font-bold text-midnight">{i.badge}</span>}
        </Link>
        </div>
      ))}
    </nav>
  );
  const footer = (
    <div className="mt-auto space-y-2 border-t border-white/10 pt-4 text-sm text-[#c4d2ee]">
      <p className="truncate font-semibold text-white">{user.name}</p>
      <p className="text-xs">{user.role.replace("_", " ")}</p>
      <div className="flex gap-2">
        <a href="/ht" className="text-xs underline">View store</a>
        <button type="button" className="text-xs underline" onClick={async () => { await authClient.signOut(); router.push("/admin/login"); }}>Sign out</button>
      </div>
    </div>
  );
  // Up to four shortcuts the person is allowed to open, in this order of daily use.
  const shortcuts: Record<string, typeof HomeIcon> = { "/admin": HomeIcon, "/admin/orders": CartIcon, "/admin/payments": WalletIcon, "/admin/support": ChatIcon, "/admin/products": StoreIcon, "/admin/customers": UserIcon };
  const quick = items.filter((i) => i.href in shortcuts).slice(0, 4).map((i) => ({ ...i, short: shortcuts[i.href], label: i.label === "Dashboard" ? "Home" : i.label }));
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 overflow-y-auto bg-midnight p-4 lg:flex">
        <Link href="/admin" className="text-white"><Logo src={logo} /></Link>
        {nav}
        {footer}
      </aside>
      <div className="sticky top-0 z-30 flex items-center justify-between bg-midnight px-4 py-3 text-white lg:hidden">
        <Link href="/admin"><Logo src={logo} /></Link>
        <button type="button" onClick={() => setOpen(true)} aria-label="Menu" className="p-2"><MenuIcon /></button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 overflow-y-auto bg-midnight p-4">
            <button type="button" onClick={() => setOpen(false)} className="self-end p-2 text-white" aria-label="Close"><CloseIcon /></button>
            {nav}
            {footer}
          </div>
        </div>
      )}
      {/* Phone: the most-used screens one tap away; "More" opens the full menu */}
      <nav
        aria-label="Quick admin navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-midnight lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", paddingLeft: "env(safe-area-inset-left, 0px)", paddingRight: "env(safe-area-inset-right, 0px)" }}
      >
        <ul className="grid h-16 grid-cols-5">
          {quick.map((i) => (
            <li key={i.href} className="min-w-0">
              <Link href={i.href} aria-current={active(i.href) ? "page" : undefined} className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${active(i.href) ? "text-white" : "text-[#9fb0d0]"}`}>
                <span className={`relative grid h-7 w-11 place-items-center rounded-full ${active(i.href) ? "bg-primary" : ""}`}>
                  <i.short width={18} height={18} />
                  {!!i.badge && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-warning px-1 text-[10px] font-bold text-midnight">{i.badge}</span>}
                </span>
                <span className="max-w-full truncate px-1">{i.label}</span>
              </Link>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => setOpen(true)} className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-[#9fb0d0]">
              <span className="grid h-7 w-11 place-items-center"><MenuIcon width={18} height={18} /></span>
              More
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
