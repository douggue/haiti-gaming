"use client";
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createDeposit } from "@/actions/wallet";
import { formatMoney, parseAmount } from "@/lib/money";
import { CopyButton } from "./CopyButton";

const PRESETS = [500, 1000, 2500, 5000];

export function DepositForm(p: { moncash: boolean; natcash: boolean; recipientName: string; recipientPhone: string; hint: string }) {
  const tw = useTranslations("wallet");
  const to = useTranslations("order");
  const tc = useTranslations("common");
  const tco = useTranslations("checkout");
  const locale = useLocale();
  const router = useRouter();
  const [method, setMethod] = useState<"MONCASH" | "NATCASH">(p.moncash ? "MONCASH" : "NATCASH");
  const [amount, setAmount] = useState("1000");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const minor = parseAmount(amount);

  const errors: Record<string, string> = {
    amount: p.hint,
    reference: to("reference"),
    duplicate_ref: to("duplicateRef"),
    new_account_limit: tco("errors.new_account_limit"),
    method_unavailable: tco("errors.method_unavailable"),
    upload: to("evidence"),
  };

  if (done)
    return (
      <div className="card p-6 text-center">
        <p className="text-lg font-semibold text-success">✓</p>
        <p className="mt-2">{tw("depositSubmitted")}</p>
        <button type="button" className="btn-secondary mt-5" onClick={() => router.push("/account/wallet")}>{tc("wallet")}</button>
      </div>
    );

  return (
    <form
      className="card space-y-5 p-5 sm:p-6"
      action={(fd) =>
        start(async () => {
          setError("");
          fd.set("method", method);
          const r = await createDeposit(fd);
          if (!r.ok) return setError(errors[r.error] ?? tc("error"));
          if (r.redirect) window.location.href = r.redirect;
          else setDone(true);
        })
      }
    >
      <fieldset>
        <legend className="label">{tw("chooseMethod")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {p.moncash && (
            <button type="button" onClick={() => setMethod("MONCASH")} className={`rounded-xl border-2 p-3 text-left ${method === "MONCASH" ? "border-primary bg-primary-soft" : "border-border"}`}>
              <span className="rounded-md bg-[#e30613] px-2 py-1 text-[11px] font-extrabold text-white">MonCash</span>
              <span className="mt-2 block text-xs text-muted">{tco("moncashHint")}</span>
            </button>
          )}
          {p.natcash && (
            <button type="button" onClick={() => setMethod("NATCASH")} className={`rounded-xl border-2 p-3 text-left ${method === "NATCASH" ? "border-primary bg-primary-soft" : "border-border"}`}>
              <span className="rounded-md bg-[#f7a400] px-2 py-1 text-[11px] font-extrabold text-midnight">NatCash</span>
              <span className="mt-2 block text-xs text-muted">{tco("natcashHint")}</span>
            </button>
          )}
        </div>
      </fieldset>

      <div>
        <label htmlFor="amount" className="label">{tw("amount")}</label>
        <input id="amount" name="amount" inputMode="decimal" className="input text-lg font-semibold" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((v) => (
            <button key={v} type="button" onClick={() => setAmount(String(v))} className="badge border border-border bg-surface px-3 py-1.5">{v.toLocaleString(locale)} HTG</button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">{p.hint}</p>
      </div>

      {method === "NATCASH" && (
        <div className="space-y-3 rounded-xl bg-surface-2 p-4">
          <p className="text-sm font-semibold">{tw("natcashTitle")}</p>
          <p className="text-sm text-muted">
            {tw("natcashSend", { amount: minor ? formatMoney(minor, "HTG", locale) : "—", name: p.recipientName, phone: p.recipientPhone })}
          </p>
          <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
            <span className="flex-1 font-mono font-semibold">{p.recipientPhone}</span>
            <CopyButton value={p.recipientPhone.replace(/\s/g, "")} label={to("copy")} done={to("copied")} />
          </div>
          <div>
            <label className="label" htmlFor="reference">{to("reference")}</label>
            <input id="reference" name="reference" required minLength={4} maxLength={40} pattern="[A-Za-z0-9\-]+" placeholder={to("referencePlaceholder")} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="payerPhone">{to("payerPhone")}</label>
            <input id="payerPhone" name="payerPhone" type="tel" inputMode="tel" maxLength={20} placeholder="+509" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="evidence">{to("evidence")}</label>
            <input id="evidence" name="evidence" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm" />
          </div>
        </div>
      )}

      {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
      <button className="btn-primary min-h-12 w-full" disabled={pending || !minor}>
        {pending ? tc("loading") : method === "MONCASH" ? to("payMoncash") : tw("submitDeposit")}
      </button>
    </form>
  );
}
