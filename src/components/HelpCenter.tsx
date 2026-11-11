"use client";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CloseIcon, SearchIcon } from "./Icons";

export type FaqItem = { q: string; a: string; tag: string; tone: string };

const norm = (s: string) => s.toLocaleLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Help center: big search that filters the questions as you type, then the answers in two columns (computers). */
export function HelpSearch({ items }: { items: FaqItem[] }) {
  const t = useTranslations("help");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return items;
    return items.filter((i) => {
      const hay = norm(`${i.q} ${i.a} ${i.tag}`);
      return words.every((w) => hay.includes(w));
    });
  }, [q, items]);
  const half = Math.ceil(list.length / 2);

  return (
    <>
      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative mx-auto mt-6 max-w-2xl">
        <label className="sr-only" htmlFor="help-q">{t("searchPlaceholder")}</label>
        <SearchIcon width={20} height={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#60a5fa]" />
        <input
          id="help-q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
          enterKeyHint="search"
          className="input min-h-14 rounded-2xl border-[#3b82f6]/30 bg-surface pl-12 pr-12 text-base [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label={t("clear")} className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-xl bg-surface-2 text-muted hover:text-text">
            <CloseIcon width={16} height={16} />
          </button>
        )}
      </form>

      <section id="faq" className="mt-10 scroll-mt-24" aria-live="polite">
        <p className="eyebrow text-center text-[#60a5fa]">{t("faqEyebrow")}</p>
        {list.length === 0 ? (
          <p className="mx-auto mt-4 max-w-md rounded-2xl border border-border bg-surface/80 p-5 text-center text-sm text-muted">{t("noResults")}</p>
        ) : (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {[list.slice(0, half), list.slice(half)].map((col, c) => (
              <div key={c} className="space-y-3">
                {col.map((i) => (
                  <details key={i.q} className="group rounded-2xl border border-border bg-surface/80 transition-colors open:border-[#3b82f6]/40">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 font-semibold sm:px-5 [&::-webkit-details-marker]:hidden">
                      <span className={`w-[5.5rem] shrink-0 truncate rounded-md px-2 py-0.5 text-center text-xs font-extrabold uppercase tracking-wide ${i.tone}`}>{i.tag}</span>
                      <span className="min-w-0 flex-1">{i.q}</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
                    </summary>
                    <p className="px-4 pb-4 text-sm text-muted sm:px-5">{i.a}</p>
                  </details>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
