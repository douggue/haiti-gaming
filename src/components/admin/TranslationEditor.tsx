"use client";
import { useMemo, useState, useTransition } from "react";
import { saveTranslation } from "@/actions/content";

const LOCALES = ["ht", "fr", "en", "es"] as const;
type L = (typeof LOCALES)[number];
type Base = Record<L, Record<string, string>>;
const NAMES: Record<L, string> = { ht: "Kreyòl", fr: "Français", en: "English", es: "Español" };

/** Friendly names for the groups of texts (the first part of each key). */
const GROUPS: Record<string, string> = {
  common: "Everywhere (menu, buttons, footer)",
  home: "Homepage",
  store: "Store",
  product: "Product page",
  cart: "Cart",
  checkout: "Checkout",
  order: "Orders",
  account: "My account",
  wallet: "Wallet & deposits",
  transfer: "Send money",
  market: "Market",
  chat: "Market chat",
  notifications: "Notifications",
  auth: "Sign in / sign up",
  auth2: "Sign in (more)",
  authUi: "Sign in (screens)",
  google: "Google sign-in",
  verifyGate: "Email confirmation",
  security: "Security",
  twofa: "Two-step verification",
  profile: "Profile",
  privacy: "Privacy",
  prefs: "Notification settings",
  support: "Support",
  referrals: "Invite friends",
  gift: "Gifts",
  trust: "Trust (reviews, sales popup)",
  faq: "FAQ",
  news: "News",
  newsletter: "Newsletter",
  pages: "Pages",
  phone: "Phone field",
  pwa: "Install app",
  offline: "Offline",
  dataSaver: "Data saver",
  meta: "Search engines (titles)",
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const PAGE = 80;

/**
 * Every text of the site, grouped by section. Search any word (any language) or key; each box holds the
 * current text so a word can be fixed in place; "Default" puts the original wording back.
 */
export function TranslationEditor({ keys, base, overrides }: { keys: string[]; base: Base; overrides: { locale: string; key: string; value: string }[] }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>("");
  const [onlyCustom, setOnlyCustom] = useState(false);
  const [langs, setLangs] = useState<L[]>(["ht"]);
  const [limit, setLimit] = useState(PAGE);
  const [saved, setSaved] = useState(() => Object.fromEntries(overrides.map((o) => [`${o.locale}:${o.key}`, o.value])) as Record<string, string>);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [, start] = useTransition();

  const groups = useMemo(() => {
    const c: Record<string, number> = {};
    for (const k of keys) c[k.split(".")[0]] = (c[k.split(".")[0]] ?? 0) + 1;
    return Object.entries(c).sort((a, b) => (GROUPS[a[0]] ?? a[0]).localeCompare(GROUPS[b[0]] ?? b[0]));
  }, [keys]);

  const current = (l: L, k: string) => saved[`${l}:${k}`] ?? base[l][k] ?? "";
  const list = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    return keys.filter((k) => {
      if (group && k.split(".")[0] !== group) return false;
      if (onlyCustom && !LOCALES.some((l) => saved[`${l}:${k}`] !== undefined)) return false;
      if (!words.length) return true;
      const hay = norm([k, ...LOCALES.map((l) => current(l, k))].join(" "));
      return words.every((w) => hay.includes(w));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, group, onlyCustom, keys, saved]);

  const save = (l: L, k: string, value: string) => {
    const id = `${l}:${k}`;
    // Same as the original wording → store nothing (keeps following future fixes of the default)
    const v = value.trim() === (base[l][k] ?? "").trim() ? "" : value;
    if ((saved[id] ?? "") === v) return;
    setStatus((s) => ({ ...s, [id]: { ok: true, text: "Saving…" } }));
    start(async () => {
      const r = await saveTranslation(l, k, v);
      if (r.ok) {
        setSaved((s) => {
          const n = { ...s };
          if (v) n[id] = v;
          else delete n[id];
          return n;
        });
        setDraft((d) => {
          const n = { ...d };
          delete n[id];
          return n;
        });
      }
      setStatus((s) => ({ ...s, [id]: r.ok ? { ok: true, text: v ? "✓ Saved" : "✓ Default" } : { ok: false, text: r.error } }));
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
      {/* Groups */}
      <nav className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:block lg:space-y-1 lg:overflow-visible lg:px-0" aria-label="Groups">
        <button type="button" onClick={() => { setGroup(""); setLimit(PAGE); }} className={`flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-xl lg:w-full px-3 py-2 text-left text-sm font-semibold ${!group ? "bg-primary text-white" : "bg-surface-2 lg:bg-transparent lg:hover:bg-surface-2"}`}>
          All texts <span className="text-xs opacity-75">{keys.length}</span>
        </button>
        {groups.map(([g, n]) => (
          <button key={g} type="button" onClick={() => { setGroup(g); setLimit(PAGE); }} className={`flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-xl lg:w-full px-3 py-2 text-left text-sm ${group === g ? "bg-primary font-semibold text-white" : "bg-surface-2 lg:bg-transparent lg:hover:bg-surface-2"}`}>
            {GROUPS[g] ?? g} <span className="text-xs opacity-75">{n}</span>
          </button>
        ))}
      </nav>

      <div className="min-w-0 space-y-3">
        <div className="card sticky top-16 z-10 space-y-3 p-3">
          <input className="input" type="search" placeholder="Search a word in any language, e.g. “achte”, “peman jele”, or a key like market.buyNow" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-xs text-muted">Show:</span>
            {LOCALES.map((l) => {
              const on = langs.includes(l);
              return (
                <button key={l} type="button" aria-pressed={on} onClick={() => setLangs(on ? (langs.length > 1 ? langs.filter((x) => x !== l) : langs) : LOCALES.filter((x) => x === l || langs.includes(x)))} className={`rounded-full border px-3 py-1 text-xs font-semibold ${on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted"}`}>
                  {NAMES[l]}
                </button>
              );
            })}
            <label className="ml-auto flex items-center gap-2 text-xs"><input type="checkbox" checked={onlyCustom} onChange={(e) => setOnlyCustom(e.target.checked)} /> Only texts I changed</label>
          </div>
          <p className="text-xs text-muted">
            {list.length} text{list.length === 1 ? "" : "s"}{group ? ` in “${GROUPS[group] ?? group}”` : ""}. Edit a box and tap outside it to save. Keep the {"{words in braces}"} as they are, e.g. {"{name}"}.
          </p>
        </div>

        {list.length === 0 && <p className="card p-8 text-center text-sm text-muted">Nothing found. Try another word.</p>}
        {list.slice(0, limit).map((k) => (
          <div key={k} className="card space-y-2 p-3">
            <p className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
              <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono">{k}</span>
              {LOCALES.some((l) => saved[`${l}:${k}`] !== undefined) && <span className="rounded bg-primary/15 px-1.5 py-0.5 font-semibold text-primary">changed</span>}
            </p>
            {langs.length === 1 && langs[0] !== "en" && <p className="text-xs text-muted">English: {base.en[k]}</p>}
            <div className={`grid gap-2 ${langs.length > 1 ? "md:grid-cols-2" : ""}`}>
              {langs.map((l) => {
                const id = `${l}:${k}`;
                const value = draft[id] ?? current(l, k);
                const st = status[id];
                const changed = saved[id] !== undefined;
                return (
                  <label key={l} className="block">
                    <span className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold">{NAMES[l]}</span>
                      <span className="flex items-center gap-2">
                        {st && <span className={st.ok ? "text-success" : "text-danger"}>{st.text}</span>}
                        {changed && (
                          <button type="button" className="font-semibold text-primary" onClick={() => save(l, k, "")} title={base[l][k]}>
                            ↺ Default
                          </button>
                        )}
                      </span>
                    </span>
                    <textarea
                      rows={Math.min(5, Math.max(1, Math.ceil(value.length / 70)))}
                      className={`input py-2 ${changed ? "border-primary" : ""} ${st && !st.ok ? "border-danger" : ""}`}
                      value={value}
                      onChange={(e) => setDraft((d) => ({ ...d, [id]: e.target.value }))}
                      onBlur={(e) => save(l, k, e.target.value)}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        {list.length > limit && (
          <button type="button" className="btn-secondary w-full" onClick={() => setLimit(limit + PAGE)}>Show {Math.min(PAGE, list.length - limit)} more</button>
        )}
      </div>
    </div>
  );
}
