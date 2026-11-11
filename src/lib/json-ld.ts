/**
 * JSON for a <script type="application/ld+json"> tag. Escapes "<", ">" and "&" so text typed by staff
 * (product names, news, FAQ) can never close the script tag and run code in visitors' browsers.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
