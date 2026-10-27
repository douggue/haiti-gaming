"use server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import { parseAmount, formatMoney } from "@/lib/money";
import { savePrivateImage, savePublicImage, uploadsEnabled, UploadError } from "@/lib/storage";
import { normalizePhone } from "@/lib/phone";
import { isPlatform, platformOf } from "@/lib/market";
import { marketRules, rulesAccepted } from "@/lib/market-rules";
import { mustVerifyEmail } from "@/lib/verify-email";
import { siteUrl } from "@/lib/site-url";
import { notify } from "@/lib/notify";

type R = { ok: true; id?: string; whatsapp?: string } | { ok: false; error: string };
const fail = (e: unknown): R => ({ ok: false, error: e instanceof Error && /^[a-z_]+$/.test(e.message) ? e.message : "error" });

async function marketUser() {
  const user = await assertUser();
  const s = await getSettings();
  if (!s.marketEnabled) throw new Error("closed");
  return { user, settings: s };
}

async function needsRules(userId: string) {
  const [u, s] = await Promise.all([prisma.user.findUnique({ where: { id: userId }, select: { marketRulesAt: true } }), getSettings()]);
  return !rulesAccepted(u?.marketRulesAt, s);
}

/** The rules to show in the rules sheet (staff can edit them in Admin → Market → Settings). */
export async function getMarketRules(locale: string): Promise<string[]> {
  return marketRules(await getSettings(), locale);
}

