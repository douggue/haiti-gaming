import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { t } from "@/lib/text";
import { liveNow, visitorReport } from "@/lib/analytics-report";
import { PageTitle, Stat } from "@/components/admin/ui";
import { VisitorsChart } from "@/components/admin/VisitorsChart";
import { LiveVisitors } from "@/components/admin/LiveVisitors";

export const metadata = { title: "Visitors" };
export const dynamic = "force-dynamic";
const RANGES = [
  [1, "Today"],
  [7, "7 days"],
  [30, "30 days"],
  [90, "90 days"],
] as const;

const SOURCE: Record<string, string> = {
  whatsapp: "WhatsApp", facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", google: "Google", search: "Other search engines",
  youtube: "YouTube", x: "X (Twitter)", direct: "Direct (typed, bookmark, app)", other: "Other websites",
};
const LANG: Record<string, string> = { ht: "Kreyòl", fr: "Français", en: "English", es: "Español" };
const DEVICE: Record<string, string> = { phone: "Phone", tablet: "Tablet", desktop: "Computer" };
const regionName = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();
const flag = (cc: string) => (/^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "🌐");
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

function delta(cur: number, prev: number) {
  if (!prev) return cur ? { text: "new", good: true } : undefined;
  const d = Math.round(((cur - prev) / prev) * 100);
  return { text: `${d >= 0 ? "+" : ""}${d}%`, good: d >= 0 };
}

