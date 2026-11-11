import { formatMoney } from "@/lib/money";
import type { Currency } from "@prisma/client";
import { ArrowDownLeftIcon, ArrowUpRightIcon, CardPlusIcon, CheckCheckIcon, GamepadIcon, UndoIcon, UnlockIcon, WrenchIcon } from "./AccountIcons";
import { SwapIcon } from "../Icons";

/** Icon and tint per kind of wallet movement */
const KIND: Record<string, { icon: (p: { width?: number; height?: number }) => React.ReactNode; tone: string }> = {
  DEPOSIT: { icon: CardPlusIcon, tone: "bg-[#7f1d1d]/50 text-amber-300" },
  PURCHASE: { icon: GamepadIcon, tone: "bg-surface-2 text-[#60a5fa]" },
  REFUND: { icon: UndoIcon, tone: "bg-sky-500/15 text-sky-300" },
  EXCHANGE: { icon: SwapIcon, tone: "bg-violet-500/15 text-violet-300" },
  ADJUSTMENT: { icon: WrenchIcon, tone: "bg-slate-500/20 text-slate-300" },
  HOLD_RELEASE: { icon: UnlockIcon, tone: "bg-amber-500/15 text-amber-300" },
};

/**
 * One wallet movement as a "ledger" card: tinted icon, what it was, when and the detail, the signed amount
 * (green when money came in) and its state under it.
 */
export function LedgerRow({
  type, amount, currency, locale, title, when, detail, held, heldLabel, doneLabel,
}: {
  type: string;
  amount: number;
  currency: Currency;
  locale: string;
  title: string;
  when: string;
  detail?: string | null;
  held?: boolean;
  heldLabel: string;
  doneLabel: string;
}) {
  const incoming = amount > 0;
  const k = type === "TRANSFER"
    ? { icon: incoming ? ArrowDownLeftIcon : ArrowUpRightIcon, tone: incoming ? "bg-emerald-500/15 text-emerald-300" : "bg-indigo-500/15 text-indigo-300" }
    : KIND[type] ?? { icon: WrenchIcon, tone: "bg-surface-2 text-muted" };
  const Icon = k.icon;
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-surface/80 p-3 sm:p-3.5">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${k.tone}`} aria-hidden><Icon width={20} height={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="display block truncate text-sm font-bold sm:text-[15px]">{title}</span>
        <span className="block truncate text-xs text-muted">{when}{detail ? ` · ${detail}` : ""}</span>
      </span>
      <span className="shrink-0 text-right">
        <b className={`display block text-sm font-extrabold tabular-nums sm:text-base ${incoming ? "text-emerald-400" : "text-text"}`}>
          {incoming ? "+" : "−"}{formatMoney(Math.abs(amount), currency, locale)}
        </b>
        {held ? (
          <span className="text-[11px] font-bold text-amber-400">⏳ {heldLabel}</span>
        ) : (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-400"><CheckCheckIcon width={13} height={13} /> {doneLabel}</span>
        )}
      </span>
    </li>
  );
}
