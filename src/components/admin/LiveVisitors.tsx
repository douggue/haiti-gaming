"use client";
import { useEffect, useState } from "react";

type Live = { visitors: number; pages: { path: string; visitors: number }[] };

/** "Live now": people active in the last 5 minutes and the page each one is on; refreshes every 30 seconds. */
export function LiveVisitors({ initial }: { initial: Live }) {
  const [live, setLive] = useState(initial);
  useEffect(() => {
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/admin/live-visitors", { cache: "no-store" });
        if (r.ok) setLive(await r.json());
      } catch {}
    };
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <section className="card p-5" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <span className="relative flex size-2.5">
            {live.visitors > 0 && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
            <span className={`relative inline-flex size-2.5 rounded-full ${live.visitors > 0 ? "bg-emerald-500" : "bg-muted"}`} />
          </span>
          Live now
        </h2>
        <span className="text-xs text-muted">last 5 minutes · refreshes every 30 s</span>
      </div>
      <p className="mt-2 text-4xl font-extrabold tabular-nums" data-testid="live-visitors">{live.visitors}</p>
      <p className="text-sm text-muted">{live.visitors === 1 ? "visitor on the site" : "visitors on the site"}</p>
      {live.pages.length > 0 && (
        <ul className="mt-3 divide-y divide-border text-sm">
          {live.pages.map((p) => (
            <li key={p.path} className="flex items-center justify-between gap-3 py-1.5">
              <span className="min-w-0 truncate font-mono text-xs">{p.path}</span>
              <b className="tabular-nums">{p.visitors}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
