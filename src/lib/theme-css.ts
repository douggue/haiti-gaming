import { DEFAULT_THEME, type ThemeConfig } from "./settings";
import { darken, mix } from "./color";

/** CSS variables for the published theme (Admin → Appearance). Empty string when the theme is the default. */
export function themeCss(theme: ThemeConfig | undefined): string {
  const t = { ...DEFAULT_THEME, ...(theme ?? {}) };
  const same = (Object.keys(DEFAULT_THEME) as (keyof ThemeConfig)[]).every((k) => t[k] === DEFAULT_THEME[k]);
  if (same) return "";
  const hex = /^#[0-9a-fA-F]{6}$/;
  if (![t.primary, t.primaryDark, t.navy, t.midnight].every((c) => hex.test(c))) return "";
  return [
    `:root{--primary:${t.primary};--primary-hover:${darken(t.primary)};--primary-soft:${mix(t.primary, "#ffffff", 0.1)};--navy:${t.navy};--midnight:${t.midnight};--radius-card:${t.radius}px}`,
    `.dark{--bg:${t.midnight};--surface:${t.navy};--primary:${t.primaryDark};--primary-hover:${mix(t.primaryDark, "#ffffff", 0.85)};--primary-soft:${mix(t.primaryDark, t.midnight, 0.25)}}`,
    `.card{border-radius:${t.radius}px}`,
    t.animations ? "" : `.animate-rise{animation:none!important}.lift,.lift:hover{transition:none!important;transform:none!important}`,
  ].join("");
}
