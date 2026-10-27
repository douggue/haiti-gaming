"use client";
import { createContext, useContext, useId } from "react";
import { BRAND_ICONS } from "@/lib/brand-icons";

/** Icons uploaded by staff (Admin → Market → Settings), by platform key; they replace the built-in ones. */
const Custom = createContext<Record<string, string>>({});
export function PlatformIconsProvider({ icons, children }: { icons: Record<string, string>; children: React.ReactNode }) {
  return <Custom.Provider value={icons}>{children}</Custom.Provider>;
}

/** Official icons shipped with the site (public/market-icons). Staff uploads still take priority. */
const BUILT_IN: Record<string, string> = {
  freefire: "/market-icons/freefire.webp",
  pubg: "/market-icons/pubg.webp",
  codm: "/market-icons/codm.webp",
  efootball: "/market-icons/efootball.webp",
};

/** Real logos: background and logo colors per brand. */
const BRAND_STYLE: Record<string, { bg: string; fg: string }> = {
  pubg: { bg: "#F4B942", fg: "#1b1b1b" },
  tiktok: { bg: "#000000", fg: "#ffffff" },
  instagram: { bg: "", fg: "#ffffff" },
  facebook: { bg: "#0866FF", fg: "#ffffff" },
  youtube: { bg: "#ffffff", fg: "#FF0000" },
};

/**
 * Colorful app-style icons for Market games and platforms (drawn here, no image files to load).
 * Each is a rounded square with its own gradient and a white symbol.
 */
type Props = { platform: string; size?: number; className?: string };

const BG: Record<string, [string, string, string?]> = {
  freefire: ["#ffb02e", "#f0431d"],
  pubg: ["#f7c948", "#a86b12"],
  codm: ["#4b7f52", "#14231a"],
  efootball: ["#38bdf8", "#1d3fb8"],
  tiktok: ["#1a1a1a", "#000000"],
  instagram: ["#feda75", "#d62976", "#4f5bd5"],
  facebook: ["#3b82f6", "#1849c6"],
  youtube: ["#ff4d4d", "#c4001a"],
  other: ["#a78bfa", "#5b21b6"],
};

function Glyph({ platform }: { platform: string }) {
  switch (platform) {
    case "freefire": // flame
      return (
        <>
          <path d="M24.5 8c1 5-3 7.5-3 12 0 2 1 3.5 2.5 4-0.5-3 1.5-5 3.5-6.5 0 4 4.5 6 4.5 11 0 5.5-4.4 10-10 10s-10-4.5-10-10c0-6.5 5.5-10 8.5-14.5 1-1.5 2.5-4 4-6z" fill="#fff" />
          <path d="M24 30c1.5 1.2 3 2.6 3 5a3.2 3.2 0 0 1-6.4 0c0-2.2 1.8-3.2 3.4-5z" fill="#ff7a1a" />
        </>
      );
    case "pubg": // crosshair
      return (
        <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
          <circle cx="24" cy="24" r="10" />
          <path d="M24 9v7M24 32v7M9 24h7M32 24h7" />
          <circle cx="24" cy="24" r="2.2" fill="#fff" stroke="none" />
        </g>
      );
    case "codm": // rank chevrons
      return (
        <g fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 18l10-6 10 6" />
          <path d="M14 26l10-6 10 6" />
          <path d="M14 34l10-6 10 6" />
        </g>
      );
    case "efootball": // ball
      return (
        <>
          <circle cx="24" cy="24" r="13" fill="#fff" />
          <path d="M24 17.5l5.2 3.8-2 6.1h-6.4l-2-6.1z" fill="#1d3fb8" />
          <path d="M24 11v6.5M29.2 21.3l6.5-2M27.2 27.4l4 5.4M20.8 27.4l-4 5.4M18.8 21.3l-6.5-2" stroke="#1d3fb8" strokeWidth="1.6" />
        </>
      );
    case "tiktok": // note with the two-color echo
      return (
        <>
          <path d="M27 11v17.5a5.5 5.5 0 1 1-5.5-5.5" fill="none" stroke="#25f4ee" strokeWidth="4" strokeLinecap="round" transform="translate(-1.4 -1.2)" />
          <path d="M27 11v17.5a5.5 5.5 0 1 1-5.5-5.5" fill="none" stroke="#fe2c55" strokeWidth="4" strokeLinecap="round" transform="translate(1.4 1.2)" />
          <path d="M27 11v17.5a5.5 5.5 0 1 1-5.5-5.5" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          <path d="M27 11c0.8 3.6 3.6 6 7 6.2" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        </>
      );
    case "instagram": // camera
      return (
        <g fill="none" stroke="#fff" strokeWidth="3.2">
          <rect x="12" y="12" width="24" height="24" rx="7" />
          <circle cx="24" cy="24" r="5.5" />
          <circle cx="31" cy="17" r="1.4" fill="#fff" stroke="none" />
        </g>
      );
    case "facebook": // f
      return <path d="M26.5 38V26h4l.6-4.7h-4.6v-3c0-1.4.4-2.3 2.3-2.3h2.5v-4.2c-.4-.1-1.9-.2-3.6-.2-3.6 0-6 2.2-6 6.2v3.5h-4V26h4v12z" fill="#fff" />;
    case "youtube": // play button
      return (
        <>
          <rect x="9" y="14" width="30" height="20" rx="6.5" fill="#fff" />
          <path d="M21.5 19.5v9l7.5-4.5z" fill="#e00020" />
        </>
      );
    default: // gamepad
      return (
        <>
          <path d="M15.5 17h17a6.5 6.5 0 0 1 6.3 5l1.6 7.3a4.3 4.3 0 0 1-7.4 3.8L30 30H18l-3 3.1a4.3 4.3 0 0 1-7.4-3.8L9.2 22a6.5 6.5 0 0 1 6.3-5z" fill="#fff" />
          <path d="M16 21.5v6M13 24.5h6" stroke="#5b21b6" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="30.5" cy="22.5" r="1.7" fill="#f43f5e" />
          <circle cx="33.5" cy="26" r="1.7" fill="#22c55e" />
        </>
      );
  }
}

