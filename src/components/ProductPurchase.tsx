"use client";
import { checkPlayer } from "@/actions/player";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { t } from "@/lib/text";
import type { FieldDef } from "@/lib/orders";
import { useStore } from "./cart/CartProvider";
import { MoneySplit, Price, PriceSplit } from "./Money";
import { BagIcon, BoltIcon, CartIcon, GiftIcon, HelpIcon, LockIcon } from "./Icons";
import { formatMoney, parseAmount } from "@/lib/money";
import { amountInRange, customerRate, quoteAmount } from "@/lib/amount";
import type { ExchangePricing } from "@/lib/amount";

type Variant = { id: string; name: Record<string, string>; priceHtg: number; salePriceHtg: number | null; inStock: boolean; lowStock?: boolean; canCheck?: boolean };
type Props = {
  product: { id: string; slug: string; name: Record<string, string>; accent: string | null; image: string | null; fields: FieldDef[]; variants: Variant[]; physical?: boolean };
  saved: { id: string; label: string | null; values: Record<string, string> }[];
  pricing?: ExchangePricing;
};

export function ProductPurchase({ product, saved, pricing }: Props) {
  const tp = useTranslations("product");
  const locale = useLocale();
  const router = useRouter();
  const { add } = useStore();
  const mode = pricing ?? null;
  const [amountText, setAmountText] = useState(mode?.presets[0] ? String(mode.presets[0]) : "");
  const amount = parseAmount(amountText);
  const quote = mode && amount && amountInRange(mode, amount) ? quoteAmount(mode, amount) : null;
  const usd = (minor: number) => formatMoney(minor, "USD", locale);
  const firstAvailable = product.variants.find((v) => v.inStock) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.id);
  const [qty, setQty] = useState(1);
  const [fields, setFields] = useState<Record<string, string>>(saved[0]?.values ?? {});
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const variant = product.variants.find((v) => v.id === variantId);

  function submit(goToCart: boolean) {
    setError("");
    if (!variant || !variant.inStock) return;
    if (mode && !quote) {
      setError(tp("amountError", { min: usd(mode.min), max: usd(mode.max) }));
      document.getElementById("amount")?.focus();
      return;
    }
    for (const f of product.fields) {
      if (f.required && !fields[f.key]?.trim()) {
        setError(`${t(f.label, locale)} *`);
        document.getElementById(`field-${f.key}`)?.focus();
        return;
      }
    }
    add({
      variantId: variant.id,
      productSlug: product.slug,
      productName: product.name,
      variantName: quote ? { ht: usd(quote.amount), fr: usd(quote.amount), en: usd(quote.amount), es: usd(quote.amount) } : variant.name,
      accent: product.accent,
      image: product.image,
      priceHtg: quote ? quote.totalHtg : variant.salePriceHtg ?? variant.priceHtg,
      ...(quote ? { amount: quote.amount, priceUsd: quote.totalUsd } : {}),
      quantity: quote ? 1 : qty,
      fields: Object.fromEntries(product.fields.map((f) => [f.key, (fields[f.key] ?? "").trim()]).filter(([, v]) => v)),
      ...(product.physical ? { physical: true } : {}),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
    if (goToCart) router.push("/cart");
  }

  // Game top-ups ask for a player ID: that step gets the player wording, the "where is my ID?" link and a gem icon on the tiles.
  const hasPlayer = product.fields.some((f) => /player|uid|gameid|game_id|zone|server/i.test(f.key));
  const total = mode ? (quote ? quote.totalHtg : null) : variant ? (variant.salePriceHtg ?? variant.priceHtg) * qty : null;
  const TileIcon = hasPlayer ? GemIcon : product.physical ? BagIcon : GiftIcon;

  // The total bar sticks to the bottom of the screen: hide the floating WhatsApp button under it on phones.
  useEffect(() => {
    document.body.dataset.buybar = "1";
    return () => {
      delete document.body.dataset.buybar;
    };
  }, []);

  const step = (n: number, title: string, aside?: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3">
      <h2 className="display flex items-center gap-2.5 text-lg font-bold">
        <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-[#1d4ed8] to-[#3b82f6] text-sm font-extrabold text-white shadow-[0_0_16px_-2px_rgba(59,130,246,.8)]">{n}</span>
        {title}
      </h2>
      {aside}
    </div>
  );
  let n = 1;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
      {step(n++, mode ? tp("enterUsd") : tp("chooseOption"))}
      {mode ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-success/30 bg-success-soft px-4 py-3 text-success">
            <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
              <span className="h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_0_4px_rgba(19,138,82,.18)]" aria-hidden />
              {tp("rateToday")}
            </span>
            <span className="text-lg font-extrabold tabular-nums">1 USD = {new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-HT", { maximumFractionDigits: 2 }).format(customerRate(mode))} HTG</span>
          </div>
          <div className="rounded-2xl border border-border bg-surface/80 p-4">
            <label htmlFor="amount" className="eyebrow mb-2 block text-muted">{tp("enterUsd")}</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted">$</span>
              <input
                id="amount"
                className="input h-14 bg-[#0b0f19]/60 pl-9 text-xl font-bold"
                inputMode="decimal"
                autoComplete="off"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value.replace(",", ".").replace(/[^\d.]/g, "").slice(0, 9))}
                aria-describedby="amount-hint"
              />
            </div>
            <p id="amount-hint" className="mt-1 text-xs text-muted">{tp("amountRange", { min: usd(mode.min), max: usd(mode.max) })}</p>
            {mode.presets.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {mode.presets.map((p) => (
                  <button key={p} type="button" onClick={() => setAmountText(String(p))} className={`display min-h-12 rounded-xl border-2 px-3 text-base font-extrabold transition-all ${amount === p * 100 ? "border-[#3b82f6] bg-[#1d4ed8]/20 text-[#93c5fd] shadow-[0_0_18px_-6px_rgba(59,130,246,.8)]" : "border-border bg-surface hover:border-[#3b82f6]/50"}`}>
                    ${p}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2 rounded-2xl border border-border bg-surface-2/60 p-4" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-muted">{t(product.name, locale)}:</span>
              <span className="text-right">
                <b className="text-lg tabular-nums">{quote ? usd(quote.amount) : "—"}</b>
                {quote && quote.fee > 0 && <span className="ml-2 text-sm font-semibold text-warning">+ {usd(quote.fee)} {tp("fee")}</span>}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-muted">{tp("youPay")}:</span>
              <b className="text-xl tabular-nums">{quote ? formatMoney(quote.totalHtg, "HTG", locale) : "—"}</b>
            </div>
          </div>
        </div>
      ) : (
      <fieldset>
        <legend className="sr-only">{tp("chooseOption")}</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          {product.variants.map((v) => {
            const active = v.id === variantId;
            return (
              <label
                key={v.id}
                className={`pkg-tile relative flex min-h-[7.5rem] cursor-pointer flex-col rounded-2xl border p-3.5 transition-all ${
                  active
                    ? "border-[#3b82f6] bg-gradient-to-br from-[#1d4ed8]/25 to-[#1e293b] shadow-[0_0_0_1px_#3b82f6,0_18px_36px_-18px_rgba(59,130,246,.9)]"
                    : "border-border bg-surface/90 hover:border-[#3b82f6]/50"
                } ${!v.inStock ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input type="radio" name="variant" value={v.id} checked={active} disabled={!v.inStock} onChange={() => setVariantId(v.id)} className="sr-only" />
                <span className={`flex items-start gap-1.5 pr-4 text-[15px] font-bold leading-snug ${!v.inStock ? "text-muted line-through decoration-danger decoration-2" : "text-[#60a5fa]"}`}>
                  <TileIcon width={16} height={16} className="mt-0.5 shrink-0" />
                  <span className="display min-w-0">{t(v.name, locale)}</span>
                </span>
                <span className="mt-auto flex items-end justify-between gap-2 pt-3">
                  <span className="min-w-0">
                    {v.salePriceHtg && <Price htg={v.priceHtg} className="block text-xs text-muted line-through" />}
                    <PriceSplit htg={v.salePriceHtg ?? v.priceHtg} className={`display block text-[1.6rem] font-extrabold leading-none tracking-tight ${!v.inStock ? "text-muted" : active ? "text-white" : "text-text"}`} />
                  </span>
                  {active && v.inStock && <CheckCircle className="shrink-0 text-[#93c5fd]" />}
                </span>
                {v.salePriceHtg && v.inStock && <span className="absolute -top-2 left-3 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">−%</span>}
                {!v.inStock && <span className="mt-1 text-xs font-semibold text-danger">{tp("soldOut")}</span>}
                {/* Green: available · orange (pulsing): stock is low · red: sold out */}
                <span
                  className={`absolute right-3 top-3 h-2 w-2 rounded-full ${!v.inStock ? "bg-danger" : v.lowStock ? "low-dot bg-warning" : "bg-success"}`}
                  title={!v.inStock ? tp("soldOut") : v.lowStock ? tp("lowStock") : tp("inStock")}
                  aria-hidden
                />
              </label>
            );
          })}
        </div>
        {variant?.inStock && variant.lowStock && <LowStock name={t(variant.name, locale)} seed={variant.id} />}
      </fieldset>
      )}
      </section>

      {/* Step 2: what we need to deliver (player ID, email…) */}
      {product.fields.length > 0 && (
        <section className="space-y-3">
          {step(
            n++,
            hasPlayer ? tp("playerInfo") : tp("requiredInfo"),
            hasPlayer ? (
              <Link href="/guides#player-id" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#60a5fa] hover:underline">
                <HelpIcon width={15} height={15} /> {tp("whereId")}
              </Link>
            ) : undefined,
          )}
          <fieldset className="space-y-4 rounded-2xl border border-border bg-surface/80 p-4">
            <legend className="sr-only">{tp("requiredInfo")}</legend>
            {saved.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {saved.map((s) => (
                  <button key={s.id} type="button" className="badge border border-border bg-surface-2 px-3 py-1.5" onClick={() => setFields(s.values)}>
                    {s.label ?? Object.values(s.values)[0]}
                  </button>
                ))}
              </div>
            )}
            {product.fields.map((f) => (
              <div key={f.key}>
                <label htmlFor={`field-${f.key}`} className="eyebrow mb-2 block text-muted">
                  {t(f.label, locale)} {f.required && <span className="text-danger">*</span>}
                </label>
                {f.type === "select" ? (
                  <div id={`field-${f.key}`} role="radiogroup" aria-label={t(f.label, locale)} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {(f.options ?? []).map((o) => {
                      const on = fields[f.key] === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => setFields({ ...fields, [f.key]: o.value })}
                          className={`min-h-12 rounded-xl border-2 px-3 text-sm font-semibold transition-colors ${on ? "border-[#3b82f6] bg-[#1d4ed8]/20 text-text" : "border-border bg-surface text-muted hover:border-[#3b82f6]/50"}`}
                        >
                          {o.label ? t(o.label, locale) : o.value}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                <input
                  id={`field-${f.key}`}
                  className={`input h-14 bg-[#0b0f19]/60 font-semibold ${hasPlayer && f.type === "number" ? "text-lg tracking-[0.08em] tabular-nums" : ""}`}
                  type={f.type === "number" ? "text" : f.type}
                  inputMode={f.type === "number" ? "numeric" : undefined}
                  autoComplete="off"
                  maxLength={100}
                  placeholder={f.placeholder}
                  value={fields[f.key] ?? ""}
                  onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })}
                />
                )}
              </div>
            ))}
            {variant?.canCheck && <PlayerCheck variantId={variant.id} fields={fields} />}
            {/* Only game top-ups ask for a player ID: the "for someone else" tip makes no sense on an email or phone field. */}
            {hasPlayer && (
              <p className="rounded-xl bg-surface-2/70 px-3 py-2.5 text-xs text-muted">
                <strong className="text-text">{tp("sendToSomeone")}</strong> {tp("sendToSomeoneHint")}
              </p>
            )}
          </fieldset>
        </section>
      )}

      {/* Last step: quantity, then the total bar that stays at the bottom of the screen with the buttons */}
      <section className="space-y-3">
        {step(n++, tp("payStep"))}
        {!mode && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/80 px-4 py-3">
            <label className="font-semibold" htmlFor="qty">{tp("quantity")}</label>
            <div className="flex items-center rounded-xl border border-border bg-[#0b0f19]/60">
              <button type="button" className="h-11 w-11 text-lg" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="−">−</button>
              <input id="qty" className="h-11 w-12 bg-transparent text-center font-bold" value={qty} readOnly />
              <button type="button" className="h-11 w-11 text-lg" onClick={() => setQty(Math.min(10, qty + 1))} aria-label="+">+</button>
            </div>
          </div>
        )}
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><LockIcon width={13} height={13} /> {tp("securePay")}</span>
        </p>
      </section>

      <div className="kb-hide sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-30 md:bottom-4">
        <div className="pay-panel relative overflow-hidden rounded-2xl border border-white/10 bg-[#111827]/95 p-4 shadow-[0_-10px_40px_-12px_rgba(0,0,0,.8)] backdrop-blur">
          <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#1d4ed8] via-[#7c3aed] to-[#dc2626]" />
          {error && <p className="mb-3 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
          <div className="flex items-end justify-between gap-3">
            <span className="min-w-0">
              <span className="eyebrow block text-[10px] text-muted">{tp("totalToPay")}</span>
              {total == null ? (
                <b className="display text-2xl font-extrabold">—</b>
              ) : mode ? (
                <MoneySplit minor={total} currency="HTG" locale={locale} className="display block text-[1.7rem] font-extrabold leading-tight tracking-tight" />
              ) : (
                <PriceSplit htg={total} className="display block text-[1.7rem] font-extrabold leading-tight tracking-tight" />
              )}
            </span>
            <button type="button" className="btn-secondary min-h-10 shrink-0 px-3 text-sm" onClick={() => submit(false)} disabled={!variant?.inStock}>
              {added ? `✓ ${tp("added")}` : <><CartIcon width={16} height={16} /> {tp("addToCart")}</>}
            </button>
          </div>
          <button type="button" className="btn-primary mt-3 min-h-[3.25rem] w-full text-base" onClick={() => submit(true)} disabled={!variant?.inStock}>
            <BoltIcon width={18} height={18} /> {tp("buyNow")}
          </button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{added ? tp("added") : ""}</p>
    </div>
  );
}

const GemIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    <path d="M6 3h12l4 6-10 12L2 9Z" />
    <path d="M2 9h20M12 21 8 9l4-6 4 6-4 12" />
  </svg>
);

