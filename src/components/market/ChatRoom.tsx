"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { answerOffer, callAgent, chatTyping, chatUpdates, makeOffer, requestReopen, sendChatMessage, type ChatMessage, type ChatState } from "@/actions/market-chat";
import { connect } from "@/lib/realtime-client";
import { formatMoney } from "@/lib/money";
import { compressImage } from "@/lib/compress-image";
import { BuyButton } from "./MarketClient";
import { CloseIcon, SendIcon } from "../Icons";

type Props = {
  chatId: string;
  role: "buyer" | "seller";
  otherName: string;
  listing: { id: string; title: string; price: number; currency: "HTG" | "USD"; image: string | null; status: string };
  initial: ChatMessage[];
  agreedPrice: number | null;
  rulesAccepted: boolean;
  /** First message that arrived since the person last opened the chat */
  firstUnreadId: string | null;
  /** When the other side last had the chat open (for ✓✓ "seen") */
  otherReadAt: string | null;
  /** Closed / reopen request / agent called / when the other person was last active */
  state: ChatState;
  /** Pusher settings for instant updates; null = check every few seconds instead */
  realtime?: { key: string; cluster: string; host?: string; port?: number } | null;
};

const ImageIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></svg>
);

export function ChatRoom({ chatId, role, otherName, listing, initial, agreedPrice: agreed0, rulesAccepted, firstUnreadId, otherReadAt: otherRead0, realtime, state: state0 }: Props) {
  const t = useTranslations("chat");
  const tm = useTranslations("market");
  const locale = useLocale();
  const [messages, setMessages] = useState(initial);
  const [agreed, setAgreed] = useState(agreed0);
  const [status, setStatus] = useState(listing.status);
  const [otherRead, setOtherRead] = useState(otherRead0);
  const [state, setState] = useState(state0);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reason, setReason] = useState("");
  // Online if active in the last 75 s; re-checked every 15 s
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  const online = !!state.otherSeenAt && now - Date.parse(state.otherSeenAt) < 75_000;
  const [divider, setDivider] = useState(firstUnreadId);
  const dividerRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [keypad, setKeypad] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const last = useRef(initial.at(-1)?.at);
  const money = (n: number) => formatMoney(n, listing.currency, locale);
  const err = (e: string) => {
    const [code, ref] = e.split(":");
    const text = t.has(`err_${code}`) ? t(`err_${code}` as "err_error") : t("err_error");
    return ref ? `${text} (${ref})` : text;
  };

  const merge = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) byId.set(m.id, m);
      return [...byId.values()].sort((a, b) => a.at.localeCompare(b.at));
    });
    const newest = incoming.reduce((a, m) => (m.at > a ? m.at : a), last.current ?? "");
    last.current = newest || last.current;
  }, []);

  const refresh = useCallback(async () => {
    const r = await chatUpdates(chatId, last.current);
    if (!r.ok) return;
    merge(r.messages);
    setAgreed(r.agreedPrice);
    setStatus(r.listingStatus);
    setOtherRead(r.otherReadAt);
    setState(r.state);
    setNow(Date.now());
  }, [chatId, merge]);

  // Instant updates through Pusher when it's set up; the timer below stays as a safety net.
  const [live, setLive] = useState(false);
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (!realtime) return;
    let stop = () => {};
    let typingTimer: ReturnType<typeof setTimeout>;
    connect(realtime).then((p) => {
      const ch = p.subscribe(`private-chat-${chatId}`);
      ch.bind("update", () => {
        setTyping(false);
        refresh();
      });
      ch.bind("read", (d: { role?: string }) => d.role !== role && refresh());
      ch.bind("typing", (d: { role?: string }) => {
        if (d.role === role) return;
        setTyping(true);
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => setTyping(false), 4000);
      });
      ch.bind("pusher:subscription_succeeded", () => setLive(true));
      const state = ({ current }: { current: string }) => setLive(current === "connected");
      p.connection.bind("state_change", state);
      stop = () => {
        p.connection.unbind("state_change", state);
        p.unsubscribe(`private-chat-${chatId}`);
        clearTimeout(typingTimer);
      };
    });
    return () => stop();
  }, [realtime, chatId, role, refresh]);

  // Tells the other side "… is typing", at most every 3 seconds.
  const lastTyping = useRef(0);
  const onType = (v: string) => {
    setText(v);
    if (!realtime || !v.trim() || Date.now() - lastTyping.current < 3000) return;
    lastTyping.current = Date.now();
    chatTyping(chatId);
  };

  // Checks for new messages every 4 seconds while the page is on screen (every 30 s when instant updates work).
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && refresh(), live ? 30_000 : 4000);
    const onShow = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onShow);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [refresh, live]);

  // The header's unread counter was drawn before this chat was marked as read: redraw it once.
  const router = useRouter();
  useEffect(() => {
    router.refresh();
  }, [router]);

  // The floating WhatsApp button would cover the Send button.
  useEffect(() => {
    document.body.dataset.chat = "1";
    return () => {
      delete document.body.dataset.chat;
    };
  }, []);

  // Opens at the "new messages" line if there is one, else at the bottom.
  const first = useRef(true);
  useEffect(() => {
    if (first.current && dividerRef.current && list.current) {
      list.current.scrollTop = dividerRef.current.offsetTop - list.current.offsetTop - 8;
    } else list.current?.scrollTo({ top: list.current.scrollHeight, behavior: first.current ? "auto" : "smooth" });
    first.current = false;
  }, [messages.length]);

  const seen = (at: string) => !!otherRead && otherRead >= at;
  const ticks = (m: ChatMessage) =>
    m.mine ? (
      <span className={seen(m.at) ? "text-sky-200" : ""} aria-label={seen(m.at) ? t("seen") : t("sent")} title={seen(m.at) ? t("seen") : t("sent")}>
        {" "}{seen(m.at) ? "✓✓" : "✓"}
      </span>
    ) : null;

  const send = (fd: FormData) =>
    start(async () => {
      setError("");
      const r = await sendChatMessage(chatId, fd);
      if (!r.ok) return setError(err(r.error));
      setDivider(null);
      setText("");
      await refresh();
    });

  const sendPhoto = async (f: File | undefined) => {
    if (!f) return;
    setUploading(true);
    try {
      const small = await compressImage(f).catch(() => f);
      const fd = new FormData();
      fd.set("image", small);
      send(fd);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const offer = () =>
    start(async () => {
      setError("");
      const r = await makeOffer(chatId, amount);
      if (!r.ok) return setError(err(r.error));
      setAmount("");
      setKeypad(false);
      await refresh();
    });

  const answer = (id: string, ok: boolean) =>
    start(async () => {
      const r = await answerOffer(id, ok);
      if (!r.ok) setError(err(r.error));
      await refresh();
    });

  const bubble = (m: ChatMessage) => {
    if (m.kind === "SYSTEM")
      return (
        <p className="mx-auto w-fit max-w-[90%] rounded-full bg-surface-2 px-3 py-1 text-center text-[11px] font-semibold text-muted" data-testid="system-line">
          {t.has(`sys_${m.body}`) ? t(`sys_${m.body}` as "sys_closed") : m.body}
        </p>
      );
    if (m.kind === "OFFER") {
            const mine = m.mine;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className="w-64 max-w-[85%] rounded-2xl border-2 border-amber-400 bg-amber-400/10 p-3 text-sm">
                  <p className="text-xs font-semibold text-muted">💰 {mine ? t("yourOffer") : t("theirOffer")}</p>
                  <p className="text-xl font-extrabold">{money(m.offerAmount ?? 0)}</p>
                  {m.offerStatus === "PENDING" && role === "seller" ? (
                    <div className="mt-2 flex gap-2">
                      <button type="button" disabled={pending} onClick={() => answer(m.id, true)} className="btn-primary min-h-9 flex-1 px-3 text-xs">{t("accept")}</button>
                      <button type="button" disabled={pending} onClick={() => answer(m.id, false)} className="btn-secondary min-h-9 flex-1 px-3 text-xs">{t("decline")}</button>
                    </div>
                  ) : (
                    <p className={`mt-1 text-xs font-semibold ${m.offerStatus === "ACCEPTED" ? "text-success" : m.offerStatus === "DECLINED" ? "text-danger" : "text-muted"}`}>
                      {m.offerStatus === "ACCEPTED" ? `✓ ${t("accepted")}` : m.offerStatus === "DECLINED" ? t("declined") : t("waiting")}
                    </p>
                  )}
                </div>
              </div>
            );
          }
          if (m.fromStaff)
            return (
              <div key={m.id} className="mx-auto max-w-[90%] rounded-2xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
                <p className="text-[11px] font-bold text-primary">🛡️ {t("agent")}</p>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            );
          return (
            <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.mine ? "rounded-br-md bg-primary text-white" : "rounded-bl-md bg-surface-2"}`}>
                {m.image && (
                  <a href={m.image} target="_blank" rel="noopener">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.image} alt="" className="mb-1 max-h-60 rounded-xl object-cover" />
                  </a>
                )}
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                <p className={`mt-0.5 text-[10px] ${m.mine ? "text-white/70" : "text-muted"}`}>
                  {new Date(m.at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                  {m.hidden && ` · ${t("hidden")}`}
                  {ticks(m)}
                </p>
              </div>
            </div>
          );
  };

  const press = (k: string) => setAmount((a) => (k === "⌫" ? a.slice(0, -1) : (a + k).replace(/^0+/, "").slice(0, 9)));
  const canOffer = role === "buyer" && status === "ACTIVE" && !state.closed;

  // Phones: the chat takes the whole screen and follows the visible area, so the iPhone keyboard never squeezes it.
  const [view, setView] = useState<{ h: number; top: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    const fit = () => setView({ h: Math.round(vv ? vv.height : window.innerHeight), top: Math.round(vv ? vv.offsetTop : 0) });
    fit();
    vv?.addEventListener("resize", fit);
    vv?.addEventListener("scroll", fit);
    window.addEventListener("resize", fit);
    return () => {
      vv?.removeEventListener("resize", fit);
      vv?.removeEventListener("scroll", fit);
      window.removeEventListener("resize", fit);
    };
  }, []);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [view?.h]);

  const quick = [0.95, 0.9, 0.8].map((f) => Math.round((listing.price * f) / 100));
  const initials = otherName.replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

  return (
    <div
      className="fixed inset-x-0 z-[60] flex flex-col overflow-hidden bg-bg md:static md:z-auto md:h-[calc(100dvh-13rem)] md:min-h-[32rem] md:rounded-3xl md:border md:border-border md:bg-surface"
      style={view ? ({ top: view.top, height: view.h } as React.CSSProperties) : { top: 0, height: "100dvh" }}
      data-testid="chat-room"
    >
      {/* Header: back, who, online/typing */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-primary to-indigo-600 px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] text-white md:pt-2.5">
        <Link href="/account/messages" className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 text-lg" aria-label={t("back")}>←</Link>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-sm font-extrabold text-primary">{initials}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold leading-tight">{otherName}</p>
          <p className="flex items-center gap-1.5 truncate text-xs text-white/85" data-testid="presence">
            {typing ? (
              t("typing", { name: "" }).trim()
            ) : (
              <>
                <span className={`size-2.5 shrink-0 rounded-full ring-2 ring-white/40 ${online ? "bg-emerald-400" : "bg-red-500"}`} aria-hidden />
                {online ? t("online") : state.otherSeenAt ? t("lastSeen", { time: new Date(state.otherSeenAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) }) : t("offline")}
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          disabled={state.agentCalled || pending}
          onClick={() =>
            start(async () => {
              const r = await callAgent(chatId);
              if (!r.ok) setError(err(r.error));
              await refresh();
            })
          }
          className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold text-primary shadow disabled:bg-white/20 disabled:text-white"
        >
          🛡️ {state.agentCalled ? t("agentComing") : t("callAgent")}
        </button>
      </div>

      {/* The account being discussed */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2">
        <Link href={`/market/${listing.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {listing.image && <img src={listing.image} alt="" className="size-11 shrink-0 rounded-xl object-cover" />}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{listing.title}</span>
            <span className="text-sm">{agreed ? <><s className="text-muted">{money(listing.price)}</s> <b className="text-success">{money(agreed)}</b></> : <b>{money(listing.price)}</b>}</span>
          </span>
        </Link>
        {role === "buyer" && status === "ACTIVE" && (
          <div className="w-36 shrink-0 [&_button]:min-h-10 [&_button]:px-2 [&_button]:text-xs">
            <BuyButton listingId={listing.id} locale={locale} signedIn rulesAccepted={rulesAccepted} label={agreed ? tm("buyAtShort", { price: money(agreed) }) : tm("buyShort")} />
          </div>
        )}
      </div>

      <div ref={list} className="relative flex-1 space-y-2 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_1px_1px,rgb(127_127_127/0.12)_1px,transparent_0)] bg-[length:18px_18px] p-3" data-testid="chat-messages">
        <p className="mx-auto w-fit max-w-[92%] rounded-xl bg-amber-400/15 px-3 py-2 text-center text-[11px] text-amber-700 dark:text-amber-300">🔒 {t("safety")}</p>
        {messages.length === 0 && <p className="py-10 text-center text-sm text-muted">{t("empty")}</p>}
        {messages.map((m) => {
          const line =
            divider === m.id ? (
              <div ref={dividerRef} className="flex items-center gap-2 py-1 text-[11px] font-bold uppercase tracking-wide text-primary" data-testid="unread-divider">
                <span className="h-px flex-1 bg-primary/40" />
                {t("newMessages")}
                <span className="h-px flex-1 bg-primary/40" />
              </div>
            ) : null;
          return <div key={m.id}>{line}{bubble(m)}</div>;
        })}
        {typing && (
          <div className="flex justify-start" data-testid="typing" aria-live="polite">
            <p className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-surface-2 px-3 py-2 text-xs text-muted">
              <span className="inline-flex gap-1"><span className="size-1.5 animate-bounce rounded-full bg-muted" /><span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:150ms]" /><span className="size-1.5 animate-bounce rounded-full bg-muted [animation-delay:300ms]" /></span>
              {t("typing", { name: otherName })}
            </p>
          </div>
        )}
      </div>

      {error && <p className="bg-danger-soft px-4 py-2 text-xs text-danger" role="alert">{error}</p>}

      {state.closed ? (
        <div className="border-t border-border bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center" data-testid="chat-closed">
          <p className="text-sm font-semibold">🔒 {t("closedTitle")}</p>
          <p className="mt-0.5 text-xs text-muted">{state.reopenPending ? t("reopenPending") : t("closedHint")}</p>
          {!state.reopenPending && (
            <button type="button" onClick={() => setReopenOpen(true)} className="btn-secondary mt-2 min-h-10 px-4 text-sm">{t("askReopen")}</button>
          )}
        </div>
      ) : (
      <form
        className="flex items-center gap-2 border-t border-border bg-surface p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          const fd = new FormData();
          fd.set("text", text);
          send(fd);
        }}
      >
        {canOffer && (
          <button type="button" onClick={() => setKeypad(true)} aria-label={t("makeOffer")} className="grid size-11 shrink-0 place-items-center rounded-full bg-amber-400 text-lg font-extrabold text-black shadow">$</button>
        )}
        <button type="button" disabled={uploading || pending} onClick={() => fileRef.current?.click()} aria-label={t("photo")} className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-primary">
          {uploading ? <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : <ImageIcon />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => sendPhoto(e.target.files?.[0])} data-testid="chat-photo" />
        {/* 16px text: iPhone doesn't zoom the page when the field is tapped */}
        <input value={text} onChange={(e) => onType(e.target.value)} maxLength={1000} placeholder={t("placeholder")} aria-label={t("placeholder")} enterKeyHint="send" className="input min-h-11 flex-1 rounded-full text-base" />
        <button disabled={!text.trim() || pending} aria-label={t("send")} className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-white shadow disabled:opacity-50"><SendIcon width={18} height={18} /></button>
      </form>
      )}

      {/* Ask staff to reopen a closed chat */}
      {reopenOpen && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end bg-black/40" onClick={() => setReopenOpen(false)}>
          <form
            className="space-y-3 rounded-t-3xl bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await requestReopen(chatId, reason);
                if (!r.ok) return setError(err(r.error));
                setReopenOpen(false);
                setReason("");
                await refresh();
              });
            }}
          >
            <p className="font-bold">{t("askReopen")}</p>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} minLength={5} maxLength={500} required placeholder={t("reopenPlaceholder")} className="input py-2 text-base" />
            <button className="btn-primary min-h-12 w-full" disabled={pending || reason.trim().length < 5}>{t("sendRequest")}</button>
          </form>
        </div>
      )}

      {/* Offer keypad: a sheet over the chat, always fully visible */}
      {keypad && (
        <div className="absolute inset-0 z-10 flex flex-col justify-end bg-black/40" onClick={() => setKeypad(false)}>
          <div className="max-h-full overflow-y-auto rounded-t-3xl bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="offer-sheet">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-bold">💰 {t("enterOffer")}</p>
              <button type="button" onClick={() => setKeypad(false)} className="grid size-9 place-items-center rounded-full bg-surface-2" aria-label={t("close")}><CloseIcon width={16} height={16} /></button>
            </div>
            <p className="rounded-2xl border-2 border-amber-400 bg-amber-400/10 py-3 text-center text-3xl font-extrabold tabular-nums" data-testid="offer-amount">{money((Number(amount) || 0) * 100)}</p>
            <p className="mt-1 text-center text-xs text-muted">{t("listedAt", { price: money(listing.price) })}</p>
            <div className="mt-3 flex gap-2">
              {quick.map((v, i) => (
                <button key={i} type="button" onClick={() => setAmount(String(v))} className="flex-1 rounded-xl border border-border px-2 py-2 text-xs font-semibold hover:border-amber-400">
                  −{[5, 10, 20][i]}% · {money(v * 100)}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "⌫"].map((k) => (
                <button key={k} type="button" onClick={() => press(k)} aria-label={k === "⌫" ? t("erase") : k} className={`h-12 rounded-xl text-xl font-bold active:scale-95 ${k === "⌫" ? "bg-surface-2" : "border border-border bg-bg"}`}>{k}</button>
              ))}
            </div>
            <button type="button" disabled={!amount || pending} onClick={offer} className="btn-primary mt-3 min-h-12 w-full !bg-amber-400 text-base !text-black">{t("sendOffer")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
