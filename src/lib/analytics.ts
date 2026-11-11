import { createHash } from "node:crypto";

/**
 * Anonymous visitor statistics: helpers shared by the collection route, the admin page and the tests.
 * Nothing here stores or returns an IP address or the full browser string.
 */

export const EVENT_TYPES = ["pageview", "search", "add_to_cart", "purchase"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Search engines, link previews (WhatsApp, Facebook…), monitoring tools and scripts are not visitors. */
const BOT =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|facebot|whatsapp\/|telegrambot|discordbot|embedly|bingpreview|lighthouse|pagespeed|headlesschrome|phantomjs|python-requests|curl\/|wget|axios|node-fetch|go-http|monitor|uptime|vercel-(screenshot|favicon)/i;

export function isBot(ua: string | null | undefined): boolean {
  return !ua || ua.length < 20 || BOT.test(ua);
}

export function parseDevice(ua: string): { device: "phone" | "tablet" | "desktop"; browser: string; os: string } {
  const tablet = /ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua);
  const phone = !tablet && /mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua);
  const os = /iphone|ipad|ipod/i.test(ua)
    ? "iOS"
    : /android/i.test(ua)
      ? "Android"
      : /windows/i.test(ua)
        ? "Windows"
        : /mac os x|macintosh/i.test(ua)
          ? "macOS"
          : /cros/i.test(ua)
            ? "ChromeOS"
            : /linux/i.test(ua)
              ? "Linux"
              : "Other";
  const browser = /edg\//i.test(ua)
    ? "Edge"
    : /opr\/|opera/i.test(ua)
      ? "Opera"
      : /samsungbrowser/i.test(ua)
        ? "Samsung Internet"
        : /fbav|fban|instagram/i.test(ua)
          ? "Facebook/Instagram app"
          : /firefox|fxios/i.test(ua)
            ? "Firefox"
            : /crios|chrome/i.test(ua)
              ? "Chrome"
              : /safari/i.test(ua)
                ? "Safari"
                : "Other";
  return { device: tablet ? "tablet" : phone ? "phone" : "desktop", browser, os };
}

/** Where the visit came from: the utm_source tag wins, then the referring site; nothing means typed or bookmarked. */
export function detectSource(referrerHost: string | null | undefined, utmSource?: string | null, ownHost?: string | null): string {
  const s = `${utmSource ?? ""} ${referrerHost ?? ""}`.toLowerCase();
  if (/whatsapp|wa\.me/.test(s)) return "whatsapp";
  if (/instagram/.test(s)) return "instagram";
  if (/facebook|fb\.com|fb\.me|messenger/.test(s)) return "facebook";
  if (/tiktok/.test(s)) return "tiktok";
  if (/google/.test(s)) return "google";
  if (/bing|yahoo|duckduckgo|yandex|ecosia/.test(s)) return "search";
  if (/youtube|youtu\.be/.test(s)) return "youtube";
  if (/t\.co|twitter|x\.com/.test(s)) return "x";
  if (!referrerHost && !utmSource) return "direct";
  if (referrerHost && ownHost && referrerHost.replace(/^www\./, "") === ownHost.replace(/^www\./, "")) return "direct";
  return "other";
}

/** Same visitor, same day → same hash; next day a new one. The secret makes it impossible to rebuild from an IP. */
export function visitorHash(ip: string, ua: string, secret: string, day = new Date().toISOString().slice(0, 10)): string {
  return createHash("sha256").update(`${secret}|${day}|${ip}|${ua}`).digest("hex").slice(0, 32);
}

/** Keeps the path only (no query string except the store search), max 200 characters. */
export function cleanPath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/")) return null;
  const [path] = raw.split(/[?#]/);
  if (/^\/(api|admin|_next)(\/|$)/.test(path)) return null;
  // Private links (orders, gifts, chats, tickets, reset tokens) are grouped: their ids are never stored
  return path
    .replace(/^(\/[a-z]{2}\/(?:account\/orders|order-status|gift|account\/messages|account\/support|auth\/reset))\/[^/]+.*/, "$1/…")
    .replace(/^(\/[a-z]{2}\/market)\/(?!sell(?:\/|$))[^/]+.*/, "$1/…")
    .slice(0, 200);
}

/** /ht/products/free-fire → "free-fire" */
export function productSlugOf(path: string): string | null {
  const m = path.match(/^\/(?:ht|fr|en|es)\/products\/([^/]+)/);
  return m ? m[1].slice(0, 120) : null;
}

export function short(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}
