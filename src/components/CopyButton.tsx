"use client";
import { useRef, useState } from "react";
import { CopyIcon } from "./Icons";

/** Copies on iPhones too: the clipboard API first, then the old hidden-textarea way. */
async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, value.length);
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Copy button with feedback you can see: it pops, turns green, the icon becomes a check that draws itself,
 * and a ring pulses out. The phone also gives a short buzz where supported.
 */
export function CopyButton({ value, label, done, className = "" }: { value: string; label: string; done: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const [burst, setBurst] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  return (
    <button
      type="button"
      aria-live="polite"
      className={`copy-btn relative isolate inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 overflow-visible rounded-xl border px-3 text-xs font-bold transition-[background-color,border-color,color,transform] duration-200 active:scale-95 ${
        copied ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300" : "border-border bg-surface-2 text-text hover:border-[#3b82f6]/60"
      } ${className}`}
      onClick={async () => {
        if (!(await copyText(value))) return;
        setCopied(true);
        setBurst((n) => n + 1);
        try {
          navigator.vibrate?.(12);
        } catch {}
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1800);
      }}
    >
      {burst > 0 && copied && <span key={burst} aria-hidden className="copy-ring pointer-events-none absolute inset-0 -z-10 rounded-[inherit]" />}
      <span key={copied ? `c${burst}` : "i"} className={copied ? "copy-pop inline-flex" : "inline-flex"} aria-hidden>
        {copied ? (
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path className="copy-check" d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        ) : (
          <CopyIcon width={14} height={14} />
        )}
      </span>
      <span>{copied ? done : label}</span>
    </button>
  );
}
