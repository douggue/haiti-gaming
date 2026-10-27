"use client";
import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { lookupRecipient, sendMoney } from "@/actions/transfer";
import { formatMoney, parseAmount } from "@/lib/money";
import { CopyButton } from "./CopyButton";
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
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [key, setKey] = useState(newKey);
  const [pending, start] = useTransition();
  const minor = parseAmount(amount);
  const err = (e: string) => (t.has(`err_${e}`) ? t(`err_${e}` as "err_error") : t("err_error"));

  // Look the code up once it's complete (HG + 6 characters).
  useEffect(() => {
    setWho(null);
    const c = code.trim().toUpperCase().replace(/^HG-?/, "");
    if (c.length !== 6) return;
    let live = true;
    lookupRecipient(code).then((r) => {
      if (!live) return;
      if (r.ok) {
        setWho({ name: r.name!, code: r.code! });
        setError("");
      } else setError(err(r.error));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const problem = !minor ? "" : minor > balance ? t("err_funds") : minor > left ? t("err_limit") : "";

  return (
    <section className="card space-y-4 p-5">
      <h2 className="font-semibold">{t("send")}</h2>
      {done && <p className="rounded-xl bg-success-soft px-4 py-3 text-sm text-success" role="status">{done}</p>}
      <label className="block">
        <span className="label">{t("codeLabel")}</span>
        <input value={code} onChange={(e) => { setCode(e.target.value); setConfirming(false); setDone(""); }} placeholder="HG-XXXXXX" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={12} className="input font-mono uppercase tracking-wider" />
        {who && <span className="mt-1.5 block text-sm font-semibold text-success">✓ {who.name}</span>}
      </label>
      <label className="block">
        <span className="label">{t("amountLabel")}</span>
        <input value={amount} onChange={(e) => { setAmount(e.target.value); setConfirming(false); }} inputMode="decimal" placeholder="500" className="input" />
        <span className="mt-1 block text-xs text-muted">{t("balance", { balance: formatMoney(balance, "HTG", locale) })}</span>
      </label>
      <label className="block">
        <span className="label">{t("noteLabel")}</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} className="input" />
      </label>
      {(problem || error) && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{problem || error}</p>}
      {!confirming ? (
        <button type="button" disabled={!who || !minor || !!problem} onClick={() => setConfirming(true)} className="btn-primary min-h-12 w-full">{t("continue")}</button>
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
                    setDone(t("sent", { amount: formatMoney(minor ?? 0, "HTG", locale), name: r.name ?? "" }));
                    setAmount("");
                    setNote("");
                    setCode("");
                    setKey(newKey());
                    router.refresh();
                  } else setError(err(r.error));
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
