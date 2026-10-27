"use client";
import type PusherJs from "pusher-js";

/** One shared connection per browser tab, opened only when a page needs it. */
let socket: Promise<PusherJs> | null = null;

export function connect(config: { key: string; cluster: string; host?: string; port?: number }): Promise<PusherJs> {
  socket ??= import("pusher-js").then(
    ({ default: Pusher }) =>
      new Pusher(config.key, {
        cluster: config.cluster,
        channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" },
        // Self-hosted server (tests): plain WebSocket on the given host and port.
        ...(config.host ? { wsHost: config.host, wsPort: config.port, forceTLS: false, enabledTransports: ["ws" as const], disableStats: true } : {}),
      }),
  );
  return socket;
}
