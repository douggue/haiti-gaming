import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { newPage, registerCustomer } from "./helpers";

/**
 * Instant chat through Pusher. Runs only when the server has Pusher settings (locally: a Soketi server and E2E_PUSHER=1).
 * With Pusher connected the safety-net check runs every 30 s, so anything arriving within 3 s came through Pusher.
 */
test.skip(process.env.E2E_PUSHER !== "1", "needs a Pusher-compatible server");
const db = new PrismaClient();
const stamp = Date.now();
const pw = "Kliyan-Faz-2026!";
test.afterAll(() => db.$disconnect());

test("messages, typing, seen and the header counter arrive instantly", async ({ browser }) => {
  const s = await newPage(browser);
  const sellerEmail = `rt-vande.${stamp}@example.com`;
  await registerCustomer(s, "Stevenson Paul", sellerEmail, pw);
  const seller = await db.user.update({ where: { email: sellerEmail }, data: { emailVerified: true } });
  await db.marketVendor.create({ data: { userId: seller.id, shopName: `SP Store ${stamp}`, legalName: "Stevenson Paul", whatsapp: "50937001122", city: "Les Cayes", platforms: ["pubg"], volume: "1-2", status: "APPROVED" } });
  const listing = await db.marketListing.create({ data: { sellerId: seller.id, platform: "pubg", title: `Kont PUBG ${stamp}`, price: 300000, currency: "HTG", images: ["/icon-192.png"], status: "ACTIVE" } });

  const b = await newPage(browser);
  await registerCustomer(b, "Roseline Jean", `rt-achte.${stamp}@example.com`, pw);
  await b.goto(`/ht/market/${listing.id}`);
  await b.waitForLoadState("networkidle");
  await b.getByRole("button", { name: /Ekri machann nan/ }).click();
  await b.waitForURL(/\/account\/messages\/[a-z0-9]+$/);
  const chatId = b.url().split("/").pop()!;
  await b.getByLabel("Ekri yon mesaj…").fill("Bonjou");
  await b.getByRole("button", { name: "Voye", exact: true }).click();
  await expect(b.getByTestId("chat-messages").getByText("Bonjou")).toBeVisible();

  // Seller elsewhere on the site: the header counter goes up without reloading
  await s.goto("/ht/store");
  await s.waitForLoadState("networkidle");
  await b.getByLabel("Ekri yon mesaj…").fill("Kont lan toujou disponib?");
  await b.getByRole("button", { name: "Voye", exact: true }).click();
  await expect(s.getByTestId("header-messages")).toContainText("2", { timeout: 4000 });

  // Seller opens the chat: the buyer's ✓ turns into ✓✓ at once
  await s.goto(`/ht/account/messages/${chatId}`);
  await s.waitForLoadState("networkidle");
  await expect(b.getByTestId("chat-messages").getByLabel("Wè").first()).toBeVisible({ timeout: 3000 });

  // Typing indicator, then the message itself
  await s.getByLabel("Ekri yon mesaj…").pressSequentially("Wi li la", { delay: 30 });
  await expect(b.getByTestId("typing")).toContainText("SP Store", { timeout: 3000 });
  await s.getByRole("button", { name: "Voye", exact: true }).click();
  await expect(b.getByTestId("chat-messages").getByText("Wi li la")).toBeVisible({ timeout: 3000 });
  await expect(b.getByTestId("typing")).toHaveCount(0);
});
