"use server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { callSupplier } from "@/lib/suppliers/engine";
import type { SupplierConfig } from "@/lib/suppliers/types";

type R = { ok: true; name?: string; region?: string } | { ok: false; error: "invalid" | "unavailable" | "busy" };

// Small per-server memory: repeated checks of the same ID don't spend the supplier's daily quota,
// and one visitor can't hammer the supplier (10 checks a minute).
const cache = new Map<string, { at: number; r: R }>();
const hits = new Map<string, number[]>();

/** Player ID check before payment, for options whose supplier offers it. Shows the in-game name or "wrong ID / region". */
export async function checkPlayer(variantId: string, fields: Record<string, string>): Promise<R> {
  const v = await prisma.productVariant.findUnique({
    where: { id: String(variantId).slice(0, 40) },
    select: { supplierSku: true, isActive: true, supplier: { select: { id: true, isEnabled: true, config: true } }, product: { select: { fields: true, fulfillmentType: true } } },
  });
  const cfg = v?.supplier?.config as SupplierConfig | undefined;
  if (!v?.isActive || !v.supplier?.isEnabled || !cfg?.validate || v.product.fulfillmentType !== "SUPPLIER_API") return { ok: false, error: "unavailable" };
  const keys = ((v.product.fields ?? []) as { key: string }[]).map((f) => f.key);
  const clean = Object.fromEntries(keys.map((k) => [k, String(fields?.[k] ?? "").trim().slice(0, 100)]));
  if (!Object.values(clean).some(Boolean)) return { ok: false, error: "invalid" };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 10) return { ok: false, error: "busy" };
  hits.set(ip, [...recent, now]);

  const key = `${variantId}:${JSON.stringify(clean)}`;
  const c = cache.get(key);
  if (c && now - c.at < 10 * 60_000) return c.r;
  let r: R;
  try {
    const res = await callSupplier(v.supplier.id, "validate", { sku: v.supplierSku ?? "", skuParts: (v.supplierSku ?? "").split(":"), fields: clean, quantity: 1 });
    r = res.outcome === "SUCCESS" ? { ok: true, name: res.playerName, region: res.region } : res.outcome === "FAILED" ? { ok: false, error: "invalid" } : { ok: false, error: "unavailable" };
  } catch {
    r = { ok: false, error: "unavailable" };
  }
  if (r.ok || r.error === "invalid") cache.set(key, { at: now, r });
  if (cache.size > 2000) cache.clear();
  return r;
}
