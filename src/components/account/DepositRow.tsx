import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import type { Currency } from "@prisma/client";
import { CardPlusIcon } from "./AccountIcons";

const PROVIDER: Record<string, string> = { MONCASH: "MonCash", NATCASH: "NatCash" };

/**
 * A deposit that isn't money in the wallet yet: sent and waiting for the team (amber), not finished (grey),
 * or refused (red, with the team's note and two ways forward: send again, or ask support).
 */
export function DepositRow({
  intent, locale, when, labels,
}: {
  intent: { id: string; provider: string; manualMethodId: string | null; amount: number; currency: Currency; status: string; providerRef: string | null; reviewNote: string | null; methodName?: string };
  locale: string;
  when: string;
  labels: { title: string; status: string; again: string; support: string; supportSubject: string; supportMessage: string };
}) {
  const rejected = intent.status === "REJECTED";
  const review = intent.status === "REVIEW";
  const method = intent.methodName || PROVIDER[intent.provider] || intent.provider;
  const amountText = formatMoney(intent.amount, intent.currency, locale);
  const againHref = `/account/wallet/deposit?amount=${intent.amount / 100}&method=${intent.manualMethodId ?? intent.provider}`;
  const supportHref = `/account/support?subject=${encodeURIComponent(labels.supportSubject)}&message=${encodeURIComponent(labels.supportMessage)}`;
  return (
    <li className={`rounded-2xl border p-3 sm:p-3.5 ${rejected ? "border-danger/40 bg-danger-soft/60" : review ? "border-amber-500/40 bg-amber-500/10" : "border-border bg-surface/80"}`}>
      <div className="flex items-center gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${rejected ? "bg-danger/15 text-danger" : "bg-amber-500/15 text-amber-300"}`} aria-hidden>
          <CardPlusIcon width={20} height={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="display block truncate text-sm font-bold sm:text-[15px]">{labels.title}</span>
          <span className="block truncate text-xs text-muted">{when} · {[method, intent.providerRef].filter(Boolean).join(" · ")}</span>
        </span>
        <span className="shrink-0 text-right">
          {/* Not in the wallet yet: no "+" and not green */}
          <b className={`display block text-sm font-extrabold tabular-nums sm:text-base ${rejected ? "text-muted line-through" : ""}`}>{amountText}</b>
          <span className={`text-[11px] font-bold ${rejected ? "text-danger" : review ? "text-amber-400" : "text-muted"}`}>{rejected ? "⛔" : "⏳"} {labels.status}</span>
        </span>
      </div>
      {rejected && (
        <>
          {intent.reviewNote && <p className="mt-2 rounded-xl bg-surface/70 px-3 py-2 text-xs text-danger">{intent.reviewNote}</p>}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link href={againHref} className="btn-primary min-h-11 text-sm">{labels.again}</Link>
            <Link href={supportHref} className="btn-secondary min-h-11 text-sm">{labels.support}</Link>
          </div>
        </>
      )}
    </li>
  );
}
