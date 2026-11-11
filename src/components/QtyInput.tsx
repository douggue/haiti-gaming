"use client";
import { useEffect, useState } from "react";

/**
 * Quantity box you can type in (number keypad on phones) or step with − / +. While typing it may be empty;
 * on leaving the box (or Enter) it settles between `min` and `max`.
 */
export function QtyInput({ value, onChange, min = 1, max = 10, id, label, size = "md" }: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  id?: string;
  label: string;
  size?: "sm" | "md";
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)));
  const commit = () => {
    const n = parseInt(text, 10);
    const next = Number.isFinite(n) ? clamp(n) : value;
    setText(String(next));
    if (next !== value) onChange(next);
  };
  const btn = size === "sm" ? "h-11 w-10 text-lg" : "h-11 w-11 text-lg";
  return (
    <div className="flex items-center rounded-xl border border-border bg-surface">
      <button type="button" className={`${btn} disabled:opacity-40`} onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label={`${label} −`}>−</button>
      <input
        id={id}
        aria-label={label}
        className={`h-11 bg-transparent text-center font-bold outline-none focus:bg-surface-2 ${size === "sm" ? "w-10 text-sm" : "w-12"}`}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint="done"
        maxLength={String(max).length}
        value={text}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, String(max).length);
          setText(digits);
          const n = parseInt(digits, 10);
          // Apply right away when the number is already valid, so the total updates as you type
          if (Number.isFinite(n) && n >= min && n <= max && n !== value) onChange(n);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
            e.currentTarget.blur();
          }
        }}
      />
      <button type="button" className={`${btn} disabled:opacity-40`} onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label={`${label} +`}>+</button>
    </div>
  );
}
