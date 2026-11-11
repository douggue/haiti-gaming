"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Thin blue line at the top while the next page loads (on slow phones a tap otherwise shows nothing).
 * Starts on a click on an internal link, finishes when the address changes; gives up after 12 s.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [on, setOn] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const from = useRef("");

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return;
      // Same page with other filters/tabs: those switch on the spot
      if (url.pathname === window.location.pathname) return;
      from.current = window.location.pathname + window.location.search;
      clear();
      setOn(true);
      setWidth(12);
      timers.current.push(setTimeout(() => setWidth(45), 150), setTimeout(() => setWidth(70), 900), setTimeout(() => setWidth(85), 2500), setTimeout(() => setOn(false), 12000));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!on) return;
    clear();
    setWidth(100);
    timers.current.push(setTimeout(() => setOn(false), 250));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => () => clear(), []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px]">
      <div
        className="h-full bg-gradient-to-r from-[#1d4ed8] via-[#3b82f6] to-[#60a5fa] shadow-[0_0_10px_rgba(59,130,246,.8)]"
        style={{ width: `${width}%`, opacity: on ? 1 : 0, transition: `width ${width === 100 ? 200 : 600}ms ease-out, opacity 250ms ease` }}
      />
    </div>
  );
}
