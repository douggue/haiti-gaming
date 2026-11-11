import { prisma } from "@/lib/db";

/** Figures for Admin → Visitors. All counts come from anonymous events (see src/app/api/a/route.ts). */

export type Row = { key: string; views: number; visitors: number };
const n = (v: bigint | number | null | undefined) => Number(v ?? 0);
/** One visitor on one day: every count on the page uses this, so the numbers add up with the "Visitors" total. */
const VD = `("visitorHash" || '|' || to_char("at" AT TIME ZONE 'UTC', 'YYYY-MM-DD'))`;
const day = (d: Date) => d.toISOString().slice(0, 10);

export function rangeStart(days: number, now = new Date()) {
  const s = new Date(`${day(now)}T00:00:00Z`);
  s.setUTCDate(s.getUTCDate() - (days - 1));
  return s;
}

/** Breakdown of page views by one column; the column name comes from this list only. */
const COLUMNS = { path: '"path"', productSlug: '"productSlug"', country: '"country"', city: '"city"', device: '"device"', browser: '"browser"', os: '"os"', locale: '"locale"' } as const;

async function breakdown(col: keyof typeof COLUMNS, since: Date, until: Date, limit = 10): Promise<Row[]> {
  const c = COLUMNS[col];
  const rows = await prisma.$queryRawUnsafe<{ key: string | null; views: bigint; visitors: bigint }[]>(
    `SELECT ${c} AS key, COUNT(*) AS views, COUNT(DISTINCT ${VD}) AS visitors
     FROM "AnalyticsEvent" WHERE "type" = 'pageview' AND "at" >= $1 AND "at" < $2 AND ${c} IS NOT NULL
     GROUP BY 1 ORDER BY visitors DESC, views DESC LIMIT ${Math.min(50, Math.max(1, limit))}`,
    since,
    until,
  );
  return rows.map((r) => ({ key: r.key ?? "—", views: n(r.views), visitors: n(r.visitors) }));
}

/** Unique visitors per day (a visitor is counted once per day) and page views. */
async function totals(since: Date, until: Date) {
  const [raw] = await prisma.$queryRaw<{ visitors: bigint; pageviews: bigint }[]>`
    SELECT COALESCE(SUM(v), 0) AS visitors, COALESCE(SUM(p), 0) AS pageviews FROM (
      SELECT COUNT(DISTINCT "visitorHash") AS v, COUNT(*) FILTER (WHERE "type" = 'pageview') AS p
      FROM "AnalyticsEvent" WHERE "at" >= ${since} AND "at" < ${until}
      GROUP BY to_char("at" AT TIME ZONE 'UTC', 'YYYY-MM-DD')) d`;
  let visitors = n(raw?.visitors);
  let pageviews = n(raw?.pageviews);
  // Days whose details were already deleted (older than 90 days) still have their daily totals
  const oldest = await prisma.analyticsEvent.findFirst({ orderBy: { at: "asc" }, select: { at: true } });
  const detailFrom = oldest ? day(oldest.at) : day(until);
  if (day(since) < detailFrom) {
    const kept = await prisma.analyticsDaily.findMany({ where: { day: { gte: day(since), lt: detailFrom } } });
    visitors += kept.reduce((s, d) => s + d.visitors, 0);
    pageviews += kept.reduce((s, d) => s + d.pageviews, 0);
  }
  return { visitors, pageviews };
}

