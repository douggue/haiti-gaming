"use client";
import { Fragment, useState } from "react";

type Tab = { key: string; label: string };
/** `node` must render its own <li> (LedgerRow and OrderCard do). */
type Item = { id: string; groups: string[]; node: React.ReactNode };

/**
 * Tabs that filter a list already on the page: no reload, no wait. The choice is written to the address
 * (?param=key) so a refresh or a shared link opens the same tab.
 */
export function InstantTabs({
  tabs, items, initial, param, limit, empty, emptyTab, counts, title, variant = "pill", label,
}: {
  tabs: Tab[];
  items: Item[];
  initial: string;
  param: string;
  limit?: number;
  empty: React.ReactNode;
  /** Shown instead of `empty` when a tab other than the first is empty */
  emptyTab?: React.ReactNode;
  /** Real totals when only part of the list was sent (the dashboard sends the latest orders only) */
  counts?: Record<string, number>;
  title?: React.ReactNode;
  variant?: "pill" | "segmented";
  label: string;
}) {
  const [tab, setTab] = useState(tabs.some((t) => t.key === initial) ? initial : tabs[0].key);
  const shown = items.filter((i) => tab === tabs[0].key || i.groups.includes(tab));
  const pick = (k: string) => {
    setTab(k);
    try {
      const url = new URL(window.location.href);
      if (k === tabs[0].key) url.searchParams.delete(param);
      else url.searchParams.set(param, k);
      window.history.replaceState(window.history.state, "", url);
    } catch {}
  };
  const count = (k: string) => counts?.[k] ?? (k === tabs[0].key ? items.length : items.filter((i) => i.groups.includes(k)).length);

  const nav =
    variant === "segmented" ? (
      <div role="tablist" aria-label={label} className="seg">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => pick(t.key)}
            className="seg-btn px-2"
          >
            {t.label} ({count(t.key)})
          </button>
        ))}
      </div>
    ) : (
      <div role="tablist" aria-label={label} className="seg seg-scroll max-w-full">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => pick(t.key)}
            className="seg-btn"
          >
            {t.label}
          </button>
        ))}
      </div>
    );

  const list = (limit ? shown.slice(0, limit) : shown);
  return (
    <div className="space-y-3">
      {title ? <div className="flex flex-wrap items-center justify-between gap-2">{title}{nav}</div> : nav}
      {list.length === 0 ? (
        tab !== tabs[0].key && emptyTab ? emptyTab : empty
      ) : (
        <ul key={tab} className="animate-rise space-y-2.5">
          {list.map((i) => <Fragment key={i.id}>{i.node}</Fragment>)}
        </ul>
      )}
    </div>
  );
}
