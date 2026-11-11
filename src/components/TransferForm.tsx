"use client";
import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { lookupRecipient, sendMoney } from "@/actions/transfer";
import { formatMoney, parseAmount } from "@/lib/money";
import { CopyButton } from "./CopyButton";
import { Celebrate } from "./Celebrate";
import { WhatsAppIcon } from "./Icons";

/** "My code": what other customers type to send me money. */
export function MyCode({ code }: { code: string }) {
  const t = useTranslations("transfer");
  const share = t("shareText", { code });
  return (
    <section className="card p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-muted">{t("myCode")}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <code className="text-3xl font-extrabold tracking-wider">{code}</code>
        <CopyButton value={code} label={t("copy")} done={t("copied")} />
        <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener" className="btn-secondary min-h-10 px-3 text-sm">
          <WhatsAppIcon width={16} height={16} className="text-[#1fa855]" /> {t("share")}
        </a>
      </div>
      <p className="mt-2 text-xs text-muted">{t("myCodeHint")}</p>
    </section>
  );
}

const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`).replace(/[^A-Za-z0-9_-]/g, "");

/** Send gourdes: code → shows the name → amount → confirm → sent. */
export function TransferForm({ balance, left }: { balance: number; left: number }) {
  const t = useTranslations("transfer");
  const locale = useLocale();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [who, setWho] = useState<{ name: string; code: string } | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  // Each error shows under the field it is about (code, amount); anything else under the button
  const [codeError, setCodeError] = useState("");
  const [sendError, setSendError] = useState<{ field: "code" | "amount" | "other"; text: string } | null>(null);
  const [receipt, setReceipt] = useState<{ amount: string; name: string; code: string; at: string } | null>(null);
  const [sent, setSent] = useState<{ amount: string; name: string } | null>(null);
  const tcel = useTranslations("celebrate");
  const [key, setKey] = useState(newKey);
  const [pending, start] = useTransition();
  const minor = parseAmount(amount);
  const err = (e: string) => (t.has(`err_${e}`) ? t(`err_${e}` as "err_error") : t("err_error"));

  // Look the code up once it's complete (HG + 6 characters).
  useEffect(() => {
    setWho(null);
    setCodeError("");
    const c = code.trim().toUpperCase().replace(/^HG-?/, "");
    if (c.length !== 6) return;
    let live = true;
    lookupRecipient(code).then((r) => {
      if (!live) return;
      if (r.ok) {
        setWho({ name: r.name!, code: r.code! });
        setCodeError("");
      } else setCodeError(err(r.error));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const problem = !minor ? "" : minor > balance ? t("err_funds") : minor > left ? t("err_limit") : "";
  const codeMsg = codeError || (sendError?.field === "code" ? sendError.text : "");
  const amountMsg = problem || (sendError?.field === "amount" ? sendError.text : "");
  const fieldOf = (e: string): "code" | "amount" | "other" => (e === "recipient" || e === "self" ? "code" : ["amount", "limit", "funds"].includes(e) ? "amount" : "other");

  return (
    <section className="card space-y-4 p-5">
      <h2 className="font-semibold">{t("send")}</h2>
      <Celebrate open={!!sent} onClose={() => setSent(null)} title={tcel("transferTitle")} amount={sent?.amount} subtitle={sent ? tcel("transferSub", { name: sent.name }) : undefined} cta={tcel("continue")} />
      {receipt && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4" role="status" data-testid="transfer-receipt">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-400">✓ {t("receiptTitle")}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">{t("receiptAmount")}</dt><dd className="text-right font-bold tabular-nums">{receipt.amount}</dd>
            <dt className="text-muted">{t("receiptTo")}</dt><dd className="text-right font-semibold">{receipt.name} <span className="font-mono text-xs text-muted">{receipt.code}</span></dd>
            <dt className="text-muted">{t("receiptWhen")}</dt><dd className="text-right">{receipt.at}</dd>
          </dl>
        </div>
      )}
      <label className="block">
        <span className="label">{t("codeLabel")}</span>
        <input value={code} onChange={(e) => { setCode(e.target.value); setConfirming(false); setReceipt(null); setSendError(null); }} placeholder="HG-XXXXXX" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={12} aria-invalid={!!codeMsg} aria-describedby="code-msg" className={`input font-mono uppercase tracking-wider ${codeMsg ? "!border-danger" : ""}`} />
        {who && !codeMsg && <span id="code-msg" className="mt-1.5 block text-sm font-semibold text-success">✓ {who.name}</span>}
        {codeMsg && <span id="code-msg" className="mt-1.5 block text-sm font-semibold text-danger" role="alert">{codeMsg}</span>}
      </label>
      <label className="block">
        <span className="label">{t("amountLabel")}</span>
        <input value={amount} onChange={(e) => { setAmount(e.target.value); setConfirming(false); setSendError(null); }} inputMode="decimal" placeholder="500" aria-invalid={!!amountMsg} aria-describedby="amount-msg" className={`input ${amountMsg ? "!border-danger" : ""}`} />
        {amountMsg ? (
          <span id="amount-msg" className="mt-1 block text-sm font-semibold text-danger" role="alert">{amountMsg}</span>
        ) : (
          <span id="amount-msg" className="mt-1 block text-xs text-muted">{t("balance", { balance: formatMoney(balance, "HTG", locale) })}</span>
        )}
      </label>
      <label className="block">
        <span className="label">{t("noteLabel")}</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} className="input" />
      </label>
      {sendError?.field === "other" && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{sendError.text}</p>}
      {!confirming ? (
        <button type="button" disabled={!who || !minor || !!problem || !!codeMsg} onClick={() => setConfirming(true)} className="btn-primary min-h-12 w-full">{t("continue")}</button>
      ) : (
        <div className="space-y-3 rounded-2xl border-2 border-primary bg-primary-soft p-4">
          <p className="text-sm">{t("confirm", { amount: formatMoney(minor ?? 0, "HTG", locale), name: who?.name ?? "", code: who?.code ?? "" })}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              className="btn-primary min-h-11 flex-1"
              onClick={() =>
                start(async () => {
                  const fd = new FormData();
                  fd.set("code", who!.code);
                  fd.set("amount", amount);
                  fd.set("note", note);
                  fd.set("key", key);
                  const r = await sendMoney(fd);
                  setConfirming(false);
                  if (r.ok) {
                    const sentAmount = formatMoney(minor ?? 0, "HTG", locale);
                    setReceipt({
                      amount: sentAmount,
                      name: r.name ?? who?.name ?? "",
                      code: who?.code ?? "",
                      at: new Date().toLocaleString(locale === "en" ? "en-GB" : locale === "ht" ? "fr-HT" : locale, { dateStyle: "medium", timeStyle: "short", hour12: false }),
                    });
                    setSent({ amount: sentAmount, name: r.name ?? "" });
                    setAmount("");
                    setNote("");
                    setCode("");
                    setKey(newKey());
                    router.refresh();
                  } else setSendError({ field: fieldOf(r.error), text: err(r.error) });
                })
              }
            >
              {pending ? "…" : t("confirmButton")}
            </button>
            <button type="button" className="btn-secondary min-h-11" onClick={() => setConfirming(false)}>{t("cancel")}</button>
          </div>
        </div>
      )}
    </section>
  );
}