export async function visitorReport(days: number) {
  const now = new Date();
  const since = rangeStart(days, now);
  const prevSince = new Date(since.getTime() - days * 86_400_000);
  const end = new Date(now.getTime() + 60_000);

  const [cur, prev, series, pages, products, countries, cities, devices, browsers, oses, locales, saver, sources, funnel, searches, misses, paid] = await Promise.all([
    totals(since, end),
    totals(prevSince, since),
    prisma.$queryRaw<{ day: string; visitors: bigint; pageviews: bigint }[]>`
      SELECT to_char("at" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, COUNT(DISTINCT "visitorHash") AS visitors,
             COUNT(*) FILTER (WHERE "type" = 'pageview') AS pageviews
      FROM "AnalyticsEvent" WHERE "at" >= ${since} GROUP BY 1`,
    breakdown("path", since, end, 12),
    breakdown("productSlug", since, end, 10),
    breakdown("country", since, end, 10),
    breakdown("city", since, end, 10),
    breakdown("device", since, end, 5),
    breakdown("browser", since, end, 8),
    breakdown("os", since, end, 8),
    breakdown("locale", since, end, 6),
    prisma.$queryRawUnsafe<{ on: bigint; all: bigint }[]>(
      `SELECT COUNT(DISTINCT ${VD}) FILTER (WHERE "dataSaver") AS on, COUNT(DISTINCT ${VD}) AS all FROM "AnalyticsEvent" WHERE "at" >= $1`,
      since,
    ),
    // Where each visitor came from = the first page they opened that day
    prisma.$queryRaw<{ source: string; visitors: bigint }[]>`
      SELECT source, COUNT(*) AS visitors FROM (
        SELECT DISTINCT ON ("visitorHash", to_char("at" AT TIME ZONE 'UTC', 'YYYY-MM-DD')) "source"
        FROM "AnalyticsEvent" WHERE "type" = 'pageview' AND "at" >= ${since}
        ORDER BY "visitorHash", to_char("at" AT TIME ZONE 'UTC', 'YYYY-MM-DD'), "at") f
      GROUP BY source ORDER BY visitors DESC`,
    // Each step only counts visitors (per day) who also did the step before it
    prisma.$queryRawUnsafe<{ visitors: bigint; products: bigint; carts: bigint; checkouts: bigint; paid: bigint }[]>(
      `WITH v AS (
         SELECT ${VD} AS vd,
           bool_or("type" = 'pageview' AND "productSlug" IS NOT NULL) AS p,
           bool_or("type" = 'add_to_cart') AS c,
           bool_or("type" = 'pageview' AND "path" ~ '^/[a-z]{2}/checkout') AS k,
           bool_or("type" = 'purchase') AS b
         FROM "AnalyticsEvent" WHERE "at" >= $1 GROUP BY 1)
       SELECT COUNT(*) AS visitors, COUNT(*) FILTER (WHERE p) AS products, COUNT(*) FILTER (WHERE p AND c) AS carts,
              COUNT(*) FILTER (WHERE p AND c AND k) AS checkouts, COUNT(*) FILTER (WHERE p AND c AND k AND b) AS paid FROM v`,
      since,
    ),
    prisma.$queryRaw<{ query: string; times: bigint; results: number | null }[]>`
      SELECT "query", COUNT(*) AS times, MAX("results") AS results FROM "AnalyticsEvent"
      WHERE "type" = 'search' AND "query" IS NOT NULL AND "at" >= ${since}
      GROUP BY 1 ORDER BY times DESC LIMIT 15`,
    prisma.$queryRaw<{ query: string; times: bigint }[]>`
      SELECT "query", COUNT(*) AS times FROM "AnalyticsEvent"
      WHERE "type" = 'search' AND "results" = 0 AND "query" IS NOT NULL AND "at" >= ${since}
      GROUP BY 1 ORDER BY times DESC LIMIT 15`,
    prisma.$queryRawUnsafe<{ paid: bigint }[]>(`SELECT COUNT(DISTINCT ${VD}) AS paid FROM "AnalyticsEvent" WHERE "type" = 'purchase' AND "at" >= $1`, since),
  ]);

  // Daily chart: every day of the range, details when we have them, else the kept daily total
  const byDay = new Map(series.map((s) => [s.day, { visitors: n(s.visitors), pageviews: n(s.pageviews) }]));
  const kept = await prisma.analyticsDaily.findMany({ where: { day: { gte: day(since) } } });
  for (const k of kept) if (!byDay.has(k.day)) byDay.set(k.day, { visitors: k.visitors, pageviews: k.pageviews });
  const chart = Array.from({ length: days }, (_, i) => {
    const d = day(new Date(since.getTime() + i * 86_400_000));
    const v = byDay.get(d);
    return { date: d, visitors: v?.visitors ?? 0, pageviews: v?.pageviews ?? 0 };
  });

  const names = products.length
    ? await prisma.product.findMany({ where: { slug: { in: products.map((p) => p.key) } }, select: { slug: true, name: true } })
    : [];
  const f = funnel[0];
  return {
    days,
    cur,
    prev,
    chart,
    pages,
    products: products.map((p) => ({ ...p, name: (names.find((x) => x.slug === p.key)?.name as Record<string, string> | undefined) ?? null })),
    countries,
    cities,
    devices,
    browsers,
    oses,
    locales,
    saver: { on: n(saver[0]?.on), all: n(saver[0]?.all) },
    sources: sources.map((s) => ({ key: s.source, visitors: n(s.visitors) })),
    funnel: { visitors: n(f?.visitors), products: n(f?.products), carts: n(f?.carts), checkouts: n(f?.checkouts), paid: n(f?.paid) },
    /** Visitors (per day) whose visit ended in a payment, whatever path they took */
    buyers: n(paid[0]?.paid),
    searches: searches.map((s) => ({ query: s.query, times: n(s.times), results: s.results })),
    misses: misses.map((s) => ({ query: s.query, times: n(s.times) })),
  };
}

/** People on the site in the last 5 minutes and the page each one is on now. */
export async function liveNow() {
  const since = new Date(Date.now() - 5 * 60_000);
  const rows = await prisma.$queryRaw<{ path: string; visitors: bigint }[]>`
    SELECT path, COUNT(*) AS visitors FROM (
      SELECT DISTINCT ON ("visitorHash") "path" FROM "AnalyticsEvent"
      WHERE "type" = 'pageview' AND "at" >= ${since} ORDER BY "visitorHash", "at" DESC) l
    GROUP BY path ORDER BY visitors DESC LIMIT 10`;
  const [all] = await prisma.$queryRaw<{ visitors: bigint }[]>`
    SELECT COUNT(DISTINCT "visitorHash") AS visitors FROM "AnalyticsEvent" WHERE "at" >= ${since}`;
  return { visitors: n(all?.visitors), pages: rows.map((r) => ({ path: r.path, visitors: n(r.visitors) })) };
}
