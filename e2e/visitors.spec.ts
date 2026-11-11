import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { newPage, registerCustomer, staffLogin } from "./helpers";

const db = new PrismaClient();

/** Anonymous visitor statistics: a visit is recorded and shows in Admin → Visitors; staff browsing is not counted. */
test("visits, searches and the buying funnel show in Admin → Visitors", async ({ browser }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const miss = `zzq${stamp}`;
  const c = await newPage(browser);
  // Automated browsers are only counted when a test asks for it
  await c.goto("/ht");
  await c.evaluate(() => localStorage.setItem("hg_an_test", "1"));
  await registerCustomer(c, "Vizitè Tès", `vizite.${stamp}@example.com`, "Kliyan-Vizit-2026!");

  const before = await db.analyticsEvent.count();
  await c.goto("/ht");
  await c.waitForLoadState("networkidle");
  await c.goto("/ht/store");
  await c.waitForLoadState("networkidle");
  const search = c.locator("main").getByPlaceholder(/Chèche/).first();
  await search.fill("free");
  await c.waitForTimeout(1800);
  await search.fill(miss);
  await c.waitForTimeout(1800);
  await c.goto("/ht/products/google-play-gift-card");
  await c.waitForLoadState("networkidle");
  await c.getByRole("button", { name: /Achte kounye a/ }).first().click();
  await c.waitForURL("**/ht/cart");
  await c.getByRole("link", { name: "Peye" }).click();
  await c.waitForURL("**/ht/checkout");
  await c.waitForLoadState("networkidle");
  await expect.poll(async () => db.analyticsEvent.count({ where: { type: "pageview", path: "/ht/checkout", at: { gte: new Date(stamp) } } }), { timeout: 10_000 }).toBeGreaterThan(0);
  expect(await db.analyticsEvent.count({ where: { type: "search", query: miss, results: 0 } })).toBe(1);
  // Paying records one "purchase" (nothing about the order itself is sent)
  await c.getByText("MonCash", { exact: true }).first().click();
  await c.getByRole("button", { name: "Pase kòmand lan" }).click();
  await c.waitForURL("**/api/payments/moncash/mock**");
  await c.getByRole("button", { name: "Approve payment" }).click();
  await c.waitForURL("**/ht/account/orders/**");
  await expect.poll(async () => db.analyticsEvent.count({ where: { type: "purchase", at: { gte: new Date(stamp) } } }), { timeout: 10_000 }).toBe(1);
  await c.reload();
  await c.waitForTimeout(1500);
  expect(await db.analyticsEvent.count({ where: { type: "purchase", at: { gte: new Date(stamp) } } })).toBe(1);
  expect(await db.analyticsEvent.count({ where: { type: "add_to_cart", at: { gte: new Date(stamp) } } })).toBeGreaterThan(0);
  // No IP address is ever stored: the visitor is a 32-character code
  const ev = await db.analyticsEvent.findFirstOrThrow({ where: { at: { gte: new Date(stamp) } } });
  expect(ev.visitorHash).toMatch(/^[0-9a-f]{32}$/);
  expect(JSON.stringify(ev)).not.toContain("127.0.0.1");

  // Staff browsing the shop is not counted
  const a = await newPage(browser);
  await staffLogin(a);
  await a.evaluate(() => localStorage.setItem("hg_an_test", "1"));
  const staffBefore = await db.analyticsEvent.count();
  await a.goto("/ht/store");
  await a.waitForLoadState("networkidle");
  await a.waitForTimeout(2500);
  expect(await db.analyticsEvent.count()).toBe(staffBefore);
  expect(staffBefore).toBeGreaterThan(before);

  await a.goto("/admin/analytics/visitors?days=1");
  await expect(a.getByRole("heading", { name: "Visitors", exact: true })).toBeVisible();
  await expect(a.getByText("Google Play").first()).toBeVisible();
  await expect(a.getByTestId("searches")).toContainText("free");
  await expect(a.getByText(`«${miss}»`).last()).toBeVisible();
  const funnel = a.getByTestId("funnel");
  for (const step of ["Opened a product", "Added to cart", "Reached checkout", "Paid"]) {
    const value = Number(await funnel.locator("li", { hasText: step }).locator("b").first().textContent());
    expect(value).toBeGreaterThanOrEqual(1);
  }
  await expect(a.getByTestId("live-visitors")).not.toHaveText("0");
});

test.afterAll(async () => {
  await db.$disconnect();
});
