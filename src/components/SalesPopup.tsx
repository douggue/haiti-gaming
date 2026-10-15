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
      className="sale-pop kb-hide fixed inset-x-3 z-40 flex items-center gap-3 rounded-2xl border border-border bg-surface/95 p-2.5 pr-3 shadow-[0_18px_40px_-16px_rgba(0,0,0,.6)] backdrop-blur md:inset-x-auto md:bottom-24 md:left-6 md:w-[22rem]"
      style={{ bottom: "calc(9.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <span className="relative h-13 w-13 shrink-0">
        <span
          className="relative grid h-full w-full place-items-center overflow-hidden rounded-xl"
          style={{ background: `radial-gradient(circle at 50% 42%, ${color} 0%, color-mix(in srgb, ${color} 45%, #060b1a) 60%, #060b1a 100%)` }}
        >
          {product.image ? <Image src={product.image} alt="" fill sizes="52px" className="object-cover" /> : <b className="display text-base text-white">{initials}</b>}
        </span>
        <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-surface bg-success text-[10px] font-black text-white" aria-hidden>✓</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs text-muted">
          <b className="text-text">{current.name}</b> · {current.flag} {current.city}
        </span>
        <span className="block truncate text-sm font-bold leading-tight">{t("bought", { product: product.name })}</span>
        <span className="mt-0.5 block text-[11px] text-muted">
          {when} · <span className="text-success">{t("delivered")}</span>
        </span>
      </span>
      <button
        type="button"
        onClick={() => {
          setSession(OFF_KEY, "1");
          setCurrent(null);
        }}
        aria-label={t("close")}
        className="grid h-8 w-8 shrink-0 self-start place-items-center rounded-lg bg-surface-2 text-muted hover:text-text"
      >
        <CloseIcon width={14} height={14} />
      </button>
    </div>
  );
}
