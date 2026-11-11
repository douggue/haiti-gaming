"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type CelebrateKind = "success" | "pending";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#38bdf8", "#facc15"];

/**
 * Full-screen "it worked" moment: a ring that draws itself, a check (or a clock while the team checks a
 * payment), a burst of confetti, the amount counting up, and a short buzz on phones. Shown once per
 * `onceKey` on this phone, so a refresh doesn't replay it. Calm, static version for reduced motion.
 */
export function Celebrate({
  kind = "success", title, subtitle, amount, cta, onceKey, open: controlled, onClose,
}: {
  kind?: CelebrateKind;
  title: string;
  subtitle?: string;
  /** Final amount text, e.g. "1 450 HTG"; the digits count up */
  amount?: string;
  cta: string;
  /** Show only once on this phone for this key (omit when the caller controls `open`) */
  onceKey?: string;
  open?: boolean;
  onClose?: () => void;
}) {
  const [self, setSelf] = useState(false);
  const open = controlled ?? self;
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (controlled !== undefined || !onceKey) return;
    try {
      // Automated browser tests click through these pages: skip the moment unless a test asks for it
      if (navigator.webdriver && localStorage.getItem("hg_cel_test") !== "1") return;
      const k = `hg_cel_${onceKey}`;
      if (localStorage.getItem(k)) return;
      localStorage.setItem(k, "1");
    } catch {}
    setSelf(true);
  }, [controlled, onceKey]);

  useEffect(() => {
    if (!open) return;
    try {
      navigator.vibrate?.(kind === "success" ? [18, 60, 28] : 15);
    } catch {}
    btn.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    setSelf(false);
    onClose?.();
  };

  if (!open || typeof document === "undefined") return null;
  try {
    if (controlled !== undefined && navigator.webdriver && localStorage.getItem("hg_cel_test") !== "1") return null;
  } catch {}
  const ok = kind === "success";
  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="cel-title" className="cel-backdrop fixed inset-0 z-[80] grid place-items-center bg-[#05070d]/80 p-5 backdrop-blur-sm" onClick={close}>
      <div className="cel-card relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#131a2a] px-6 pb-6 pt-10 text-center shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)]" onClick={(e) => e.stopPropagation()}>
        <span aria-hidden className={`pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full blur-3xl ${ok ? "bg-emerald-500/25" : "bg-amber-500/20"}`} />
        {ok && (
          <span aria-hidden className="cel-confetti pointer-events-none absolute left-1/2 top-[5.5rem]">
            {Array.from({ length: 22 }, (_, i) => {
              const angle = (i / 22) * 360 + (i % 3) * 7;
              const dist = 90 + ((i * 37) % 70);
              return (
                <i
                  key={i}
                  style={{
                    "--a": `${angle}deg`,
                    "--d": `${dist}px`,
                    "--r": `${(i * 47) % 360}deg`,
                    background: COLORS[i % COLORS.length],
                    animationDelay: `${0.25 + (i % 5) * 0.03}s`,
                    width: i % 2 ? 7 : 5,
                    height: i % 2 ? 11 : 5,
                    borderRadius: i % 3 === 0 ? 999 : 2,
                  } as React.CSSProperties}
                />
              );
            })}
          </span>
        )}
        <div className="relative mx-auto grid size-24 place-items-center">
          <span aria-hidden className={`cel-pulse absolute inset-0 rounded-full ${ok ? "bg-emerald-500/20" : "bg-amber-500/15"}`} />
          <svg viewBox="0 0 96 96" className="relative size-24" aria-hidden>
            <circle cx="48" cy="48" r="42" fill={ok ? "rgb(16 185 129 / .14)" : "rgb(245 158 11 / .12)"} stroke={ok ? "#10b981" : "#f59e0b"} strokeWidth="5" strokeLinecap="round" className="cel-ring" />
            {ok ? (
              <path d="M30 49.5 43 62l24-27" fill="none" stroke="#34d399" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" className="cel-check" />
            ) : (
              <g fill="none" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round">
                <path d="M48 28v21" className="cel-hand" />
                <path d="M48 49l12 8" className="cel-check" />
              </g>
            )}
          </svg>
        </div>
        <h2 id="cel-title" className="cel-up display relative mt-5 text-2xl font-extrabold tracking-tight">{title}</h2>
        {amount && <p className={`cel-up display relative mt-1 text-3xl font-black tabular-nums ${ok ? "text-emerald-400" : "text-amber-300"}`} style={{ animationDelay: ".45s" }}><CountUp text={amount} /></p>}
        {subtitle && <p className="cel-up relative mt-2 text-sm text-muted" style={{ animationDelay: ".55s" }}>{subtitle}</p>}
        <button ref={btn} type="button" onClick={close} className="cel-up btn-primary relative mt-6 min-h-12 w-full text-base" style={{ animationDelay: ".65s" }}>
          {cta}
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** Counts the first number in the text up from 0 (keeps the currency and spacing as written). */
function CountUp({ text }: { text: string }) {
  const m = text.match(/\d{1,3}(?:[\s  .,]\d{3})+(?!\d)|\d+/);
  const target = m ? Number(m[0].replace(/[^\d]/g, "")) : NaN;
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!Number.isFinite(target) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setN(target);
    let raf = 0;
    const start = performance.now() + 400;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / 900));
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  if (!m || !Number.isFinite(target)) return <>{text}</>;
  // Same grouping as the original text (space or comma), digits only change
  const sep = /\d([\s  ,.])\d{3}/.exec(m[0])?.[1] ?? "";
  const shown = sep ? n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, sep) : String(n);
  return <>{text.replace(m[0], shown)}</>;
}
