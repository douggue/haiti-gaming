"use client";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

export type WalletRow = { id: string; type: string; title: string; sub: string; time: string; day: string; amount: string; incoming: boolean; held: boolean };

const ICON: Record<string, [string, string]> = {
  DEPOSIT: ["⬇️", "bg-emerald-500/15"],
  PURCHASE: ["🛍️", "bg-rose-500/15"],
  REFUND: ["↩️", "bg-sky-500/15"],
  EXCHANGE: ["💱", "bg-violet-500/15"],
  ADJUSTMENT: ["🛠️", "bg-slate-500/15"],
  HOLD_RELEASE: ["🔓", "bg-amber-500/15"],
  TRANSFER_IN: ["📥", "bg-emerald-500/15"],
  TRANSFER_OUT: ["📤", "bg-indigo-500/15"],
};

/** Wallet history: grouped by day, filter All / Money in / Money out without reloading. */
export function WalletHistory({ rows }: { rows: WalletRow[] }) {
  const t = useTranslations("wallet");
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const shown = useMemo(() => rows.filter((r) => filter === "all" || (filter === "in" ? r.incoming : !r.incoming)), [rows, filter]);
  const days = useMemo(() => {
    const out: [string, WalletRow[]][] = [];
    for (const r of shown) {
      const last = out.at(-1);
      if (last && last[0] === r.day) last[1].push(r);
      else out.push([r.day, [r]]);
    }
    return out;
  }, [shown]);

  return (
    <section className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{t("history")}</h2>
        <div className="inline-flex rounded-full bg-surface-2 p-1 text-xs font-bold" role="tablist">
          {(["all", "in", "out"] as const).map((f) => (
            <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 ${filter === f ? "bg-primary text-white shadow" : "text-muted"}`}>
              {t(`filter_${f}`)}
            </button>
          ))}
        </div>
      </div>
      {days.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-4xl" aria-hidden>🪙</p>
          <p className="mt-2 text-sm text-muted">{t("noHistory")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {days.map(([day, list]) => (
            <div key={day}>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted">{day}</p>
              <ul className="divide-y divide-border">
                {list.map((r) => {
                  const [icon, bg] = ICON[r.type] ?? ["•", "bg-surface-2"];
                  return (
                    <li key={r.id} className="flex items-center gap-3 py-2.5">
                      <span className={`grid size-11 shrink-0 place-items-center rounded-2xl text-lg ${bg}`} aria-hidden>{icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          <span className="truncate">{r.title}</span>
                          {r.held && <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">⏳ {t("onHold")}</span>}
                        </span>
                        <span className="block truncate text-xs text-muted">{r.time}{r.sub ? ` · ${r.sub}` : ""}</span>
                      </span>
                      <span className={`shrink-0 text-sm font-black tabular-nums ${r.incoming ? "text-emerald-500" : ""}`}>{r.incoming ? "+" : "−"}{r.amount}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
