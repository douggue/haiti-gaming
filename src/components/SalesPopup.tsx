"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { CloseIcon } from "./Icons";
import type { FeedSale } from "@/lib/trust";

const COUNT_KEY = "hg_pop_count";
const OFF_KEY = "hg_pop_off";
const SHOW_MS = 6500;

function session(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function setSession(key: string, v: string) {
  try {
    sessionStorage.setItem(key, v);
  } catch {}
}
const between = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * "Jean P. · 🇭🇹 Pòtoprens — bought 520 Diamonds — today · Delivered ✓"
 * Real sales only (site orders + sales staff added from WhatsApp). At most `perVisit` per browser session across pages,
 * first after ~10 s then every 40–60 s, gone for the visit once closed, never with data saver on.
 */
export function SalesPopup({ sales, product, perVisit }: { sales: FeedSale[]; product: { name: string; image: string | null; accent: string | null }; perVisit: number }) {
  const t = useTranslations("trust");
  const [current, setCurrent] = useState<FeedSale | null>(null);
  const [leaving, setLeaving] = useState(false);
  const order = useRef<FeedSale[]>([]);

  useEffect(() => {
    if (!sales.length || session(OFF_KEY) || document.documentElement.classList.contains("data-saver")) return;
    order.current = [...sales].sort(() => Math.random() - 0.5);
    let timer: ReturnType<typeof setTimeout>;
    let shownHere = 0;
    const next = (delay: number) => {
      timer = setTimeout(() => {
        const count = Number(session(COUNT_KEY) ?? 0);
        if (count >= perVisit || session(OFF_KEY) || shownHere >= order.current.length) return;
        setSession(COUNT_KEY, String(count + 1));
        setLeaving(false);
        setCurrent(order.current[shownHere++]);
        timer = setTimeout(() => {
          setLeaving(true);
          timer = setTimeout(() => {
            setCurrent(null);
            next(between(40_000, 60_000));
          }, 350);
        }, SHOW_MS);
      }, delay);
    };
    next(between(8_000, 14_000));
    return () => clearTimeout(timer);
  }, [sales, perVisit]);

  if (!current) return null;
  const days = Math.floor((Date.now() - current.soldAt) / 86_400_000);
  const when = days < 1 ? t("today") : days < 2 ? t("yesterday") : t("thisWeek");
  const color = product.accent ?? "#1467F5";
  const initials = product.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div
      role="status"
      aria-live="polite"
      data-leaving={leaving ? "" : undefined}
      className="sale-pop kb-hide fixed left-3 z-40 flex max-w-[calc(100vw-1.5rem)] items-center gap-2.5 rounded-2xl border border-border bg-surface/95 py-2 pl-2 pr-1.5 shadow-[0_12px_30px_-14px_rgba(0,0,0,.6)] backdrop-blur sm:max-w-xs md:bottom-6 md:left-6"
      style={{ bottom: "calc(9.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <span className="relative h-9 w-9 shrink-0">
        <span
          className="relative grid h-full w-full place-items-center overflow-hidden rounded-lg"
          style={{ background: `radial-gradient(circle at 50% 42%, ${color} 0%, color-mix(in srgb, ${color} 45%, #060b1a) 60%, #060b1a 100%)` }}
        >
          {product.image ? <Image src={product.image} alt="" fill sizes="36px" className="object-cover" /> : <b className="display text-[11px] text-white">{initials}</b>}
        </span>
        <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full border-2 border-surface bg-success text-[8px] font-black text-white" aria-hidden>✓</span>
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[11px] text-muted">
          <b className="text-text">{current.name}</b> · {current.flag} {current.city}
        </span>
        <span className="block truncate text-xs font-semibold">
          {t("bought", { product: product.name })} <span className="font-normal text-muted">· {when}</span>
        </span>
      </span>
      <button
        type="button"
        onClick={() => {
          setSession(OFF_KEY, "1");
          setCurrent(null);
        }}
        aria-label={t("close")}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
      >
        <CloseIcon width={12} height={12} />
      </button>
    </div>
  );
}
