"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveTheme } from "@/actions/content";
import { contrastRatio } from "@/lib/color";
import type { ThemeConfig } from "@/lib/settings";

const COLORS: [keyof ThemeConfig, string, string][] = [
  ["primary", "Main color (buttons, links)", "White text must stay readable: 4.5:1"],
  ["primaryDark", "Main color in dark mode", "Must stand out on the dark background: 3:1"],
  ["navy", "Navy (wallet card, panels)", "White text: 7:1"],
  ["midnight", "Midnight (hero, dark background)", ""],
];

export function ThemeEditor({ initial, defaults, history }: { initial: ThemeConfig; defaults: ThemeConfig; history: { at: string; by: string; theme: ThemeConfig }[] }) {
  const router = useRouter();
  const [th, setTh] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const checks = {
    primary: contrastRatio(th.primary, "#FFFFFF"),
    primaryDark: contrastRatio(th.primaryDark, th.midnight),
    navy: contrastRatio(th.navy, "#FFFFFF"),
  };
  const ok = checks.primary >= 4.5 && checks.primaryDark >= 3 && checks.navy >= 7;
  const publish = (t: ThemeConfig) =>
    start(async () => {
      const r = await saveTheme(t);
      setMsg(r.ok ? { ok: true, text: r.message ?? "Saved" } : { ok: false, text: r.error });
      router.refresh();
    });

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="card space-y-4 p-5">
        {COLORS.map(([k, label, hint]) => (
          <label key={k} className="flex items-center gap-3">
            <input type="color" value={th[k] as string} onChange={(e) => setTh({ ...th, [k]: e.target.value.toUpperCase() })} className="h-11 w-14 cursor-pointer rounded-lg border border-border" />
            <span className="flex-1">
              <span className="block text-sm font-medium">{label}</span>
              {hint && <span className="text-xs text-muted">{hint} · now {(checks[k as keyof typeof checks] ?? 0).toFixed(1)}:1 {(checks[k as keyof typeof checks] ?? 99) < (k === "primary" ? 4.5 : k === "navy" ? 7 : 3) ? "✗" : "✓"}</span>}
            </span>
            <code className="text-xs">{th[k] as string}</code>
          </label>
        ))}
        <label className="block">
          <span className="label">Corner rounding: {th.radius}px</span>
          <input type="range" min={0} max={28} value={th.radius} onChange={(e) => setTh({ ...th, radius: Number(e.target.value) })} className="w-full" />
        </label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={th.animations} onChange={(e) => setTh({ ...th, animations: e.target.checked })} /> Animations (always off for visitors who ask their device for reduced motion)</label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" disabled={pending || !ok} onClick={() => publish(th)}>Publish theme</button>
          <button type="button" className="btn-secondary" onClick={() => setTh(defaults)}>Back to original colors</button>
        </div>
        {!ok && <p className="text-sm text-danger">Fix the colors marked ✗ before publishing.</p>}
        {msg && <p className={`rounded-xl px-4 py-2.5 text-sm ${msg.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{msg.text}</p>}
        {history.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold">Previous themes (rollback)</summary>
            <ul className="mt-2 space-y-1">
              {history.map((h) => (
                <li key={h.at} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-muted">
                    {[h.theme.primary, h.theme.navy].map((c) => <span key={c} className="inline-block h-4 w-4 rounded" style={{ background: c }} />)}
                    {new Date(h.at).toLocaleString()} · {h.by}
                  </span>
                  <button type="button" className="text-primary underline" onClick={() => setTh(h.theme)}>Load</button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
      <section className="space-y-4" aria-label="Preview">
        <p className="text-sm font-semibold">Live preview</p>
        {(["light", "dark"] as const).map((mode) => (
          <div key={mode} className="rounded-2xl border border-border p-4" style={{ background: mode === "light" ? "#F5F7FC" : th.midnight, color: mode === "light" ? "#0b1426" : "#F5F7FC" }}>
            <p className="mb-3 text-xs uppercase tracking-wide opacity-70">{mode} mode</p>
            <div className="p-4" style={{ background: mode === "light" ? "#fff" : th.navy, borderRadius: th.radius, border: `1px solid ${mode === "light" ? "#dde4f0" : "#1f3460"}` }}>
              <p className="font-semibold">Dyaman Free Fire</p>
              <p className="text-sm opacity-70">310 dyaman · 450 HTG</p>
              <div className="mt-3 flex gap-2">
                <span className="inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold text-white" style={{ background: mode === "light" ? th.primary : th.primaryDark }}>Achte kounye a</span>
                <span className="inline-flex min-h-10 items-center px-2 text-sm font-semibold" style={{ color: mode === "light" ? th.primary : th.primaryDark }}>Wè tout</span>
              </div>
            </div>
            <div className="mt-3 p-4 text-white" style={{ background: th.navy, borderRadius: th.radius + 8 }}>
              <p className="text-xs opacity-70">Balans disponib</p>
              <p className="text-2xl font-extrabold">12 450 HTG</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
