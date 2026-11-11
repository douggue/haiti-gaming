"use client";
import { useState } from "react";
import Image from "next/image";

/**
 * Product banner: the picture fills a wide card, the name sits on it over a dark fade, and extra photos
 * (if any) show as small thumbnails under it. Without a picture, the accent-colored tile with initials is used.
 */
export function ProductHero({
  name, accent, images, eyebrow, badge,
}: {
  name: string;
  accent?: string | null;
  images: string[];
  eyebrow: string;
  badge?: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const src = images[active];
  const color = accent ?? "#1467F5";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div className="space-y-3">
      <div className="on-dark relative aspect-[16/11] overflow-hidden rounded-3xl border border-white/10 bg-surface-2 sm:aspect-[4/3]">
        {src ? (
          <Image src={src} alt={name} fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
        ) : (
          <div
            className="absolute inset-0 grid place-items-center"
            style={{ background: `radial-gradient(circle at 50% 38%, ${color} 0%, color-mix(in srgb, ${color} 45%, #060b1a) 55%, #060b1a 100%)` }}
            aria-hidden
          >
            <span className="display -mt-10 text-7xl font-bold tracking-tight text-white [text-shadow:0_6px_24px_rgba(0,0,0,.35)]">{initials}</span>
          </div>
        )}
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/75 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          <p className="eyebrow flex flex-wrap items-center gap-2 text-[#93c5fd]">
            {eyebrow}
            {badge}
          </p>
          <h1 className="display mt-1 text-[1.75rem] font-extrabold leading-tight tracking-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,.5)] sm:text-4xl">{name}</h1>
        </div>
      </div>
      {images.length > 1 && (
        <div className="ds-hide flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${name} ${i + 1}`}
              aria-current={i === active}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-xl border-2 ${i === active ? "border-[#3b82f6]" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              <Image src={img} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
