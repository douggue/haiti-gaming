"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { connect } from "@/lib/realtime-client";

/** Redraws the page (server data) when an event arrives on a private Pusher channel, e.g. the header's unread counter. */
export function LiveRefresh({ config, channel, events = ["update"] }: { config: { key: string; cluster: string; host?: string; port?: number }; channel: string; events?: string[] }) {
  const router = useRouter();
  useEffect(() => {
    let stop = () => {};
    let timer: ReturnType<typeof setTimeout>;
    // Several events close together cause one redraw.
    const redraw = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 800);
    };
    connect(config).then((p) => {
      const ch = p.subscribe(channel);
      for (const e of events) ch.bind(e, redraw);
      stop = () => {
        for (const e of events) ch.unbind(e, redraw);
        p.unsubscribe(channel);
        clearTimeout(timer);
      };
    });
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.key, config.cluster, channel, router]);
  return null;
}
