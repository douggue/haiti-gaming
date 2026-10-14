"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { CURRENCY_COOKIE } from "@/lib/prefs";

export async function setCurrency(currency: "HTG" | "USD") {
  if (currency !== "HTG" && currency !== "USD") return;
  (await cookies()).set(CURRENCY_COOKIE, currency, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const user = await getUser();
  if (user) await prisma.user.update({ where: { id: user.id }, data: { displayCurrency: currency } });
  revalidatePath("/", "layout");
}

export async function saveLocalePreference(locale: string) {
  if (!["ht", "fr", "en", "es"].includes(locale)) return;
  const user = await getUser();
  if (user) await prisma.user.update({ where: { id: user.id }, data: { locale } });
}
