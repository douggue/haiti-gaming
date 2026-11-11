"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/** Data saver as a row with a switch: fewer pictures, no animation (remembered in a cookie). */
export function DataSaverToggle() {
  const t = useTranslations("dataSaver");
  const [on, setOn] = useState(false);
  useEffect(() => setOn(document.documentElement.classList.contains("data-saver")), []);
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#3b82f6]/20 text-[#60a5fa]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4 4 20h16V4Z" opacity=".35" /><path d="M20 4v16h-6V10l6-6Z" /></svg>
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <b className="block">{t("label")}</b>
        <span className="text-xs text-muted">{t("hint")}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        className="relative h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-surface-2 ring-1 ring-border transition-colors before:absolute before:left-0.5 before:top-0.5 before:size-5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:bg-primary checked:before:translate-x-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
        checked={on}
        onChange={(e) => {
          const v = e.target.checked;
          setOn(v);
          document.cookie = `hg_ds=${v ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
          document.documentElement.classList.toggle("data-saver", v);
        }}
      />
    </label>
  );
}
