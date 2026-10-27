import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { saveDeliveryZone, setCodEnabled } from "@/actions/admin";
import { ActionButton, ActionForm } from "@/components/admin/ActionButton";
import { PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Delivery" };

type Z = Awaited<ReturnType<typeof prisma.deliveryZone.findMany>>[number];

function ZoneForm({ z }: { z?: Z }) {
  return (
    <ActionForm action={saveDeliveryZone} className={`card grid gap-3 p-4 sm:grid-cols-[2fr_1fr_1.4fr_auto_auto] sm:items-end ${z ? "" : "border-dashed"}`} resetOnSuccess={!z}>
      {z && <input type="hidden" name="id" value={z.id} />}
      <label><span className="label">City / area</span><input name="name" defaultValue={z?.name} required placeholder="Pòtoprens" className="input" /></label>
      <label><span className="label">Fee (HTG)</span><input name="fee" defaultValue={z ? (z.feeHtg / 100).toString() : ""} inputMode="decimal" placeholder="250" className="input" /></label>
      <label><span className="label">Delay shown</span><input name="eta" defaultValue={z?.eta ?? ""} placeholder="Same day" className="input" /></label>
      <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="isEnabled" defaultChecked={z?.isEnabled ?? true} /> On</label>
      <button className={z ? "btn-secondary min-h-10" : "btn-primary min-h-10"}>{z ? "Save" : "Add"}</button>
    </ActionForm>
  );
}

/** Where accessories (physical products) can be delivered, and for how much. */
export default async function DeliveryPage() {
  await requireStaff("settings.manage");
  const [zones, s, waiting] = await Promise.all([
    prisma.deliveryZone.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    getSettings(),
    prisma.order.count({ where: { deliveryAddress: { not: null }, status: { in: ["AWAITING_PAYMENT", "PAID", "PROCESSING"] } } }),
  ]);
  return (
    <>
      <PageTitle
        title="Delivery"
        sub={`Cities where accessories can be delivered. ${waiting} delivery order(s) open — staff contacts each customer on WhatsApp from the order page.`}
        actions={<ActionButton label={s.codEnabled ? "Pay on delivery: ON (turn off)" : "Pay on delivery: OFF (turn on)"} action={setCodEnabled.bind(null, !s.codEnabled)} />}
      />
      <div className="space-y-3">
        {zones.map((z) => <ZoneForm key={z.id} z={z} />)}
        <ZoneForm />
      </div>
      <p className="mt-4 text-sm text-muted">To sell an accessory: Admin → Products → set delivery to &quot;Physical product (delivered)&quot; and enter the stock on each option.</p>
    </>
  );
}
