import "server-only";
import { cookies, headers } from "next/headers";
import type { Currency } from "@prisma/client";
import { getUser } from "./session";

export const CURRENCY_COOKIE = "hg_currency";

/** Display currency: cookie → profile → visitors outside Haiti see USD → HTG. */
export async function getDisplayCurrency(): Promise<Currency> {
  const c = (await cookies()).get(CURRENCY_COOKIE)?.value;
  if (c === "HTG" || c === "USD") return c;
  const user = await getUser();
  if (user?.displayCurrency) return user.displayCurrency;
  const country = (await headers()).get("x-vercel-ip-country");
  if (country && country !== "HT") return "USD";
  return "HTG";
}
