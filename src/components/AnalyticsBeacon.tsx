"use client";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Anonymous visitor statistics: one tiny message per page view, sent once the page is idle.
 * No cookie, nothing stored on the phone. See /api/a for what is (and isn't) kept.
 */
let first = true;

export function track(e: "pageview" | "search" | "add_to_cart" | "purchase", extra: Record<string, unknown> = {}) {
  try {
    let test = false;
    try {
      test = localStorage.getItem("hg_an_test") === "1";
    } catch {}
    if (navigator.webdriver && !test) return;
    const p = location.pathname;
    const body = JSON.stringify({
      e,
      p,
      l: p.split("/")[1],
      d: document.documentElement.classList.contains("data-saver") ? 1 : 0,
      ...(test ? { t: 1 } : {}),
      ...extra,
    });
    if (!navigator.sendBeacon?.("/api/a", new Blob([body], { type: "application/json" }))) {
      fetch("/api/a", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
    }
  } catch {}
}

export function AnalyticsBeacon() {
  const pathname = usePathname();
  const search = useSearchParams();
  const last = useRef("");
  useEffect(() => {
    const key = pathname;
    if (key === last.current) return;
    last.current = key;
    const extra: Record<string, unknown> = {};
    if (first) {
      // Where the visit came from: only known on the first page of the tab
      first = false;
      if (document.referrer) extra.r = document.referrer;
      const utm = search.get("utm_source");
      if (utm) extra.u = utm;
    }
    const send = () => track("pageview", extra);
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(send, { timeout: 3000 });
    else setTimeout(send, 1200);
  }, [pathname, search]);
  return null;
}

/** Visitor statistics: "this visit ended in a payment" (once per order in this tab; nothing about the order is sent). */
export function TrackPurchase({ orderId }: { orderId: string }) {
  useEffect(() => {
    try {
      const k = `hg_tp_${orderId}`;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    } catch {}
    track("purchase");
  }, [orderId]);
  return null;
}
