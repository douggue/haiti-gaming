"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Logo } from "../Logo";
import { MenuIcon, CloseIcon } from "../Icons";

export function AdminNav({ items, user, logo }: { items: { href: string; label: string; badge?: number }[]; user: { name: string; role: string }; logo?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const active = (h: string) => (h === "/admin" ? pathname === "/admin" : pathname.startsWith(h));
  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label="Admin">
      {items.map((i) => (
        <Link key={i.href} href={i.href} onClick={() => setOpen(false)} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${active(i.href) ? "bg-primary text-white" : "text-[#c4d2ee] hover:bg-white/5"}`}>
          {i.label}
          {!!i.badge && <span className="rounded-full bg-warning px-2 text-xs font-bold text-midnight">{i.badge}</span>}
        </Link>
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
    </>
  );
}
