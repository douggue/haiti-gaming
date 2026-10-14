"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next");
  const [error, setError] = useState(sp.get("blocked") ? t("blocked") : "");
  const [loading, setLoading] = useState(false);
  // Until JavaScript is ready the button stays disabled, so credentials are never sent by a native form submit.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim().toLowerCase();
    const password = String(f.get("password"));
    const res =
      mode === "login"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({
            email,
            password,
            name: String(f.get("name")).trim(),
            phone: String(f.get("phone") ?? "").trim() || undefined,
            locale,
          } as Parameters<typeof authClient.signUp.email>[0]);
    setLoading(false);
    if (res.error) {
      const status = res.error.status;
      if (status === 429) setError(t("tooMany"));
      else if (mode === "register" && (res.error.code === "USER_ALREADY_EXISTS" || status === 422)) setError(t("exists"));
      else if (mode === "register") setError(res.error.message ?? tc("error"));
      else setError(t("invalid"));
      return;
    }
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
    router.push(safeNext.replace(/^\/(ht|fr|en|es)(?=\/|$)/, "") || "/account");
    router.refresh();
  }

  return (
    <form method="post" onSubmit={onSubmit} className="card mx-auto w-full max-w-md space-y-4 p-6 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight">{mode === "login" ? t("loginTitle") : t("registerTitle")}</h1>
      {mode === "register" && (
        <div>
          <label htmlFor="name" className="label">{t("name")}</label>
          <input id="name" name="name" required maxLength={80} autoComplete="name" className="input" />
        </div>
      )}
      <div>
        <label htmlFor="email" className="label">{t("email")}</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      {mode === "register" && (
        <div>
          <label htmlFor="phone" className="label">{t("phone")}</label>
          <input id="phone" name="phone" type="tel" inputMode="tel" placeholder="+509" autoComplete="tel" maxLength={20} className="input" />
        </div>
      )}
      <div>
        <label htmlFor="password" className="label">{t("password")}</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="input"
        />
        {mode === "register" && <p className="mt-1 text-xs text-muted">{t("passwordHint")}</p>}
      </div>
      {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
      <button className="btn-primary w-full" disabled={loading || !hydrated}>
        {loading ? tc("loading") : mode === "login" ? tc("signIn") : tc("signUp")}
      </button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? t("noAccount") : t("haveAccount")}{" "}
        <Link href={`${mode === "login" ? "/auth/register" : "/auth/login"}${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-primary">
          {mode === "login" ? tc("signUp") : tc("signIn")}
        </Link>
      </p>
    </form>
  );
}
