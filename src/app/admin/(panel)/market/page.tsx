import Link from "next/link";
import type { DealStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { commissionOf, platformOf } from "@/lib/market";
import { listingDetails, listingImages } from "@/lib/market-data";
import { formatPhone, waNumber } from "@/lib/phone";
import { resolveReport, reviewListing, saveMarketSettings, setDealStatus, takeDownListing } from "@/actions/market-admin";
import { ActionButton, ActionForm } from "@/components/admin/ActionButton";
import { StatusBadge } from "@/components/StatusBadge";
import { PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Market" };

const TABS = [
  ["review", "To review"],
  ["deals", "Deals"],
  ["listings", "Listings"],
  ["reports", "Reports"],
  ["settings", "Settings"],
] as const;

const NEXT: Record<DealStatus, [DealStatus, string][]> = {
  REQUESTED: [["PAID", "Buyer paid me"], ["CANCELED", "Cancel"]],
  PAID: [["DELIVERED", "Account handed to buyer"], ["DISPUTED", "Problem"], ["CANCELED", "Cancel (refund buyer)"]],
  DELIVERED: [["COMPLETED", "Seller paid · close"], ["DISPUTED", "Problem"]],
  DISPUTED: [["COMPLETED", "Seller paid · close"], ["CANCELED", "Cancel (refund buyer)"]],
  COMPLETED: [],
  CANCELED: [],
};

const m = (n: number) => (n / 100).toFixed(2);
type Person = { name: string; phone: string | null; email: string };
function Contact({ who, label }: { who: Person; label: string }) {
  return (
    <p className="text-xs">
      <span className="text-muted">{label}:</span> <b>{who.name}</b> · {who.email}
      {who.phone && <> · <a href={`https://wa.me/${waNumber(who.phone)}`} target="_blank" rel="noopener" className="text-[#1fa855]">{formatPhone(who.phone)} ↗</a></>}
    </p>
  );
}

export default async function AdminMarket({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const staff = await requireStaff("orders.view");
  const tab = (await searchParams).tab ?? "review";
  const settings = await getSettings();
  const manage = can(staff, "orders.manage");
  const catalog = can(staff, "catalog.manage");
  const person = { select: { name: true, phone: true, email: true } } as const;

  let body: React.ReactNode = null;
  if (tab === "review" || tab === "listings") {
    const listings = await prisma.marketListing.findMany({
      where: tab === "review" ? { status: "PENDING" } : { status: { not: "PENDING" } },
      orderBy: { createdAt: tab === "review" ? "asc" : "desc" },
      take: 100,
      include: { seller: person, _count: { select: { reports: { where: { resolved: false } } } } },
    });
    body = listings.length === 0 ? <p className="card p-8 text-center text-muted">{tab === "review" ? "Nothing to review." : "No listings yet."}</p> : (
      <ul className="space-y-3">
        {listings.map((l) => (
          <li key={l.id} className="card space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{platformOf(l.platform).icon} {l.title}</p>
                <p className="text-xs text-muted">{formatMoney(l.price, l.currency, "en")} · {l.createdAt.toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })} · {l.views} views{l.withEmail ? " · email included" : ""}{l._count.reports ? ` · ⚑ ${l._count.reports} report(s)` : ""}</p>
              </div>
              <StatusBadge status={l.status} label={l.status} />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {listingImages(l.images).map((src) => (
                <a key={src} href={src} target="_blank" rel="noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-24 w-36 shrink-0 rounded-lg bg-surface-2 object-cover" />
                </a>
              ))}
            </div>
            {listingDetails(l.details).length > 0 && <p className="text-xs">{listingDetails(l.details).map((d) => `${d.label}: ${d.value}`).join(" · ")}</p>}
            {l.description && <p className="whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-sm">{l.description}</p>}
            <Contact who={l.seller} label="Seller" />
            {l.staffNote && <p className="text-xs text-muted">Note: {l.staffNote}</p>}
            {catalog && (
              <div className="flex flex-wrap gap-2">
                {l.status === "PENDING" && <ActionButton label="Approve" className="btn-primary min-h-9 px-3 text-xs" action={reviewListing.bind(null, l.id, true)} />}
                {l.status === "PENDING" && <ActionButton label="Reject…" className="btn-danger min-h-9 px-3 text-xs" prompt="Why? (the seller sees this)" action={reviewListing.bind(null, l.id, false)} />}
                {["ACTIVE", "RESERVED"].includes(l.status) && <ActionButton label="Take down…" className="btn-danger min-h-9 px-3 text-xs" prompt="Reason (the seller sees this)" action={takeDownListing.bind(null, l.id)} />}
                <Link href={`/ht/market/${l.id}`} target="_blank" className="btn-secondary min-h-9 px-3 text-xs">Open ↗</Link>
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  } else if (tab === "deals") {
    const deals = await prisma.marketDeal.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: 100,
      include: { buyer: person, seller: person, listing: { select: { id: true, title: true, platform: true } } },
    });
    const open = deals.filter((d) => !["COMPLETED", "CANCELED"].includes(d.status));
    const closed = deals.filter((d) => ["COMPLETED", "CANCELED"].includes(d.status));
    body = (
      <div className="space-y-3">
        <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm">
          The buyer pays you (MonCash/NatCash, outside the site). The seller gives you the account; you check it, hand it to the buyer, then pay the seller minus the commission.
          Each step here updates the buyer and seller.
        </p>
        {deals.length === 0 && <p className="card p-8 text-center text-muted">No deals yet.</p>}
        {[...open, ...closed].map((d) => {
          const fee = d.commission ?? commissionOf(d.price, settings.marketCommissionBps);
          const history = (Array.isArray(d.history) ? d.history : []) as { at: string; status: string; note?: string; by?: string }[];
          return (
            <section key={d.id} className="card space-y-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold">Deal #{d.number} · {platformOf(d.listing.platform).icon} <Link href={`/ht/market/${d.listing.id}`} target="_blank" className="text-primary">{d.listing.title}</Link></p>
                <StatusBadge status={d.status} label={d.status} />
              </div>
              <p className="text-sm">
                Price <b>{formatMoney(d.price, d.currency, "en")}</b> · commission <b>{formatMoney(fee, d.currency, "en")}</b> · pay the seller <b>{formatMoney(d.price - fee, d.currency, "en")}</b>
              </p>
              <Contact who={d.buyer} label="Buyer" />
              <Contact who={d.seller} label="Seller" />
              {history.length > 0 && (
                <ol className="space-y-0.5 text-xs text-muted">
                  {history.map((h, i) => <li key={i}>{new Date(h.at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })} · <b>{h.status}</b>{h.note ? ` · ${h.note}` : ""}{h.by ? ` · ${h.by}` : ""}</li>)}
                </ol>
              )}
              {manage && NEXT[d.status].length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {NEXT[d.status].map(([s, label]) => (
                    <details key={s} className="rounded-xl border border-border">
                      <summary className={`cursor-pointer list-none px-3 py-2 text-xs font-semibold ${s === "CANCELED" || s === "DISPUTED" ? "text-danger" : "text-primary"}`}>{label}</summary>
                      <ActionForm action={setDealStatus.bind(null, d.id, s)} className="space-y-2 p-3">
                        {s === "COMPLETED" && (
                          <label className="block text-xs"><span className="label">Commission kept ({d.currency})</span><input name="commission" defaultValue={m(fee)} className="input" inputMode="decimal" /></label>
                        )}
                        <input name="note" placeholder="Note (optional)" className="input" />
                        <button className={s === "CANCELED" || s === "DISPUTED" ? "btn-danger min-h-9 px-3 text-xs" : "btn-primary min-h-9 px-3 text-xs"}>Confirm</button>
                      </ActionForm>
                    </details>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    );
  } else if (tab === "reports") {
    const reports = await prisma.marketReport.findMany({ orderBy: [{ resolved: "asc" }, { createdAt: "desc" }], take: 100, include: { reporter: person, listing: { select: { id: true, title: true, status: true } } } });
    body = reports.length === 0 ? <p className="card p-8 text-center text-muted">No reports.</p> : (
      <ul className="card divide-y divide-border">
        {reports.map((r) => (
          <li key={r.id} className={`space-y-1 p-4 text-sm ${r.resolved ? "opacity-60" : ""}`}>
            <p><Link href={`/ht/market/${r.listing.id}`} target="_blank" className="font-semibold text-primary">{r.listing.title}</Link> <span className="text-xs text-muted">({r.listing.status})</span></p>
            <p className="whitespace-pre-wrap">{r.reason}</p>
            <Contact who={r.reporter} label="From" />
            {!r.resolved && catalog && (
              <div className="flex flex-wrap gap-2 pt-1">
                <ActionButton label="Resolved" action={resolveReport.bind(null, r.id)} />
                {["ACTIVE", "RESERVED"].includes(r.listing.status) && <ActionButton label="Take listing down…" className="btn-danger min-h-9 px-3 text-xs" prompt="Reason (the seller sees this)" action={takeDownListing.bind(null, r.listing.id)} />}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  } else {
    body = (
      <ActionForm action={saveMarketSettings} className="card max-w-xl space-y-4 p-5">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={settings.marketEnabled} /> Market is open (menu link, listings, selling)</label>
        <label className="block"><span className="label">Commission kept from the seller (%)</span><input name="commission" defaultValue={settings.marketCommissionBps / 100} className="input" inputMode="decimal" /><span className="mt-1 block text-xs text-muted">Shown to sellers. You can change it per deal when closing it.</span></label>
        <label className="block"><span className="label">Market agent WhatsApp (digits, with 509)</span><input name="whatsapp" defaultValue={settings.marketWhatsapp} placeholder={settings.whatsappNumber} className="input" inputMode="tel" /><span className="mt-1 block text-xs text-muted">Buyers are sent here when they tap “Buy”. Empty = the main support number.</span></label>
        <button className="btn-primary">Save</button>
      </ActionForm>
    );
  }

  return (
    <>
      <PageTitle title="Market" sub="Accounts sold between customers, with a staff member in the middle" />
      <nav className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/market?tab=${k}`} className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold ${tab === k ? "bg-primary text-white" : "bg-surface-2 text-muted"}`}>{label}</Link>
        ))}
      </nav>
      {body}
    </>
  );
}
