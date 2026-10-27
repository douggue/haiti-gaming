"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { getSettings, setSetting } from "@/lib/settings";
import { notify } from "@/lib/notify";
import { parseAmount } from "@/lib/money";
import { commissionOf } from "@/lib/market";
import type { DealStatus } from "@prisma/client";

type R = { ok: true; message?: string } | { ok: false; error: string };
const fail = (e: unknown): R => ({ ok: false, error: e instanceof Error ? e.message : "Unexpected error" });
const done = (message?: string): R => {
  revalidatePath("/admin/market");
  revalidatePath("/[locale]/market", "layout");
  return { ok: true, message };
};

/** Approve (shows on the Market) or reject (with a reason the seller sees). */
export async function reviewListing(id: string, approve: boolean, note: string): Promise<R> {
  try {
    const staff = await assertStaff("catalog.manage");
    if (!approve && note.trim().length < 3) return { ok: false, error: "Write why it's rejected (the seller sees it)" };
    const l = await prisma.marketListing.update({ where: { id }, data: { status: approve ? "ACTIVE" : "REJECTED", staffNote: note.trim().slice(0, 300) || null } });
    await notify(l.sellerId, approve ? "market_listing_approved" : "market_listing_rejected", { title: l.title, reason: note.trim() }, "/account/market");
    await audit(staff.id, approve ? "market.listing.approve" : "market.listing.reject", "MarketListing", id, { note });
    return done(approve ? "Approved: it's on the Market" : "Rejected");
  } catch (e) {
    return fail(e);
  }
}

export async function takeDownListing(id: string, note: string): Promise<R> {
  try {
    const staff = await assertStaff("catalog.manage");
    await prisma.marketListing.update({ where: { id }, data: { status: "REMOVED", staffNote: note.trim().slice(0, 300) || "Removed by staff" } });
    await audit(staff.id, "market.listing.remove", "MarketListing", id, { note });
    return done("Removed");
  } catch (e) {
    return fail(e);
  }
}

const NEXT: Record<DealStatus, DealStatus[]> = {
  REQUESTED: ["PAID", "CANCELED"],
  PAID: ["DELIVERED", "DISPUTED", "CANCELED"],
  DELIVERED: ["COMPLETED", "DISPUTED"],
  DISPUTED: ["COMPLETED", "CANCELED"],
  COMPLETED: [],
  CANCELED: [],
};

/**
 * The agent moves a deal forward. COMPLETED records the commission kept when paying the seller
 * (default: the Market %), and marks the account sold. CANCELED puts the account back on sale.
 */
export async function setDealStatus(id: string, status: DealStatus, form: FormData): Promise<R> {
  try {
    const staff = await assertStaff("orders.manage");
    const settings = await getSettings();
    const d = await prisma.marketDeal.findUniqueOrThrow({ where: { id } });
    if (!NEXT[d.status].includes(status)) return { ok: false, error: `Can't go from ${d.status} to ${status}` };
    const note = String(form.get("note") ?? "").trim().slice(0, 300);
    let commission: number | null = d.commission;
    if (status === "COMPLETED") {
      const raw = String(form.get("commission") ?? "").trim();
      commission = raw ? parseAmount(raw) : commissionOf(d.price, settings.marketCommissionBps);
      if (commission === null || commission < 0 || commission > d.price) return { ok: false, error: "Commission: an amount between 0 and the price" };
    }
    const history = [{ at: new Date().toISOString(), status, note, by: staff.name }, ...((d.history as object[]) ?? [])];
    await prisma.$transaction([
      prisma.marketDeal.update({ where: { id }, data: { status, commission, history, agentId: d.agentId ?? staff.id } }),
      ...(status === "COMPLETED" ? [prisma.marketListing.update({ where: { id: d.listingId }, data: { status: "SOLD" } })] : []),
      ...(status === "CANCELED" ? [prisma.marketListing.updateMany({ where: { id: d.listingId, status: "RESERVED" }, data: { status: "ACTIVE" } })] : []),
    ]);
    for (const uid of [d.buyerId, d.sellerId]) await notify(uid, "market_deal_update", { number: d.number, status }, "/account/market");
    await audit(staff.id, `market.deal.${status.toLowerCase()}`, "MarketDeal", id, { note, commission });
    return done(`Deal #${d.number}: ${status}`);
  } catch (e) {
    return fail(e);
  }
}

export async function resolveReport(id: string): Promise<R> {
  try {
    const staff = await assertStaff("catalog.manage");
    await prisma.marketReport.update({ where: { id }, data: { resolved: true } });
    await audit(staff.id, "market.report.resolve", "MarketReport", id);
    return done("Resolved");
  } catch (e) {
    return fail(e);
  }
}

export async function saveMarketSettings(form: FormData): Promise<R> {
  try {
    const staff = await assertStaff("settings.manage");
    const pct = Number(String(form.get("commission") ?? "").replace(",", "."));
    if (!(pct >= 0 && pct <= 50)) return { ok: false, error: "Commission: 0 to 50 %" };
    await setSetting("marketEnabled", form.get("enabled") === "on");
    await setSetting("marketCommissionBps", Math.round(pct * 100));
    await setSetting("marketWhatsapp", String(form.get("whatsapp") ?? "").replace(/\D/g, "").slice(0, 20));
    await audit(staff.id, "market.settings", "SiteSetting", null, { pct });
    return done("Saved");
  } catch (e) {
    return fail(e);
  }
}
