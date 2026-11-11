"use client";
import { useEffect, useState } from "react";

/** Data saver as an on/off switch (same cookie and <html> class as the footer checkbox). */
export function DataSaverSwitch({ label }: { label: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(document.documentElement.classList.contains("data-saver")), []);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => {
        const v = !on;
        setOn(v);
        document.cookie = `hg_ds=${v ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
        document.documentElement.classList.toggle("data-saver", v);
      }}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${on ? "bg-[#1d4ed8] " : "bg-surface-2 ring-1 ring-border"}`}
    >
      <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${on ? "left-7" : "left-1 bg-white/70"}`} />
    </button>
  );
}