const CheckCircle = (p: React.SVGProps<SVGSVGElement>) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 2.7 2.7L16 10" />
  </svg>
);

/** Bar length 12–38 %, different per option but the same on every visit (so it doesn't jump on reload). */
function barWidth(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 12 + (h % 27);
}

/** "Stock is low" — never a number: only appears on options under the limit set in Admin → Trust. */
function LowStock({ name, seed }: { name: string; seed: string }) {
  const tp = useTranslations("product");
  return (
    <div role="status" className="animate-rise mt-3 flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning-soft px-4 py-3">
      <span className="low-dot h-3 w-3 shrink-0 rounded-full bg-warning" aria-hidden />
      <span className="min-w-0 flex-1">
        <b className="block text-sm text-warning">{tp("lowStock")}</b>
        <span className="text-xs text-muted">{tp("lowStockHint", { name })}</span>
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <span className="low-bar block h-full rounded-full" style={{ width: `${barWidth(seed)}%` }} />
        </span>
      </span>
    </div>
  );
}

/** "Verify ID": asks the supplier who this player is (name, region) before paying. */
function PlayerCheck({ variantId, fields }: { variantId: string; fields: Record<string, string> }) {
  const tp = useTranslations("product");
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const sig = JSON.stringify(fields);
  // A new ID or option: the old answer no longer applies.
  useEffect(() => setState(null), [sig, variantId]);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={busy || !Object.values(fields).some((v) => v?.trim())}
        onClick={async () => {
          setBusy(true);
          const r = await checkPlayer(variantId, fields).catch(() => ({ ok: false as const, error: "unavailable" as const }));
          setBusy(false);
          setState(
            r.ok
              ? { ok: true, text: r.name ? tp("playerFound", { name: r.name }) + (r.region ? ` · ${r.region}` : "") : tp("playerOk") }
              : { ok: false, text: r.error === "invalid" ? tp("playerInvalid") : r.error === "busy" ? tp("playerBusy") : tp("playerUnavailable") },
          );
        }}
        className="btn-secondary min-h-10 px-4 text-sm"
      >
        {busy ? "…" : tp("checkPlayer")}
      </button>
      {state && <span role="status" className={`text-sm font-semibold ${state.ok ? "text-success" : "text-danger"}`}>{state.ok ? "✓ " : "✕ "}{state.text}</span>}
    </div>
  );
}
