"use client";
import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { placeOrder } from "@/actions/checkout";
import { formatMoney } from "@/lib/money";
import { t } from "@/lib/text";
import { linePrice, useStore } from "./CartProvider";
import { ProductArtSmall } from "./ProductArtSmall";
import { MoneySplit } from "@/components/Money";
import { LockIcon, WalletIcon } from "@/components/Icons";
import { PhoneInput } from "@/components/PhoneInput";
import { PayLogo } from "@/components/PayLogo";
import { priceIn } from "@/lib/money";
import { PENDING_ORDER_KEY } from "@/components/OrderPayment";

type Method = string; // "WALLET" | "MONCASH" | "NATCASH" | "MANUAL:<id>"
type Manual = { id: string; name: string; instructions: string; logo: string | null };

type Zone = { id: string; name: string; feeHtg: number; eta: string | null };

export function CheckoutForm({ balances, moncashEnabled, natcashEnabled, manualMethods = [], zones = [], codEnabled = false, usdWallet = true }: { balances: { HTG: number; USD: number }; moncashEnabled: boolean; natcashEnabled: boolean; manualMethods?: Manual[]; zones?: Zone[]; codEnabled?: boolean; usdWallet?: boolean }) {
  const tc = useTranslations("checkout");
  const tcart = useTranslations("cart");
  const locale = useLocale();
  const router = useRouter();
  const store = useStore();
  const [method, setMethod] = useState<Method>(moncashEnabled ? "MONCASH" : natcashEnabled ? "NATCASH" : "WALLET");
  const [showNote, setShowNote] = useState(false);
  const [walletCurrency, setWalletCurrency] = useState<"HTG" | "USD">(usdWallet ? store.currency : "HTG");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  // Physical products (accessories): where to deliver
  const hasPhysical = store.lines.some((l) => l.physical);
  const allPhysical = store.lines.length > 0 && store.lines.every((l) => l.physical);
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [dName, setDName] = useState("");
  const [dAddress, setDAddress] = useState("");
  const [dNote, setDNote] = useState("");
  const zone = zones.find((z) => z.id === zoneId);
  const [pending, start] = useTransition();

  const currency = method === "WALLET" ? walletCurrency : "HTG";
  const fee = hasPhysical && zone ? priceIn(zone.feeHtg, currency, store.htgPerUsd) : 0;
  const total = store.lines.reduce((s, l) => s + linePrice(l, currency, store.htgPerUsd) * l.quantity, 0) + fee;
  const insufficient = method === "WALLET" && balances[walletCurrency] < total;
  // The wallet can't cover the order in any currency it holds: show it greyed out with a "top up" link
  const totalIn = (c: "HTG" | "USD") => store.lines.reduce((s, l) => s + linePrice(l, c, store.htgPerUsd) * l.quantity, 0) + (hasPhysical && zone ? priceIn(zone.feeHtg, c, store.htgPerUsd) : 0);
  const walletShort = store.ready && balances.HTG < totalIn("HTG") && (!usdWallet || balances.USD < totalIn("USD"));
  // If the wallet was picked by default but can't pay, move to the first other method
  useEffect(() => {
    if (walletShort && method === "WALLET") {
      const next = moncashEnabled ? "MONCASH" : natcashEnabled ? "NATCASH" : manualMethods[0] ? `MANUAL:${manualMethods[0].id}` : null;
      if (next) setMethod(next);
    }
  }, [walletShort, method, moncashEnabled, natcashEnabled, manualMethods]);
  const fmt = (n: number, c: "HTG" | "USD") => formatMoney(n, c, locale);

  // The total bar sticks to the bottom of the screen: hide the floating WhatsApp button under it on phones.
  useEffect(() => {
    document.body.dataset.buybar = "1";
    return () => {
      delete document.body.dataset.buybar;
    };
  }, []);

  if (store.ready && store.lines.length === 0)
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-border bg-surface/80 p-10 text-center">
        <p className="text-muted">{tcart("empty")}</p>
        <Link href="/store" className="btn-primary mt-6">{tcart("emptyCta")}</Link>
      </div>
    );

  function submit() {
    setError("");
    // Say what is missing instead of a grey button that does nothing
    if (insufficient) {
      setError(tc("errors.insufficient"));
      return;
    }
    if (hasPhysical) {
      const missing = !zone ? "checkout-zone" : !dName.trim() ? "checkout-dname" : dAddress.trim().length < 5 ? "checkout-daddress" : null;
      if (missing) {
        setError(tc("deliveryMissing"));
        const el = document.getElementById(missing);
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
        el?.focus({ preventScroll: true });
        return;
      }
    }
    start(async () => {
      const res = await placeOrder({
        items: store.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, fields: l.fields, ...(l.amount ? { amount: l.amount } : {}) })),
        currency,
        method: method.startsWith("MANUAL:") ? "MANUAL" : method,
        manualMethodId: method.startsWith("MANUAL:") ? method.slice(7) : undefined,
        note: note || undefined,
        ...(hasPhysical
          ? { delivery: { zoneId, name: dName, phone: String(new FormData(document.getElementById("checkout-delivery") as HTMLFormElement).get("phone") ?? ""), address: dAddress, note: dNote || undefined } }
          : {}),
      });
      if (!res.ok) {
        if (res.error === "signin") return router.push("/auth/login?next=/checkout");
        setError(tc.has(`errors.${res.error}`) ? tc(`errors.${res.error}`) : tc("errors.generic"));
        return;
      }
      if (res.redirect) {
        // Leaving for MonCash: keep the cart until that order is paid (canceling there must not lose it)
        try {
          localStorage.setItem(PENDING_ORDER_KEY, res.orderId);
        } catch {}
        window.location.href = res.redirect;
        return;
      }
      store.clear();
      router.push(`/account/orders/${res.orderId}`);
    });
  }

  const options: { id: Method; title: string; hint: string; enabled: boolean; icon: React.ReactNode; tone: string; tag?: string; tagTone?: string }[] = [
    {
      id: "MONCASH", title: tc("moncash"), hint: tc("moncashHint"), enabled: moncashEnabled,
      icon: <PayLogo brand="moncash" height={16} />, tone: "bg-white", tag: tc("tagAuto"), tagTone: "bg-[#9f1239]/40 text-[#fecdd3]",
    },
    {
      id: "NATCASH", title: tc("natcash"), hint: tc("natcashHint"), enabled: natcashEnabled,
      icon: <PayLogo brand="natcash" height={16} />, tone: "bg-white", tag: tc("tagChecked"), tagTone: "bg-[#ea580c]/25 text-[#fed7aa]",
    },
    {
      id: "WALLET",
      title: tc("wallet"),
      hint: usdWallet ? `${tc("walletBalance", { balance: fmt(balances.HTG, "HTG") })} · ${fmt(balances.USD, "USD")}` : tc("walletBalance", { balance: fmt(balances.HTG, "HTG") }),
      enabled: true,
      icon: <WalletIcon width={22} height={22} />, tone: "bg-[#1d4ed8]/30 text-[#93c5fd]", tag: tc("tagInstant"), tagTone: "bg-emerald-500/20 text-emerald-300",
    },
    {
      id: "COD",
      title: tc("cod"),
      hint: tc("codHint"),
      enabled: codEnabled && allPhysical,
      icon: <CashGlyph />, tone: "bg-emerald-500/20 text-emerald-300",
    },
    ...manualMethods.map((m) => ({
      id: `MANUAL:${m.id}`,
      title: m.name,
      hint: m.instructions || tc("natcashHint"),
      enabled: true,
      // eslint-disable-next-line @next/next/no-img-element
      icon: m.logo ? <img src={m.logo} alt="" className="h-7 w-7 rounded-md object-contain" /> : <span className="display text-sm font-extrabold">{m.name.slice(0, 2).toUpperCase()}</span>,
      tone: "bg-slate-500/25 text-slate-200",
    })),
  ];
  const blocked = pending || !store.ready || (hasPhysical && zones.length === 0);
  let n = 1;
  const step = (title: string) => (
    <h2 className="display flex items-center gap-2.5 text-lg font-bold">
      <span className="step-dot">{n++}</span>
      {title}
    </h2>
  );
  const payButton = (className: string) => (
    <button type="button" className={`btn-primary min-h-[3.25rem] w-full text-base ${className}`} onClick={submit} disabled={blocked}>
      {pending ? tc("placing") : <><LockIcon width={17} height={17} /> {tc("placeOrder")} · {fmt(total, currency)}</>}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Progress: 1 cart ✓ · 2 payment (here) · 3 delivery */}
      <div>
        <p className="eyebrow flex items-center gap-1.5 text-emerald-400"><LockIcon width={13} height={13} /> {tc("secureCheckout")}</p>
        <h1 className="display mt-1 text-3xl font-extrabold tracking-tight">{tc("title")}</h1>
        <ol className={`mt-4 grid gap-2 text-[11px] font-bold uppercase tracking-wide sm:text-xs ${hasPhysical ? "grid-cols-3" : "grid-cols-2"}`}>
          {[tc("stepCart"), tc("stepPay"), ...(hasPhysical ? [tc("stepDelivery")] : [])].map((label, i) => (
            <li key={label}>
              <span className={`block h-1.5 rounded-full ${i === 0 ? "bg-emerald-500" : i === 1 ? "bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6]" : "bg-surface-2"}`} />
              <span className={`mt-1.5 flex items-center gap-1 ${i === 0 ? "text-emerald-400" : i === 1 ? "text-[#60a5fa]" : "text-muted"}`}>{i === 0 ? "✓" : `${i + 1}.`} {label}</span>
            </li>
          ))}
        </ol>
      </div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-7">
        <section className="space-y-3">
          {step(tc("paymentMethod"))}
          <fieldset className="space-y-2.5">
            <legend className="sr-only">{tc("paymentMethod")}</legend>
            {options.filter((o) => o.enabled).map((o) => {
              const on = method === o.id;
              if (o.id === "WALLET" && walletShort) {
                return (
                  <div key={o.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-surface/50 p-3.5 opacity-80 sm:p-4" aria-disabled="true">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted" aria-hidden>{o.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="display block font-bold text-muted">{o.title}</span>
                      <span className="mt-0.5 block text-sm text-muted">{o.hint} · {tc("walletShort")}</span>
                    </span>
                    <Link href="/account/wallet/deposit" className="btn-secondary min-h-11 shrink-0 px-3 text-sm">{tc("topUp")}</Link>
                  </div>
                );
              }
              return (
                <label
                  key={o.id}
                  className={`relative flex cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#60a5fa] items-center gap-3 rounded-2xl border p-3.5 transition-all sm:p-4 ${on ? "border-[#3b82f6] bg-gradient-to-r from-[#1d4ed8]/20 to-[#111827] shadow-[0_0_0_1px_#3b82f6]" : "border-border bg-surface/90 hover:border-[#3b82f6]/50"}`}
                >
                  <span className={`grid h-12 w-14 shrink-0 place-items-center rounded-xl px-1 ${o.tone}`} aria-hidden>{o.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="display font-bold">{o.title}</span>
                      {o.tag && <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${o.tagTone}`}>{o.tag}</span>}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">{o.hint}</span>
                  </span>
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${on ? "border-primary bg-primary text-white" : "border-muted/60 bg-transparent"}`} aria-hidden>
                    {on && <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>}
                  </span>
                  <input type="radio" name="method" className="absolute right-3.5 top-1/2 z-10 size-6 -translate-y-1/2 cursor-pointer opacity-0 sm:right-4" checked={on} onChange={() => setMethod(o.id)} />
                </label>
              );
            })}
          </fieldset>

          {method === "WALLET" ? (
            <div>
              {usdWallet && <span className="label">{tc("payIn")}</span>}
              <div className={`inline-flex rounded-xl border border-border bg-surface p-1 ${usdWallet ? "" : "hidden"}`}>
                {(["HTG", "USD"] as const).map((c) => (
                  <button key={c} type="button" onClick={() => setWalletCurrency(c)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${walletCurrency === c ? "bg-primary text-white" : ""}`}>
                    {c}
                  </button>
                ))}
              </div>
              {insufficient && (
                <p className="mt-3 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
                  {tc("errors.insufficient")} <Link href="/account/wallet/deposit" className="font-semibold underline">{tc("topUp")}</Link>
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted">{tc("htgOnly")}</p>
          )}
        </section>

        {hasPhysical && (
          <section className="space-y-3">
            {step(tc("deliveryTitle"))}
            <form id="checkout-delivery" className="space-y-3 rounded-2xl border border-border bg-surface/80 p-4" onSubmit={(e) => e.preventDefault()}>
              <p className="text-sm text-muted">{tc("deliveryHint")}</p>
              {zones.length === 0 ? (
                <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{tc("deliveryNone")}</p>
              ) : (
                <label className="block">
                  <span className="label">{tc("deliveryZone")}</span>
                  <select id="checkout-zone" value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="input">
                    {zones.map((z) => <option key={z.id} value={z.id}>{z.name} · {z.feeHtg ? fmt(z.feeHtg, "HTG") : tc("free")}{z.eta ? ` · ${z.eta}` : ""}</option>)}
                  </select>
                </label>
              )}
              <label className="block"><span className="label">{tc("deliveryName")}</span><input id="checkout-dname" value={dName} onChange={(e) => { setDName(e.target.value); setError(""); }} maxLength={80} autoComplete="name" className="input" /></label>
              <div><span className="label">{tc("deliveryPhone")}</span><PhoneInput id="delivery-phone" name="phone" /></div>
              <label className="block"><span className="label">{tc("deliveryAddress")}</span><textarea id="checkout-daddress" value={dAddress} onChange={(e) => { setDAddress(e.target.value); setError(""); }} rows={2} maxLength={300} autoComplete="street-address" className="input" /></label>
              <label className="block"><span className="label">{tc("deliveryNote")}</span><input value={dNote} onChange={(e) => setDNote(e.target.value)} maxLength={300} className="input" /></label>
            </form>
          </section>
        )}

        {/* Optional message for a gift: a small link, opened only by those who want it */}
        {showNote || note ? (
          <section className="space-y-2 rounded-2xl border border-border bg-surface/80 p-4">
            <label htmlFor="note" className="label">{tc("giftNote")}</label>
            <input id="note" className="input" maxLength={300} placeholder={tc("giftNotePlaceholder")} value={note} onChange={(e) => setNote(e.target.value)} autoFocus={showNote && !note} />
          </section>
        ) : (
          <button type="button" onClick={() => setShowNote(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-1 text-sm font-semibold text-[#60a5fa] hover:underline">
            {tc("addNote")}
          </button>
        )}
      </div>

      <aside className="relative h-fit space-y-4 overflow-hidden rounded-2xl border border-border bg-surface/90 p-5 lg:sticky lg:top-24">
        <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#1d4ed8] via-[#7c3aed] to-[#dc2626]" />
        <h2 className="display text-lg font-bold">{tc("summary")}</h2>
        <ul className="space-y-3 text-sm">
          {store.lines.map((l) => (
            <li key={l.key} className="flex items-center gap-3">
              <ProductArtSmall name={t(l.productName, locale)} accent={l.accent} image={l.image} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{t(l.productName, locale)}</span>
                <span className="text-xs text-[#60a5fa]">{t(l.variantName, locale)} × {l.quantity}</span>
                {Object.values(l.fields).some(Boolean) && (
                  <span className="mt-0.5 flex min-w-0 items-center gap-2 text-xs">
                    <span className="truncate font-mono font-semibold">{Object.values(l.fields).filter(Boolean).join(" · ")}</span>
                    <Link href="/cart" className="shrink-0 font-semibold text-[#60a5fa] underline-offset-2 hover:underline">{tc("change")}</Link>
                  </span>
                )}
              </span>
              <span className="shrink-0 font-bold">{fmt(linePrice(l, currency, store.htgPerUsd) * l.quantity, currency)}</span>
            </li>
          ))}
        </ul>
        {hasPhysical && (
          <div className="flex justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted">{tc("deliveryFee")}{zone ? ` · ${zone.name}` : ""}</span>
            <span className="font-medium">{fee ? fmt(fee, currency) : tc("free")}</span>
          </div>
        )}
        <div className="hidden space-y-4 lg:block">
          <div className="rounded-xl bg-[#0b0f19]/60 px-4 py-3">
            <span className="eyebrow block text-[10px] text-muted">{tc("totalDue")}</span>
            <MoneySplit minor={total} currency={currency} locale={locale} className="display text-[1.8rem] font-extrabold tracking-tight" />
          </div>
          {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
          {payButton("")}
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted"><LockIcon width={12} height={12} /> {tc("secureNote")}</p>
        </div>
      </aside>
    </div>

      {/* Phones and tablets: total and pay button stay at the bottom of the screen */}
      <div className="kb-hide sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-30 md:bottom-4 lg:hidden">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/95 px-3 py-2.5 shadow-[0_-10px_40px_-12px_rgba(0,0,0,.8)] backdrop-blur">
          <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#1d4ed8] via-[#7c3aed] to-[#dc2626]" />
          {error && <p className="mb-2 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
          <div className="flex items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="eyebrow block whitespace-nowrap text-[10px] text-muted">{tc("totalDue")}</span>
              <MoneySplit minor={total} currency={currency} locale={locale} className="display block whitespace-nowrap text-xl font-extrabold leading-tight tracking-tight" />
            </span>
            <button type="button" className="btn-primary min-h-11 shrink-0 px-4 text-sm" onClick={submit} disabled={blocked}>
              {pending ? tc("placing") : <><LockIcon width={15} height={15} /> {tc("placeOrder")}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


const CashGlyph = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 9.5v5M18 9.5v5" />
  </svg>
);
