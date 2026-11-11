"use client";
import { QtyInput } from "../QtyInput";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { t } from "@/lib/text";
import { linePrice, useStore } from "./CartProvider";
import { PriceSplit } from "../Money";
import { ProductArtSmall } from "./ProductArtSmall";
import { ArrowRightIcon, CartIcon, LockIcon } from "../Icons";

export function CartView() {
  const tc = useTranslations("cart");
  const tco = useTranslations("checkout");
  const tq = useTranslations("product");
  const locale = useLocale();
  const { lines, ready, setQuantity, remove, updateFields, htgPerUsd, count } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const subtotal = lines.reduce((s, l) => s + l.priceHtg * l.quantity, 0);
  const subtotalUsd = lines.reduce((s, l) => s + linePrice(l, "USD", htgPerUsd) * l.quantity, 0);

  if (!ready) return <p className="text-muted">…</p>;
  if (lines.length === 0)
    return (
      <div className="relative mx-auto max-w-md overflow-hidden rounded-3xl border border-border bg-surface/80 p-8 text-center sm:p-10">
        <span aria-hidden className="ds-hide pointer-events-none absolute -top-20 left-1/2 size-56 -translate-x-1/2 rounded-full bg-[#1d4ed8]/30 blur-3xl" />
        <span className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-[#1d4ed8] to-[#3b82f6] text-white shadow-[0_14px_30px_-12px_rgba(59,130,246,.9)]">
          <CartIcon width={28} height={28} />
        </span>
        <h1 className="display relative mt-5 text-2xl font-extrabold tracking-tight">{tc("title")}</h1>
        <p className="relative mt-1 text-muted">{tc("empty")}</p>
        <Link href="/store" className="btn-primary relative mt-6 min-h-12 px-6">{tc("emptyCta")} <ArrowRightIcon width={16} height={16} /></Link>
      </div>
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div>
        <p className="eyebrow text-[#60a5fa]">{tc("itemsCount", { n: count })}</p>
        <h1 className="display mt-1 text-3xl font-extrabold tracking-tight">{tc("title")}</h1>
        <ul className="mt-5 space-y-3">
          {lines.map((l) => (
            <li key={l.key} className="flex gap-3 rounded-2xl border border-border bg-surface/80 p-3 sm:gap-4 sm:p-4">
              <ProductArtSmall name={t(l.productName, locale)} accent={l.accent} image={l.image} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <Link href={`/products/${l.productSlug}`} className="display block truncate font-bold hover:text-[#60a5fa]">{t(l.productName, locale)}</Link>
                    <span className="block text-sm font-semibold text-[#60a5fa]">{t(l.variantName, locale)}</span>
                  </span>
                  <PriceSplit htg={l.priceHtg * l.quantity} usd={linePrice(l, "USD", htgPerUsd) * l.quantity} className="display shrink-0 text-lg font-extrabold" unitClassName="ml-1 text-[0.6em] font-bold text-muted" />
                </div>
                {Object.values(l.fields).length > 0 &&
                  (editing === l.key ? (
                    <FieldsEditor
                      fields={l.fields}
                      label={tc("editDetails")}
                      save={tc("save")}
                      cancel={tc("cancel")}
                      onCancel={() => setEditing(null)}
                      onSave={(f) => {
                        updateFields(l.key, f);
                        setEditing(null);
                      }}
                    />
                  ) : (
                    <p className="mt-1.5 flex max-w-full items-center gap-2">
                      <span className="inline-flex min-w-0 items-center rounded-lg bg-[#0b0f19]/60 px-2 py-1 font-mono text-xs text-muted">
                        <span className="truncate">{Object.values(l.fields).join(" · ")}</span>
                      </span>
                      <button type="button" onClick={() => setEditing(l.key)} className="min-h-11 shrink-0 px-1 text-xs font-semibold text-[#60a5fa] hover:underline">{tco("change")}</button>
                    </p>
                  ))}
                <div className="mt-3 flex items-center gap-3">
                  <QtyInput size="sm" value={l.quantity} onChange={(n) => setQuantity(l.key, n)} label={tq("quantity")} />
                  <button type="button" onClick={() => remove(l.key)} className="ml-auto min-h-11 px-1 text-sm font-semibold text-danger hover:underline">{tc("remove")}</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <Link href="/store" className="mt-4 inline-block text-sm font-semibold text-[#60a5fa]">← {tc("continueShopping")}</Link>
      </div>
      <aside className="relative h-fit space-y-4 overflow-hidden rounded-2xl border border-border bg-surface/90 p-5 lg:sticky lg:top-24">
        <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#1d4ed8] via-[#7c3aed] to-[#dc2626]" />
        <h2 className="display text-lg font-bold">{tco("summary")}</h2>
        <div className="rounded-xl bg-[#0b0f19]/60 px-4 py-3">
          <span className="eyebrow block text-[10px] text-muted">{tco("total")}</span>
          <PriceSplit htg={subtotal} usd={subtotalUsd} className="display text-[1.7rem] font-extrabold tracking-tight" />
        </div>
        <p className="text-xs text-muted">{tc("priceNote")}</p>
        <Link href="/checkout" className="btn-primary min-h-[3.25rem] w-full text-base">{tc("checkout")} <ArrowRightIcon width={16} height={16} /></Link>
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted"><LockIcon width={12} height={12} /> {tco("secureNote")}</p>
      </aside>
    </div>
  );
}

/** Fix the player ID / account details of a line without removing it. */
function FieldsEditor({ fields, label, save, cancel, onSave, onCancel }: { fields: Record<string, string>; label: string; save: string; cancel: string; onSave: (f: Record<string, string>) => void; onCancel: () => void }) {
  const [values, setValues] = useState(fields);
  const keys = Object.keys(fields);
  return (
    <form
      className="mt-2 space-y-2 rounded-xl border border-border bg-[#0b0f19]/40 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const clean = Object.fromEntries(keys.map((k) => [k, (values[k] ?? "").trim()]));
        if (keys.some((k) => fields[k] && !clean[k])) return;
        onSave(clean);
      }}
    >
      {keys.map((k, i) => (
        <label key={k} className="block">
          <span className="label">{label}{keys.length > 1 ? ` ${i + 1}` : ""}</span>
          <input className="input font-mono" value={values[k] ?? ""} maxLength={100} autoFocus={i === 0} autoComplete="off" onChange={(e) => setValues({ ...values, [k]: e.target.value })} />
        </label>
      ))}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary min-h-11 px-4 text-sm">{save}</button>
        <button type="button" onClick={onCancel} className="btn-secondary min-h-11 px-4 text-sm">{cancel}</button>
      </div>
    </form>
  );
}
