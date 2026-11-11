import { getLocale } from "next-intl/server";
import { DATE_LOCALES } from "./text";

/**
 * Dates for the account pages. "ht" has no calendar data in the date library and would print English dates
 * ("Oct 14, 2026"), so Kreyòl pages use the Haitian French format ("14 oct. 2026").
 */
export async function getAppFormatter() {
  const locale = await getLocale();
  const tag = DATE_LOCALES[locale] ?? "en-US";
  return {
    dateTime: (d: Date, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) => new Intl.DateTimeFormat(tag, opts).format(d),
    relativeTime: (d: Date, now: Date = new Date()) => {
      const s = Math.round((d.getTime() - now.getTime()) / 1000);
      const rtf = new Intl.RelativeTimeFormat(tag, { numeric: "auto" });
      const abs = Math.abs(s);
      if (abs < 60) return rtf.format(s, "second");
      if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
      if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
      return rtf.format(Math.round(s / 86400), "day");
    },
  };
}
