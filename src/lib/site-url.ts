/**
 * Public address of the site, without a trailing slash.
 * NEXT_PUBLIC_SITE_URL when set (your own domain); otherwise the project's production address on Vercel
 * (e.g. https://haiti-gaming.vercel.app), so a first deploy works without setting it.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