export async function acceptMarketRules(): Promise<R> {
  try {
    const user = await assertUser();
    await prisma.user.update({ where: { id: user.id }, data: { marketRulesAt: new Date() } });
    revalidatePath("/[locale]/market", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Seller posts an account. It shows only after staff checks it. */
export async function createListing(form: FormData): Promise<R> {
  try {
    const { user } = await marketUser();
    if (await needsRules(user.id)) return { ok: false, error: "rules" };
    if (await mustVerifyEmail(user.id)) return { ok: false, error: "verify_email" };
    const vendor = await prisma.marketVendor.findUnique({ where: { userId: user.id }, select: { status: true } });
    if (vendor?.status !== "APPROVED") return { ok: false, error: "vendor" };
    const pending = await prisma.marketListing.count({ where: { sellerId: user.id, status: "PENDING" } });
    if (pending >= 5) return { ok: false, error: "too_many" };
    const platform = String(form.get("platform"));
    if (!isPlatform(platform)) return { ok: false, error: "platform" };
    const title = String(form.get("title") ?? "").trim().slice(0, 80);
    if (title.length < 3) return { ok: false, error: "title" };
    const currency = form.get("currency") === "USD" ? "USD" : "HTG";
    const price = parseAmount(String(form.get("price") ?? ""));
    if (!price || price < 100) return { ok: false, error: "price" };
    const details = [0, 1, 2, 3, 4, 5]
      .map((i) => ({ label: String(form.get(`dl${i}`) ?? "").trim().slice(0, 30), value: String(form.get(`dv${i}`) ?? "").trim().slice(0, 60) }))
      .filter((d) => d.label && d.value);
    const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 5);
    if (!files.length) return { ok: false, error: "images" };
    if (!uploadsEnabled()) return { ok: false, error: "upload" };
    const images: string[] = [];
    for (const f of files) {
      try {
        images.push(await savePublicImage(f, "market"));
      } catch (e) {
        if (e instanceof UploadError) return { ok: false, error: "upload" };
        throw e;
      }
    }
    const l = await prisma.marketListing.create({
      data: {
        sellerId: user.id,
        platform,
        title,
        description: String(form.get("description") ?? "").trim().slice(0, 1500),
        price,
        currency,
        images,
        details: details as Prisma.InputJsonValue,
        withEmail: form.get("withEmail") === "on",
      },
    });
    await audit(user.id, "market.listing.create", "MarketListing", l.id, { platform, price, currency });
    revalidatePath("/[locale]/account/market", "page");
    return { ok: true, id: l.id };
  } catch (e) {
    return fail(e);
  }
}

const VOLUMES = ["1-2", "3-10", "10+"];

/**
 * Vendor enrollment: anyone can buy, but only approved vendors can list accounts.
 * Staff contacts the applicant on WhatsApp, then approves or rejects. A rejected applicant can apply again.
 */
export async function applyVendor(form: FormData): Promise<R> {
  try {
    const { user, settings } = await marketUser();
    if (await needsRules(user.id)) return { ok: false, error: "rules" };
    if (await mustVerifyEmail(user.id)) return { ok: false, error: "verify_email" };
    const existing = await prisma.marketVendor.findUnique({ where: { userId: user.id } });
    if (existing?.status === "PENDING" || existing?.status === "APPROVED") return { ok: false, error: "already" };
    if (existing?.status === "SUSPENDED") return { ok: false, error: "suspended" };
    const shopName = String(form.get("shopName") ?? "").trim().slice(0, 40);
    const legalName = String(form.get("legalName") ?? "").trim().slice(0, 80);
    const city = String(form.get("city") ?? "").trim().slice(0, 60);
    const whatsapp = normalizePhone(String(form.get("whatsapp") ?? ""));
    const platforms = [...new Set(form.getAll("platforms").map(String).filter(isPlatform))];
    const volume = String(form.get("volume") ?? "");
    if (shopName.length < 3) return { ok: false, error: "shop" };
    if (legalName.length < 3) return { ok: false, error: "legal" };
    if (!whatsapp) return { ok: false, error: "phone" };
    if (city.length < 2) return { ok: false, error: "city" };
    if (!platforms.length) return { ok: false, error: "platform" };
    if (!VOLUMES.includes(volume)) return { ok: false, error: "volume" };
    if (form.get("agree") !== "on") return { ok: false, error: "agree" };
    // The ID photo is required or optional depending on Admin → Market → Settings.
    const file = form.get("idPhoto");
    const hasFile = file instanceof File && file.size > 0;
    if (!hasFile && settings.marketVendorIdRequired) return { ok: false, error: "id_photo" };
    let idPhotoPath: string | null = null;
    if (hasFile) {
      if (!uploadsEnabled()) return { ok: false, error: "upload" };
      try {
        idPhotoPath = await savePrivateImage(file, "vendors");
      } catch (e) {
        if (e instanceof UploadError) return { ok: false, error: "upload" };
        throw e;
      }
    }
    const data = { shopName, legalName, whatsapp, city, platforms, volume, about: String(form.get("about") ?? "").trim().slice(0, 1000), idPhotoPath, status: "PENDING" as const, staffNote: null, reviewedAt: null, reviewedById: null };
    const v = await prisma.marketVendor.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
    await audit(user.id, "market.vendor.apply", "MarketVendor", v.id, { shopName, platforms });
    revalidatePath("/[locale]/market/sell", "page");
    return { ok: true, id: v.id };
  } catch (e) {
    return fail(e);
  }
}

export async function removeMyListing(id: string): Promise<R> {
  try {
    const user = await assertUser();
    const r = await prisma.marketListing.updateMany({ where: { id, sellerId: user.id, status: { in: ["PENDING", "ACTIVE", "REJECTED"] } }, data: { status: "REMOVED" } });
    if (!r.count) return { ok: false, error: "not_found" };
    revalidatePath("/[locale]/account/market", "page");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** "Buy (escrow)": opens a deal and hands the buyer to the Market agent on WhatsApp. */
export async function requestDeal(listingId: string, locale: string): Promise<R> {
  try {
    const { user, settings } = await marketUser();
    if (await needsRules(user.id)) return { ok: false, error: "rules" };
    const deal = await prisma.$transaction(async (tx) => {
      const [l] = await tx.$queryRaw<{ id: string; status: string; sellerId: string; price: number; currency: "HTG" | "USD"; title: string; platform: string }[]>`
        SELECT id, status, "sellerId", price, currency, title, platform FROM "MarketListing" WHERE id = ${listingId} FOR UPDATE`;
      if (!l || l.status !== "ACTIVE") throw new Error("unavailable");
      if (l.sellerId === user.id) throw new Error("own");
      await tx.marketListing.update({ where: { id: l.id }, data: { status: "RESERVED" } });
      // A price agreed in the chat (accepted offer) replaces the listed price.
      const agreed = (await tx.marketChat.findUnique({ where: { listingId_buyerId: { listingId: l.id, buyerId: user.id } }, select: { agreedPrice: true } }))?.agreedPrice;
      const d = await tx.marketDeal.create({
        data: { listingId: l.id, buyerId: user.id, sellerId: l.sellerId, price: agreed ?? l.price, currency: l.currency, history: [{ at: new Date().toISOString(), status: "REQUESTED", note: "Buyer asked to buy" }] },
      });
      return { ...d, title: l.title, platform: l.platform };
    });
    await notify(deal.sellerId, "market_deal_update", { number: deal.number, status: "REQUESTED" }, "/account/market");
    await audit(user.id, "market.deal.request", "MarketDeal", deal.id, { listingId });
    const number = (settings.marketWhatsapp || settings.whatsappNumber).replace(/\D/g, "");
    const text = `Bonjou! Mwen vle achte kont sa a sou Market Haiti Gaming (peman jele):\n${platformOf(deal.platform).label} · ${deal.title}\n${formatMoney(deal.price, deal.currency, locale)}\nDeal #${deal.number}\n${siteUrl()}/${locale}/market/${listingId}`;
    revalidatePath("/[locale]/market", "layout");
    return { ok: true, id: deal.id, whatsapp: `https://wa.me/${number}?text=${encodeURIComponent(text)}` };
  } catch (e) {
    return fail(e);
  }
}

/** Buyer changes their mind before paying the agent. */
export async function cancelMyDeal(id: string): Promise<R> {
  try {
    const user = await assertUser();
    await prisma.$transaction(async (tx) => {
      const d = await tx.marketDeal.findFirst({ where: { id, buyerId: user.id, status: "REQUESTED" } });
      if (!d) throw new Error("not_found");
      await tx.marketDeal.update({ where: { id }, data: { status: "CANCELED", history: [{ at: new Date().toISOString(), status: "CANCELED", note: "Canceled by the buyer" }, ...((d.history as object[]) ?? [])] } });
      await tx.marketListing.updateMany({ where: { id: d.listingId, status: "RESERVED" }, data: { status: "ACTIVE" } });
    });
    revalidatePath("/[locale]/account/market", "page");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Buyer: "I received it, all good" (the agent then pays the seller). */
export async function confirmDeal(id: string): Promise<R> {
  try {
    const user = await assertUser();
    const d = await prisma.marketDeal.findFirst({ where: { id, buyerId: user.id, status: "DELIVERED" } });
    if (!d) return { ok: false, error: "not_found" };
    await prisma.marketDeal.update({ where: { id }, data: { history: [{ at: new Date().toISOString(), status: "DELIVERED", note: "Buyer confirmed: all good" }, ...((d.history as object[]) ?? [])] } });
    await audit(user.id, "market.deal.confirm", "MarketDeal", id);
    revalidatePath("/[locale]/account/market", "page");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function rateSeller(id: string, stars: number, note: string): Promise<R> {
  try {
    const user = await assertUser();
    const s = Math.round(stars);
    if (!(s >= 1 && s <= 5)) return { ok: false, error: "rating" };
    const r = await prisma.marketDeal.updateMany({ where: { id, buyerId: user.id, status: "COMPLETED", rating: null }, data: { rating: s, ratingNote: note.trim().slice(0, 300) || null } });
    if (!r.count) return { ok: false, error: "not_found" };
    revalidatePath("/[locale]/account/market", "page");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function reportListing(id: string, reason: string): Promise<R> {
  try {
    const user = await assertUser();
    const text = reason.trim().slice(0, 500);
    if (text.length < 5) return { ok: false, error: "reason" };
    const recent = await prisma.marketReport.count({ where: { reporterId: user.id, createdAt: { gte: new Date(Date.now() - 86_400_000) } } });
    if (recent >= 10) return { ok: false, error: "too_many" };
    await prisma.marketReport.create({ data: { listingId: id, reporterId: user.id, reason: text } });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Counts a visit (at most one per page view; good enough for "480 visits"). */
export async function countView(id: string) {
  await prisma.marketListing.updateMany({ where: { id, status: { in: ["ACTIVE", "RESERVED", "SOLD"] } }, data: { views: { increment: 1 } } }).catch(() => undefined);
}
