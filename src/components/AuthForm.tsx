"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Turnstile, turnstileOn } from "./Turnstile";

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
  const [totp, setTotp] = useState(false);
  const [useBackup, setUseBackup] = useState(false);
  const t2 = useTranslations("auth2");
  useEffect(() => setHydrated(true), []);
  const [captcha, setCaptcha] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim().toLowerCase();
    const password = String(f.get("password"));
    const fetchOptions = { headers: { "x-turnstile-token": captcha } };
    const res =
      mode === "login"
        ? await authClient.signIn.email({ email, password, fetchOptions })
        : await authClient.signUp.email({
            email,
            password,
            name: String(f.get("name")).trim(),
            phone: String(f.get("phone") ?? "").trim() || undefined,
            locale,
            fetchOptions,
          } as Parameters<typeof authClient.signUp.email>[0]);
    setLoading(false);
    if (res.error) {
      const { status, code } = res.error as { status: number; code?: string };
      // Turnstile tokens work once: get a fresh one for the next try.
      setCaptcha("");
      setCaptchaKey((k) => k + 1);
      if (code === "CAPTCHA_FAILED") setError(t("captcha"));
      else if (status === 429) setError(t("tooMany"));
      else if (code === "ACCOUNT_BLOCKED" || status === 403) setError(t("blocked"));
      else if (code === "PASSWORD_COMPROMISED") setError(t("compromised"));
      // Same message whether or not the email is registered, so the form can't be used to look up accounts.
      else if (mode === "register") setError(t("signupFailed"));
      else setError(t("invalid"));
      return;
    }
    if ((res.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
      setTotp(true);
      return;
    }
    goNext();
  }

  function goNext() {
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
    router.push(safeNext.replace(/^\/(ht|fr|en|es)(?=\/|$)/, "") || "/account");
    router.refresh();
  }

  async function onTotp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const code = String(new FormData(e.currentTarget).get("code")).replace(/\s/g, "");
    const r = useBackup ? await authClient.twoFactor.verifyBackupCode({ code }) : await authClient.twoFactor.verifyTotp({ code });
    setLoading(false);
    if (r.error) return setError(r.error.status === 429 ? t("tooMany") : t("invalid"));
    goNext();
  }

  if (totp) {
    return (
      <form method="post" onSubmit={onTotp} className="card mx-auto w-full max-w-md space-y-4 p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">{t2("totpTitle")}</h1>
        <p className="text-sm text-muted">{useBackup ? t2("backupIntro") : t2("totpIntro")}</p>
        <input key={useBackup ? "b" : "t"} name="code" required autoFocus autoComplete="one-time-code" inputMode={useBackup ? "text" : "numeric"} aria-label={t2("totpTitle")} className="input text-center text-xl tracking-[0.3em]" />
        {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? tc("loading") : t2("verify")}</button>
        <button type="button" className="w-full text-center text-sm font-semibold text-primary" onClick={() => { setUseBackup(!useBackup); setError(""); }}>{useBackup ? t2("useApp") : t2("useBackup")}</button>
      </form>
    );
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
        {mode === "login" && (
          <Link href="/auth/forgot" className="mt-2 inline-block text-sm font-semibold text-primary">{t("forgot")}</Link>
        )}
      </div>
      <Turnstile key={captchaKey} onToken={setCaptcha} locale={locale} />
      {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
      <button className="btn-primary w-full" disabled={loading || !hydrated || (turnstileOn && !captcha)}>
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
