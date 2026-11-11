"use client";
import { useState } from "react";

type Row = { date: string; visitors: number; pageviews: number };

/** Visitors per day as bars (one hue, same look as the sales chart), page views in the tooltip. */
export function VisitorsChart({ rows }: { rows: Row[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 200, left = 40, bottom = 24, top = 12;
  const max = Math.max(1, ...rows.map((r) => r.visitors));
  const step = niceStep(max / 4);
  const yMax = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);
  const bw = (W - left) / rows.length;
  const barW = Math.max(2, bw - 2);
  const y = (v: number) => top + (H - top - bottom) * (1 - v / yMax);
  const labelEvery = Math.ceil(rows.length / 8);
  const h = hover !== null ? rows[hover] : null;

  return (
    <div className="relative mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Visitors per day" onMouseLeave={() => setHover(null)}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={left} x2={W} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
            <text x={left - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{v}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const x = left + i * bw + 1;
          const bh = H - bottom - y(r.visitors);
          return (
            <g key={r.date} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onTouchStart={() => setHover(i)} tabIndex={0}>
              <rect x={left + i * bw} y={top} width={bw} height={H - top - bottom} fill="transparent" />
              {r.visitors > 0 && (
                <path
                  d={`M${x},${H - bottom} v${-Math.max(0, bh - 3)} q0,-3 3,-3 h${Math.max(0, barW - 6)} q3,0 3,3 v${Math.max(0, bh - 3)} z`}
                  fill="var(--primary)"
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
              {i % labelEvery === 0 && (
                <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">{r.date.slice(5)}</text>
              )}
            </g>
          );
        })}
      </svg>
      {h && (
        <div className="pointer-events-none absolute right-2 top-0 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow">
          <p className="font-semibold">{h.date}</p>
          <p>{h.visitors} visitor{h.visitors === 1 ? "" : "s"} · {h.pageviews} page view{h.pageviews === 1 ? "" : "s"}</p>
        </div>
      )}
    </div>
  );
}

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
