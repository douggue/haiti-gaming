import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

// Locale resolution: saved cookie → Accept-Language → Kreyòl. Bots are never redirected by location.
// Referral links (?ref=CODE) are remembered for 30 days so the invite counts when the friend signs up later.
export default function middleware(req: NextRequest) {
  const res = intl(req);
  const ref = req.nextUrl.searchParams.get("ref");
  if (ref && /^[A-Z0-9]{6,12}$/i.test(ref)) {
    res.cookies.set("hg_ref", ref.toUpperCase(), { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax", httpOnly: true });
  }
  return res;
}

export const config = {
  matcher: ["/((?!api|admin|media|_next|_vercel|.*\\..*).*)"],
};
