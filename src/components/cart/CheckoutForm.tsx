"use client";
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { placeOrder } from "@/actions/checkout";
import { formatMoney } from "@/lib/money";
import { t } from "@/lib/text";
import { linePrice, useStore } from "./CartProvider";
import { PayLogo } from "@/components/PayLogo";
import { PhoneInput } from "@/components/PhoneInput";
import { priceIn } from "@/lib/money";

type Method = string; // "WALLET" | "MONCASH" | "NATCASH" | "MANUAL:<id>"
type Manual = { id: string; name: string; instructions: string; logo: string | null };

type Zone = { id: string; name: string; feeHtg: number; eta: string | null };

export function CheckoutForm({ balances, moncashEnabled, natcashEnabled, manualMethods = [], zones = [], codEnabled = false }: { balances: { HTG: number; USD: number }; moncashEnabled: boolean; natcashEnabled: boolean; manualMethods?: Manual[]; zones?: Zone[]; codEnabled?: boolean }) {
  const tc = useTranslations("checkout");
  const tcart = useTranslations("cart");
  const locale = useLocale();
  const router = useRouter();
  const store = useStore();
  const [method, setMethod] = useState<Method>(moncashEnabled ? "MONCASH" : "WALLET");
  const [walletCurrency, setWalletCurrency] = useState<"HTG" | "USD">(store.currency);
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
  const fmt = (n: number, c: "HTG" | "USD") => formatMoney(n, c, locale);

  if (store.ready && store.lines.length === 0)
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <p className="text-muted">{tcart("empty")}</p>
        <Link href="/store" className="btn-primary mt-6">{tcart("emptyCta")}</Link>
      </div>
    );

  function submit() {
    setError("");
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
      store.clear();
      if (res.redirect) window.location.href = res.redirect;
      else router.push(`/account/orders/${res.orderId}`);
    });
  }

  const options: { id: Method; title: string; hint: string; enabled: boolean; badge: React.ReactNode }[] = [
    { id: "MONCASH", title: tc("moncash"), hint: tc("moncashHint"), enabled: moncashEnabled, badge: <PayLogo brand="moncash" height={24} /> },
    { id: "NATCASH", title: tc("natcash"), hint: tc("natcashHint"), enabled: natcashEnabled, badge: <PayLogo brand="natcash" height={24} /> },
    {
      id: "WALLET",
      title: tc("wallet"),
      hint: `${tc("walletBalance", { balance: fmt(balances.HTG, "HTG") })} · ${fmt(balances.USD, "USD")}`,
      enabled: true,
      badge: <span className="rounded-md bg-navy px-2 py-1 text-[11px] font-extrabold text-white">HG</span>,
    },
    {
      id: "COD",
      title: tc("cod"),
      hint: tc("codHint"),
      enabled: codEnabled && allPhysical,
      badge: <span className="rounded-md bg-success px-2 py-1 text-[11px] font-extrabold text-white">CASH</span>,
    },
    ...manualMethods.map((m) => ({
      id: `MANUAL:${m.id}`,
      title: m.name,
      hint: m.instructions || tc("natcashHint"),
      enabled: true,
      // eslint-disable-next-line @next/next/no-img-element
      badge: m.logo ? <img src={m.logo} alt="" className="h-6 w-auto rounded" /> : <span className="rounded-md bg-steel px-2 py-1 text-[11px] font-extrabold text-white">{m.name.slice(0, 10)}</span>,
    })),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">{tc("title")}</h1>
        <fieldset className="space-y-3">
          <legend className="label">{tc("paymentMethod")}</legend>
          {options.filter((o) => o.enabled).map((o) => (
            <label
              key={o.id}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 ${method === o.id ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
            >
              <input type="radio" name="method" className="mt-1 accent-[var(--primary)]" checked={method === o.id} onChange={() => setMethod(o.id)} />
              <span className="flex-1">
                <span className="flex items-center gap-2 font-semibold">{o.badge} {o.title}</span>
                <span className="mt-1 block text-sm text-muted">{o.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {method === "WALLET" ? (
          <div>
            <span className="label">{tc("payIn")}</span>
            <div className="inline-flex rounded-xl border border-border bg-surface p-1">
              {(["HTG", "USD"] as const).map((c) => (
                <button key={c} type="button" onClick={() => setWalletCurrency(c)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${walletCurrency === c ? "bg-primary text-white" : ""}`}>
                  {c}
                </button>
              ))}
            </div>
            {insufficient && (
              <p className="mt-3 text-sm text-danger">
                {tc("errors.insufficient")} <Link href="/account/wallet/deposit" className="font-semibold underline">{tc("topUp")}</Link>
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">{tc("htgOnly")}</p>
        )}

        {hasPhysical && (
          <form id="checkout-delivery" className="card space-y-3 p-4" onSubmit={(e) => e.preventDefault()}>
            <h2 className="font-semibold">{tc("deliveryTitle")}</h2>
            <p className="text-sm text-muted">{tc("deliveryHint")}</p>
            {zones.length === 0 ? (
              <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{tc("deliveryNone")}</p>
            ) : (
              <label className="block">
                <span className="label">{tc("deliveryZone")}</span>
                <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="input">
                  {zones.map((z) => <option key={z.id} value={z.id}>{z.name} · {z.feeHtg ? fmt(z.feeHtg, "HTG") : tc("free")}{z.eta ? ` · ${z.eta}` : ""}</option>)}
                </select>
              </label>
            )}
            <label className="block"><span className="label">{tc("deliveryName")}</span><input value={dName} onChange={(e) => setDName(e.target.value)} maxLength={80} autoComplete="name" className="input" /></label>
            <div><span className="label">{tc("deliveryPhone")}</span><PhoneInput id="delivery-phone" name="phone" /></div>
            <label className="block"><span className="label">{tc("deliveryAddress")}</span><textarea value={dAddress} onChange={(e) => setDAddress(e.target.value)} rows={2} maxLength={300} autoComplete="street-address" className="input" /></label>
            <label className="block"><span className="label">{tc("deliveryNote")}</span><input value={dNote} onChange={(e) => setDNote(e.target.value)} maxLength={300} className="input" /></label>
          </form>
        )}

        <div>
          <label htmlFor="note" className="label">{tc("giftNote")}</label>
          <input id="note" className="input" maxLength={300} placeholder={tc("giftNotePlaceholder")} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-24">
        <h2 className="font-semibold">{tc("summary")}</h2>
        <ul className="space-y-2 text-sm">
          {store.lines.map((l) => (
            <li key={l.key} className="flex justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate">{t(l.productName, locale)}</span>
                <span className="text-xs text-muted">{t(l.variantName, locale)} × {l.quantity}</span>
              </span>
              <span className="shrink-0 font-medium">{fmt(linePrice(l, currency, store.htgPerUsd) * l.quantity, currency)}</span>
            </li>
          ))}
        </ul>
        {hasPhysical && (
          <div className="flex justify-between text-sm">
            <span className="text-muted">{tc("deliveryFee")}{zone ? ` · ${zone.name}` : ""}</span>
            <span className="font-medium">{fee ? fmt(fee, currency) : tc("free")}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="font-semibold">{tc("total")}</span>
          <span className="text-xl font-bold">{fmt(total, currency)}</span>
        </div>
        {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
        <button type="button" className="btn-primary min-h-12 w-full" onClick={submit} disabled={pending || insufficient || !store.ready || (hasPhysical && (!zone || !dName.trim() || dAddress.trim().length < 5))}>
          {pending ? tc("placing") : tc("placeOrder")}
        </button>
      </aside>
    </div>
  );
}
