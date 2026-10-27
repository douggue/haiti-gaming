"use client";
import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "../Icons";
import { PlatformIcon } from "./PlatformIcon";

/**
 * Listing photos: swipe through them (dots and "2/5" follow along), tap one to see it full screen.
 * With no photo, the game's icon on its colors stands in.
 */
export function ListingGallery({ images, title, platform, color, children }: { images: string[]; title: string; platform: string; color: string; children?: React.ReactNode }) {
  const strip = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const [full, setFull] = useState<number | null>(null);

  const onScroll = () => {
    const el = strip.current;
    if (el) setAt(Math.round(el.scrollLeft / el.clientWidth));
  };
  const go = (i: number) => strip.current?.scrollTo({ left: i * strip.current.clientWidth, behavior: "smooth" });

  useEffect(() => {
    if (full === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(null);
      if (e.key === "ArrowRight") setFull((f) => (f === null ? f : Math.min(images.length - 1, f + 1)));
      if (e.key === "ArrowLeft") setFull((f) => (f === null ? f : Math.max(0, f - 1)));
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", key);
    };
  }, [full, images.length]);

  return (
    <div className={`relative -mx-4 overflow-hidden bg-gradient-to-br sm:mx-0 sm:rounded-3xl ${color}`}>
      {images.length ? (
        <div ref={strip} onScroll={onScroll} className="flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] sm:aspect-[16/10] [&::-webkit-scrollbar]:hidden">
          {images.map((src, i) => (
            <button key={src} type="button" onClick={() => setFull(i)} className="relative h-full w-full shrink-0 snap-center" aria-label={`${title} ${i + 1}/${images.length}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${title} ${i + 1}`} className="size-full object-cover" loading={i ? "lazy" : "eager"} />
            </button>
          ))}
        </div>
      ) : (
        <div className="grid aspect-[4/3] place-items-center sm:aspect-[16/10]">
          <PlatformIcon platform={platform} size={120} className="drop-shadow-2xl" />
        </div>
      )}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
      {children}
      {images.length > 1 && (
        <>
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">{at + 1}/{images.length}</span>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button key={i} type="button" onClick={() => go(i)} aria-label={`${i + 1}`} className={`h-2 rounded-full transition-all ${i === at ? "w-6 bg-white" : "w-2 bg-white/50"}`} />
            ))}
          </div>
        </>
      )}

      {full !== null && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-black/95" role="dialog" aria-modal="true" aria-label={title} onClick={() => setFull(null)}>
          <div className="flex items-center justify-between p-3 text-sm font-bold text-white">
            <span>{full + 1}/{images.length}</span>
            <button type="button" onClick={() => setFull(null)} className="grid size-10 place-items-center rounded-full bg-white/15" aria-label="Close"><CloseIcon width={20} height={20} /></button>
          </div>
          <div className="relative flex flex-1 items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[full]} alt={`${title} ${full + 1}`} className="max-h-full max-w-full rounded-xl object-contain" />
            {full > 0 && <button type="button" onClick={() => setFull(full - 1)} className="absolute left-2 grid size-11 place-items-center rounded-full bg-white/15 text-2xl text-white" aria-label="Previous">‹</button>}
            {full < images.length - 1 && <button type="button" onClick={() => setFull(full + 1)} className="absolute right-2 grid size-11 place-items-center rounded-full bg-white/15 text-2xl text-white" aria-label="Next">›</button>}
          </div>
        </div>
      )}
    </div>
  );
}
