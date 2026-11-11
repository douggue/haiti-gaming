import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { isStaff } from "@/lib/permissions";
import { EVENT_TYPES, type EventType, cleanPath, detectSource, isBot, parseDevice, productSlugOf, short, visitorHash } from "@/lib/analytics";

/**
 * Anonymous visitor statistics (page views, store searches, add to cart). No cookie is set and no IP is stored:
 * the visitor is a daily hash. Bots, staff, browsers asking not to be tracked (DNT / GPC) and automated
 * browsers are not counted. Always answers 204 so it never slows the page or shows an error.
 */
const seen = new Map<string, { n: number; reset: number }>();
const LIMIT = 300; // events per visitor per hour (per server instance)

function allow(hash: string) {
  const now = Date.now();
  const row = seen.get(hash);
  if (!row || row.reset < now) {
    if (seen.size > 20_000) seen.clear();
    seen.set(hash, { n: 1, reset: now + 3_600_000 });
    return true;
  }
  row.n++;
  return row.n <= LIMIT;
}

const done = () => new NextResponse(null, { status: 204 });

export async function POST(req: NextRequest) {
  try {
    const h = req.headers;
    if (h.get("dnt") === "1" || h.get("sec-gpc") === "1") return done();
    const ua = h.get("user-agent") ?? "";
    const raw = await req.text();
    if (raw.length > 2000) return done();
    const body = JSON.parse(raw || "{}") as Record<string, unknown>;
    // Automated test browsers only count when a test asks for it
    const testing = body.t === 1;
    if (!testing && isBot(ua)) return done();

    const type = EVENT_TYPES.includes(body.e as EventType) ? (body.e as EventType) : null;
    const path = cleanPath(body.p);
    if (!type || !path) return done();

    // Staff browsing the shop is not a visitor (only checked when a login cookie is present)
    if (/session_token/.test(h.get("cookie") ?? "")) {
      const user = await getUser().catch(() => null);
      if (user && isStaff(user.role)) return done();
    }

    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "0.0.0.0";
    const hash = visitorHash(ip, ua, process.env.BETTER_AUTH_SECRET ?? "hg-analytics");
    if (!allow(hash)) return done();

    let refHost: string | null = null;
    try {
      refHost = typeof body.r === "string" && body.r ? new URL(body.r).hostname.slice(0, 100) : null;
    } catch {}
    const own = h.get("host");
    const external = refHost && refHost.replace(/^www\./, "") !== own?.replace(/^www\./, "") ? refHost : null;
    const { device, browser, os } = parseDevice(ua);
    const city = h.get("x-vercel-ip-city");
    const results = typeof body.n === "number" && Number.isFinite(body.n) ? Math.max(0, Math.min(10_000, Math.round(body.n))) : null;

    await prisma.analyticsEvent.create({
      data: {
        type,
        path,
        productSlug: productSlugOf(path),
        visitorHash: hash,
        referrerHost: external,
        source: detectSource(external, short(body.u, 40), own),
        country: short(h.get("x-vercel-ip-country"), 2),
        city: city ? short(decodeURIComponent(city), 60) : null,
        device,
        browser,
        os,
        locale: short(body.l, 5) ?? path.split("/")[1]?.slice(0, 5) ?? "ht",
        dataSaver: body.d === 1,
        query: type === "search" ? short(typeof body.q === "string" ? body.q.toLowerCase() : null, 80) : null,
        results: type === "search" ? results : null,
      },
    });
  } catch (e) {
    console.error("analytics event", e);
  }
  return done();
}
