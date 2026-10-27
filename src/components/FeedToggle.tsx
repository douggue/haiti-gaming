"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setShowInFeed } from "@/actions/account";

/** Privacy page: opt out of the recent purchases popup ("Jean P. · Pòtoprens bought…"). */
export function FeedToggle({ on }: { on: boolean }) {
  const t = useTranslations("profile");
  const [checked, setChecked] = useState(on);
  const [pending, start] = useTransition();
  return (
    <label className="card flex items-start gap-3 p-5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.checked;
          setChecked(v);
          start(async () => void (await setShowInFeed(v)));
        }}
        className="mt-0.5 h-5 w-5 accent-[var(--primary)]"
      />
      <span>
        <b className="block">{t("showInFeed")}</b>
        <span className="text-muted">{t("showInFeedHint")}</span>
      </span>
    </label>
  );
}