/** A ranked list with a thin bar, readable on a phone (instead of a wide table). */
function Bars({ title, rows, empty = "No data yet.", unit = "visitors" }: { title: string; rows: { label: React.ReactNode; value: number; sub?: string }[]; empty?: string; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="card p-5">
      <h2 className="font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2.5 text-sm">
          {rows.map((r, i) => (
            <li key={i}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">{r.label}</span>
                <span className="shrink-0 tabular-nums"><b>{r.value}</b>{r.sub && <span className="ml-1 text-xs text-muted">{r.sub}</span>}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {rows.length > 0 && <p className="mt-3 text-[11px] text-muted">Numbers are {unit}.</p>}
    </section>
  );
}

export default async function VisitorsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireStaff("analytics.view");
  const sp = await searchParams;
  const days = RANGES.some(([d]) => d === Number(sp.days)) ? Number(sp.days) : 7;
  const [r, live] = await Promise.all([visitorReport(days), liveNow()]);
  const empty = r.cur.visitors === 0 && r.cur.pageviews === 0;
  const steps = [
    ["Visited the site", r.funnel.visitors],
    ["Opened a product", r.funnel.products],
    ["Added to cart", r.funnel.carts],
    ["Reached checkout", r.funnel.checkouts],
    ["Paid", r.funnel.paid],
  ] as const;

  return (
    <>
      <PageTitle
        title="Visitors"
        sub="Anonymous statistics: no cookies, no IP addresses kept. Staff and bots are not counted."
        actions={
          <div className="flex flex-wrap gap-2">
            {RANGES.map(([d, label]) => (
              <Link key={d} href={`/admin/analytics/visitors?days=${d}`} className={`badge px-3 py-1.5 ${d === days ? "bg-primary text-white" : "border border-border bg-surface"}`}>{label}</Link>
            ))}
            <Link href="/admin/analytics" className="badge border border-border bg-surface px-3 py-1.5">Sales reports →</Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <LiveVisitors initial={live} />
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Visitors" value={r.cur.visitors} delta={delta(r.cur.visitors, r.prev.visitors)} />
          <Stat label="Page views" value={r.cur.pageviews} delta={delta(r.cur.pageviews, r.prev.pageviews)} />
          <Stat label="Pages per visitor" value={r.cur.visitors ? (r.cur.pageviews / r.cur.visitors).toFixed(1) : "—"} />
          <Stat label="Visitors who paid" value={`${pct(r.buyers, r.cur.visitors)}%`} />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">
        A visitor is counted once per day (the same person on 3 days counts 3 times). Compared with the {days === 1 ? "day" : `${days} days`} before.
      </p>

      <section className="card mt-6 p-5">
        <h2 className="font-semibold">Visitors per day</h2>
        {empty ? <p className="mt-3 text-sm text-muted">No visits recorded yet. They appear here a few seconds after someone opens the site.</p> : <VisitorsChart rows={r.chart} />}
      </section>

      {/* Buying funnel */}
      <section className="card mt-6 p-5">
        <h2 className="font-semibold">From visit to payment</h2>
        <ol className="mt-4 space-y-3" data-testid="funnel">
          {steps.map(([label, value], i) => {
            const prev = i === 0 ? value : steps[i - 1][1];
            return (
              <li key={label}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{i + 1}. {label}</span>
                  <span className="tabular-nums">
                    <b>{value}</b>
                    {i > 0 && <span className="ml-2 text-xs text-muted">{pct(value, prev)}% of previous step</span>}
                  </span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(1, pct(value, steps[0][1] || 1))}%` }} />
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-muted">Each step counts the visitors who also did the step before it, so the bars only get shorter. The biggest drop is where customers give up most.</p>
      </section>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Bars title="Top pages" rows={r.pages.map((p) => ({ label: <span className="font-mono text-xs">{p.key}</span>, value: p.visitors, sub: `· ${p.views} views` }))} />
        <Bars title="Top products" rows={r.products.map((p) => ({ label: p.name ? t(p.name, "en") : p.key, value: p.visitors, sub: `· ${p.views} views` }))} />
        <Bars title="Where visitors come from" rows={r.sources.map((s) => ({ label: SOURCE[s.key] ?? s.key, value: s.visitors }))} />
        <Bars
          title="Countries"
          empty="Countries appear on the live site (the hosting tells us the country, never the address)."
          rows={r.countries.map((c) => ({ label: `${flag(c.key)} ${regionName?.of(c.key) ?? c.key}`, value: c.visitors }))}
        />
        <Bars title="Cities" empty="Cities appear on the live site." rows={r.cities.map((c) => ({ label: c.key, value: c.visitors }))} />
        <Bars title="Devices" rows={r.devices.map((d) => ({ label: DEVICE[d.key] ?? d.key, value: d.visitors, sub: `${pct(d.visitors, r.funnel.visitors)}%` }))} />
        <Bars title="Browsers" rows={r.browsers.map((b) => ({ label: b.key, value: b.visitors }))} />
        <Bars title="Phone / computer system" rows={r.oses.map((o) => ({ label: o.key, value: o.visitors }))} />
        <Bars title="Language" rows={r.locales.map((l) => ({ label: LANG[l.key] ?? l.key, value: l.visitors }))} />
        <section className="card p-5">
          <h2 className="font-semibold">Data saver</h2>
          <p className="mt-2 text-3xl font-extrabold tabular-nums">{pct(r.saver.on, r.saver.all)}%</p>
          <p className="text-sm text-muted">of visitors browse with data saver on ({r.saver.on} of {r.saver.all}).</p>
        </section>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section className="card p-5" data-testid="searches">
          <h2 className="font-semibold">Store searches</h2>
          {r.searches.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No searches yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {r.searches.map((s) => (
                <li key={s.query} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">«{s.query}»</span>
                  <span className="shrink-0 text-xs text-muted"><b className="text-text">{s.times}×</b> · {s.results ?? 0} result{s.results === 1 ? "" : "s"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card border-warning/40 p-5">
          <h2 className="font-semibold">Searches that found nothing</h2>
          <p className="mt-1 text-xs text-muted">What people want that the store doesn&apos;t have (or spells differently): ideas for new products or search words.</p>
          {r.misses.length === 0 ? (
            <p className="mt-3 text-sm text-muted">None — every search found something.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {r.misses.map((s) => (
                <li key={s.query} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">«{s.query}»</span>
                  <b className="shrink-0">{s.times}×</b>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
