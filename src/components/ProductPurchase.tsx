"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { t } from "@/lib/text";
import type { FieldDef } from "@/lib/orders";
import { useStore } from "./cart/CartProvider";
import { Price } from "./Money";

type Variant = { id: string; name: Record<string, string>; priceHtg: number; salePriceHtg: number | null; inStock: boolean };
type Props = {
  product: { id: string; slug: string; name: Record<string, string>; accent: string | null; image: string | null; fields: FieldDef[]; variants: Variant[] };
  saved: { id: string; label: string | null; values: Record<string, string> }[];
};

export function ProductPurchase({ product, saved }: Props) {
  const tp = useTranslations("product");
  const locale = useLocale();
  const router = useRouter();
  const { add } = useStore();
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
      variantName: variant.name,
      accent: product.accent,
      image: product.image,
      priceHtg: variant.salePriceHtg ?? variant.priceHtg,
      quantity: qty,
      fields: Object.fromEntries(product.fields.map((f) => [f.key, (fields[f.key] ?? "").trim()]).filter(([, v]) => v)),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
    if (goToCart) router.push("/cart");
  }

  return (
    <div className="mt-6 space-y-6">
      <fieldset>
        <legend className="label">{tp("chooseOption")}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {product.variants.map((v) => {
            const active = v.id === variantId;
            return (
              <label
                key={v.id}
                className={`relative flex cursor-pointer flex-col rounded-xl border-2 p-3 transition-colors ${
                  active ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-steel"
                } ${!v.inStock ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <input type="radio" name="variant" value={v.id} checked={active} disabled={!v.inStock} onChange={() => setVariantId(v.id)} className="sr-only" />
                <span className="text-sm font-semibold">{t(v.name, locale)}</span>
                <span className="mt-1 text-sm">
                  <Price htg={v.salePriceHtg ?? v.priceHtg} className="font-bold" />
                  {v.salePriceHtg && <Price htg={v.priceHtg} className="ml-1.5 text-xs text-muted line-through" />}
                </span>
                {!v.inStock && <span className="mt-1 text-xs text-danger">—</span>}
              </label>
            );
          })}
        </div>
      </fieldset>

      {product.fields.length > 0 && (
        <fieldset className="card space-y-4 p-4">
          <legend className="sr-only">{tp("requiredInfo")}</legend>
          <p className="text-sm font-semibold">{tp("requiredInfo")}</p>
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
              <label htmlFor={`field-${f.key}`} className="label">
                {t(f.label, locale)} {f.required && <span className="text-danger">*</span>}
              </label>
              <input
                id={`field-${f.key}`}
                className="input"
                type={f.type === "number" ? "text" : f.type}
                inputMode={f.type === "number" ? "numeric" : undefined}
                autoComplete="off"
                maxLength={100}
                placeholder={f.placeholder}
                value={fields[f.key] ?? ""}
                onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })}
              />
            </div>
          ))}
          <p className="text-xs text-muted">
            <strong>{tp("sendToSomeone")}</strong> {tp("sendToSomeoneHint")}
          </p>
        </fieldset>
      )}

      <div className="flex items-center gap-3">
        <label className="label mb-0" htmlFor="qty">{tp("quantity")}</label>
        <div className="flex items-center rounded-xl border border-border bg-surface">
          <button type="button" className="h-11 w-11 text-lg" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="−">−</button>
          <input id="qty" className="h-11 w-12 bg-transparent text-center font-semibold" value={qty} readOnly />
          <button type="button" className="h-11 w-11 text-lg" onClick={() => setQty(Math.min(10, qty + 1))} aria-label="+">+</button>
        </div>
        {variant && <Price htg={(variant.salePriceHtg ?? variant.priceHtg) * qty} className="ml-auto text-xl font-bold" />}
      </div>

      {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" className="btn-secondary min-h-12" onClick={() => submit(false)} disabled={!variant?.inStock}>
          {added ? `✓ ${tp("added")}` : tp("addToCart")}
        </button>
        <button type="button" className="btn-primary min-h-12" onClick={() => submit(true)} disabled={!variant?.inStock}>
          {tp("buyNow")}
        </button>
      </div>
      <p className="sr-only" aria-live="polite">{added ? tp("added") : ""}</p>
    </div>
  );
}
