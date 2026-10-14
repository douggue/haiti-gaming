"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { updateProfile } from "@/actions/account";
import { localeNames, locales, type Locale } from "@/i18n/routing";

export function ProfileForm({ user }: { user: { name: string; email: string; phone: string; locale: string; displayCurrency: string } }) {
  const tp = useTranslations("profile");
  const ta = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="card mt-6 space-y-4 p-5 sm:p-6"
      action={(fd) =>
        start(async () => {
          const r = await updateProfile(fd);
          setMsg(r.ok ? tp("saved") : tc("error"));
          if (r.ok) router.replace("/account/profile", { locale: fd.get("locale") as Locale });
        })
      }
    >
      <div>
        <label className="label" htmlFor="name">{ta("name")}</label>
        <input id="name" name="name" defaultValue={user.name} required maxLength={80} className="input" />
      </div>
      <div>
        <span className="label">{ta("email")}</span>
        <p className="input flex items-center bg-surface-2 text-muted">{user.email}</p>
      </div>
      <div>
        <label className="label" htmlFor="phone">{ta("phone")}</label>
        <input id="phone" name="phone" type="tel" defaultValue={user.phone} maxLength={20} className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="locale">{tp("language")}</label>
          <select id="locale" name="locale" defaultValue={user.locale} className="input">
            {locales.map((l) => <option key={l} value={l}>{localeNames[l]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="displayCurrency">{tp("currency")}</label>
          <select id="displayCurrency" name="displayCurrency" defaultValue={user.displayCurrency} className="input">
            <option value="HTG">HTG</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>
      {msg && <p className="text-sm text-success" role="status">{msg}</p>}
      <button className="btn-primary" disabled={pending}>{tc("save")}</button>
    </form>
  );
}
