import { getLocale } from "next-intl/server";
import { DATE_LOCALES } from "./text";

/** "5 minutes ago" in Kreyòl: the date library has no Haitian Creole, and French would be wrong here. */
function kreyolAgo(seconds: number) {
  const abs = Math.abs(seconds);
  const future = seconds > 0;
  const n = abs < 3600 ? Math.round(abs / 60) : abs < 86400 ? Math.round(abs / 3600) : Math.round(abs / 86400);
  const unit = abs < 3600 ? "minit" : abs < 86400 ? "èdtan" : "jou";
  if (abs < 60) return "kounye a";
  if (unit === "jou" && n === 1) return future ? "demen" : "yè";
  return future ? `nan ${n} ${unit}` : `sa gen ${n} ${unit}`;
}

/**
 * Dates for the account pages. "ht" has no calendar data in the date library and would print English dates
 * ("Oct 14, 2026"), so Kreyòl pages use the Haitian French date format ("14 oct. 2026", 24-hour clock) and
 * their own words for "… ago".
 */
export async function getAppFormatter() {
  const locale = await getLocale();
  const tag = DATE_LOCALES[locale] ?? "en-US";
  return {
    dateTime: (d: Date, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) => new Intl.DateTimeFormat(tag, opts).format(d),
    relativeTime: (d: Date, now: Date = new Date()) => {
      const s = Math.round((d.getTime() - now.getTime()) / 1000);
      if (locale === "ht") return kreyolAgo(s);
      const rtf = new Intl.RelativeTimeFormat(tag, { numeric: "auto" });
      const abs = Math.abs(s);
      if (abs < 60) return rtf.format(s, "second");
      if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
      if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
      return rtf.format(Math.round(s / 86400), "day");
    },
  };
}
