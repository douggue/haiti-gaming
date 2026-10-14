import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { saveManualMethod } from "@/actions/site";
import { ActionForm } from "@/components/admin/ActionButton";
import { LocalizedInputs } from "@/components/admin/LocalizedInputs";
import { ImageField } from "@/components/admin/ImageField";
import { PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Payment methods" };

type M = Awaited<ReturnType<typeof prisma.manualMethod.findMany>>[number];

function MethodForm({ m }: { m?: M }) {
  return (
    <ActionForm action={saveManualMethod} className={`card space-y-3 p-5 ${m ? "" : "border-dashed"}`} resetOnSuccess={!m}>
      {m && <input type="hidden" name="id" value={m.id} />}
      <p className="font-semibold">{m ? `Method: ${m.code}` : "New manual method"}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label><span className="label">Code</span><input name="code" defaultValue={m?.code} placeholder="sogebank" required className="input" /></label>
        <label><span className="label">Recipient name</span><input name="recipientName" defaultValue={m?.recipientName} required className="input" /></label>
        <label><span className="label">Number / account</span><input name="recipientNumber" defaultValue={m?.recipientNumber} required className="input" /></label>
      </div>
      <LocalizedInputs prefix="name" label="Name shown to customers" value={(m?.name ?? {}) as Record<string, string>} />
      <LocalizedInputs prefix="instructions" label="Instructions (how to pay, what reference to send)" value={(m?.instructions ?? {}) as Record<string, string>} textarea />
      <ImageField name="logo" label="Logo (optional)" value={m?.logo} folder="brand" aspect="aspect-[3/1]" />
      <div className="flex flex-wrap items-center gap-5 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="isEnabled" defaultChecked={m?.isEnabled ?? true} /> Enabled</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="allowOrders" defaultChecked={m?.allowOrders ?? true} /> At checkout</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="allowDeposits" defaultChecked={m?.allowDeposits ?? true} /> For wallet top-ups</label>
        <label className="flex items-center gap-2">Order <input name="sortOrder" type="number" defaultValue={m?.sortOrder ?? 0} className="input w-20" /></label>
      </div>
      <button className="btn-primary min-h-10">{m ? "Save" : "Create method"}</button>
    </ActionForm>
  );
}

export default async function PaymentMethodsPage() {
  await requireStaff("settings.manage");
  const [methods, s] = await Promise.all([prisma.manualMethod.findMany({ orderBy: { sortOrder: "asc" } }), getSettings()]);
  return (
    <>
      <PageTitle title="Payment methods" sub="MonCash (automatic) and NatCash are built in (Settings). Add other manual methods here, such as a bank transfer or another wallet: customers send money, enter the reference, and you approve it in Payments. Saving asks for your authenticator code." />
      <div className="card mb-6 grid gap-2 p-5 text-sm sm:grid-cols-2">
        <p><b>MonCash</b>: {s.moncashEnabled ? "enabled" : "disabled"} (automatic)</p>
        <p><b>NatCash</b>: {s.natcashEnabled ? "enabled" : "disabled"} · {s.natcashRecipientName} · {s.natcashRecipientPhone}</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {methods.map((m) => <MethodForm key={m.id} m={m} />)}
        <MethodForm />
      </div>
    </>
  );
}
