"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

export function SecurityForms() {
  const ts = useTranslations("security");
  const tc = useTranslations("common");
  const ta = useTranslations("auth");
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <form
        className="card space-y-4 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = new FormData(e.currentTarget);
          const r = await authClient.changePassword({
            currentPassword: String(f.get("current")),
            newPassword: String(f.get("next")),
            revokeOtherSessions: true,
          });
          setBusy(false);
          setMsg(r.error ? { ok: false, text: (r.error as { code?: string }).code === "PASSWORD_COMPROMISED" ? ta("compromised") : ta("invalid") } : { ok: true, text: ts("passwordChanged") });
          if (!r.error) (e.target as HTMLFormElement).reset();
        }}
      >
        <h2 className="flex items-center gap-2 font-semibold"><span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-lg" aria-hidden>🔑</span>{ts("changePassword")}</h2>
        <div>
          <label className="label" htmlFor="current">{ts("currentPassword")}</label>
          <input id="current" name="current" type="password" required autoComplete="current-password" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="next">{ts("newPassword")}</label>
          <input id="next" name="next" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className="input" />
          <p className="mt-1 text-xs text-muted">{ta("passwordHint")}</p>
        </div>
        <button className="btn-primary" disabled={busy}>{tc("save")}</button>
      </form>
      {msg && <p className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`} role="status">{msg.text}</p>}
    </>
  );
}

export type DeviceSession = { token: string; device: string; browser: string; mobile: boolean; ip: string; when: string; current: boolean };

/** Signed-in devices, each with "Sign out", plus "Sign out all other devices". */
export function SessionsList({ sessions }: { sessions: DeviceSession[] }) {
  const ts = useTranslations("security");
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const others = sessions.filter((s) => !s.current).length;
  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold"><span className="grid size-9 place-items-center rounded-xl bg-violet-500/15 text-lg" aria-hidden>📱</span>{ts("sessions")}</h2>
      <ul className="divide-y divide-border">
        {sessions.map((s) => (
          <li key={s.token} className="flex items-center gap-3 py-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-xl" aria-hidden>{s.mobile ? "📱" : "💻"}</span>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-sm">
                {s.device} · {s.browser}
                {s.current && <span className="ml-2 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">{ts("thisDevice")}</span>}
              </b>
              <span className="block truncate text-xs text-muted">{s.when}{s.ip ? ` · ${s.ip}` : ""}</span>
            </span>
            {!s.current && (
              <button
                type="button"
                disabled={busy === s.token}
                className="btn-secondary min-h-9 shrink-0 px-3 text-xs"
                onClick={async () => {
                  setBusy(s.token);
                  await authClient.revokeSession({ token: s.token });
                  setBusy("");
                  router.refresh();
                }}
              >
                {ts("signOutDevice")}
              </button>
            )}
          </li>
        ))}
      </ul>
      {others > 0 && (
        <button
          type="button"
          className="btn-secondary mt-3 w-full"
          disabled={busy === "all"}
          onClick={async () => {
            setBusy("all");
            await authClient.revokeOtherSessions();
            setBusy("");
            setMsg(ts("revoked"));
            router.refresh();
          }}
        >
          {ts("revokeOthers")}
        </button>
      )}
      {msg && <p className="mt-3 rounded-xl bg-success-soft px-4 py-3 text-sm text-success" role="status">{msg}</p>}
    </section>
  );
}
