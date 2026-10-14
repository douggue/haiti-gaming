"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createTicket, replyTicket } from "@/actions/customer";

export function NewTicketForm({ orders, defaultOrder }: { orders: { id: string; number: number }[]; defaultOrder?: string }) {
  const t = useTranslations("support");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(!!defaultOrder);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  if (!open) return <button type="button" className="btn-primary" onClick={() => setOpen(true)}>{t("new")}</button>;
  return (
    <form
      className="card space-y-4 p-5"
      action={(fd) =>
        start(async () => {
          setError("");
          const r = await createTicket(fd);
          if (r.ok && r.id) router.push(`/account/support/${r.id}`);
          else setError(tc("error"));
        })
      }
    >
      <h2 className="font-semibold">{t("new")}</h2>
      <label className="block"><span className="label">{t("subject")}</span><input name="subject" required minLength={3} maxLength={120} className="input" /></label>
      <label className="block"><span className="label">{t("order")}</span>
        <select name="orderId" defaultValue={defaultOrder ?? ""} className="input">
          <option value="">{t("noOrder")}</option>
          {orders.map((o) => <option key={o.id} value={o.id}>#{o.number}</option>)}
        </select>
      </label>
      <label className="block"><span className="label">{t("message")}</span><textarea name="message" required minLength={5} maxLength={5000} rows={5} className="input py-2" /></label>
      <label className="block"><span className="label">{t("attach")}</span><input name="attachment" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full max-w-full text-sm" /></label>
      {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? tc("loading") : t("send")}</button>
    </form>
  );
}

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const t = useTranslations("support");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <form
      className="card space-y-3 p-4"
      action={(fd) =>
        start(async () => {
          setError("");
          const r = await replyTicket(fd);
          if (r.ok) {
            (document.getElementById("reply-form") as HTMLFormElement | null)?.reset();
            router.refresh();
          } else setError(tc("error"));
        })
      }
      id="reply-form"
    >
      <input type="hidden" name="ticketId" value={ticketId} />
      <label className="block"><span className="sr-only">{t("message")}</span><textarea name="message" required maxLength={5000} rows={3} placeholder={t("message")} className="input py-2" /></label>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input name="attachment" type="file" accept="image/jpeg,image/png,image/webp" className="w-full max-w-full text-sm sm:w-auto" aria-label={t("attach")} />
        <button className="btn-primary" disabled={pending}>{pending ? tc("loading") : t("reply")}</button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
