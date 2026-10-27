import Pusher from "pusher";

/**
 * Instant updates through Pusher Channels. Needs PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET and PUSHER_CLUSTER
 * (Vercel environment variables). Without them everything still works: pages check for news every few seconds.
 */
let client: Pusher | null | undefined;

export function realtime(): Pusher | null {
  if (client !== undefined) return client;
  const { PUSHER_APP_ID: appId, PUSHER_KEY: key, PUSHER_SECRET: secret, PUSHER_CLUSTER: cluster } = process.env;
  // PUSHER_HOST/PUSHER_PORT: only for a self-hosted Pusher-compatible server (e.g. Soketi in tests).
  const host = process.env.PUSHER_HOST;
  client = appId && key && secret && cluster ? new Pusher({ appId, key, secret, cluster, ...(host ? { host, port: process.env.PUSHER_PORT, useTLS: false } : { useTLS: true }) }) : null;
  return client;
}

/** What the browser needs to connect (the key is public by design; the secret never leaves the server). */
export type RealtimeConfig = { key: string; cluster: string; host?: string; port?: number };

export function realtimeConfig(): RealtimeConfig | null {
  if (!realtime()) return null;
  const host = process.env.PUSHER_HOST;
  return { key: process.env.PUSHER_KEY!, cluster: process.env.PUSHER_CLUSTER!, ...(host ? { host, port: Number(process.env.PUSHER_PORT) || 6001 } : {}) };
}

export const chatChannel = (chatId: string) => `private-chat-${chatId}`;
export const userChannel = (userId: string) => `private-user-${userId}`;

/** Sends an event; a Pusher outage never breaks the action that caused it. */
export async function publish(channels: string | string[], event: string, data: Record<string, unknown> = {}) {
  const c = realtime();
  if (!c) return;
  try {
    await c.trigger(channels, event, data);
  } catch (e) {
    console.error("realtime publish failed", e);
  }
}