export function PlatformIcon({ platform, size = 40, className }: Props) {
  const custom = useContext(Custom)[platform] || BUILT_IN[platform];
  const key = BG[platform] ? platform : "other";
  const [a, b, c] = BG[key];
  // Unique per icon: an id shared with a hidden copy of the same icon would leave this one without its colors.
  const uid = useId().replace(/:/g, "");
  const id = `pi-${key}-${uid}`;
  const shine = `pi-shine-${uid}`;
  if (custom) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={custom} alt="" width={size} height={size} className={`rounded-[27%] object-cover ring-1 ring-black/10 ${className ?? ""}`} style={{ width: size, height: size }} />;
  }
  const brand = BRAND_ICONS[key];
  const style = BRAND_STYLE[key];
  if (brand && style) {
    const logo = <path d={brand.path} transform="translate(10.5 10.5) scale(1.125)" />;
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#feda75" />
            <stop offset="0.3" stopColor="#fa7e1e" />
            <stop offset="0.6" stopColor="#d62976" />
            <stop offset="1" stopColor="#4f5bd5" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="13" fill={style.bg || `url(#${id})`} />
        {key === "tiktok" && (
          <>
            <g fill="#25F4EE" transform="translate(-1.1 -1.1)">{logo}</g>
            <g fill="#FE2C55" transform="translate(1.1 1.1)">{logo}</g>
          </>
        )}
        <g fill={style.fg}>{logo}</g>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          {c ? <stop offset="0.55" stopColor={b} /> : null}
          <stop offset="1" stopColor={c ?? b} />
        </linearGradient>
        <linearGradient id={shine} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={`url(#${id})`} />
      <rect width="48" height="48" rx="13" fill={`url(#${shine})`} />
      <Glyph platform={key} />
    </svg>
  );
}

/** Colorful icons for the Market's trust points. */
export function TrustIcon({ kind, size = 40 }: { kind: "escrow" | "checked" | "support"; size?: number }) {
  const [a, b] = kind === "escrow" ? ["#34d399", "#047857"] : kind === "checked" ? ["#60a5fa", "#1d4ed8"] : ["#c084fc", "#7e22ce"];
  const id = `ti-${kind}-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={`url(#${id})`} />
      {kind === "escrow" && (
        <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 10l11 4v8.5c0 7.5-4.7 12.5-11 15.5-6.3-3-11-8-11-15.5V14z" fill="#fff" fillOpacity="0.15" />
          <rect x="18.5" y="22" width="11" height="8.5" rx="2" fill="#fff" stroke="none" />
          <path d="M20.5 22v-2.5a3.5 3.5 0 0 1 7 0V22" />
        </g>
      )}
      {kind === "checked" && (
        <g>
          <path d="M24 9l4 3 5-.4 1.4 4.8 4.2 2.7-1.8 4.6 1.8 4.6-4.2 2.7-1.4 4.8-5-.4-4 3-4-3-5 .4-1.4-4.8-4.2-2.7 1.8-4.6-1.8-4.6 4.2-2.7 1.4-4.8 5 .4z" fill="#fff" />
          <path d="M18.5 24.5l4 4 7.5-8" fill="none" stroke="#1d4ed8" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {kind === "support" && (
        <g>
          <path d="M12 16a5 5 0 0 1 5-5h14a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5h-7l-7 6v-6h0a5 5 0 0 1-5-5z" fill="#fff" />
          <circle cx="19" cy="21" r="1.9" fill="#7e22ce" />
          <circle cx="24" cy="21" r="1.9" fill="#7e22ce" />
          <circle cx="29" cy="21" r="1.9" fill="#7e22ce" />
        </g>
      )}
    </svg>
  );
}
