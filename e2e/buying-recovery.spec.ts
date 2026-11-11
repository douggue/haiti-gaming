import { test, expect, type Page } from "@playwright/test";

async function register(page: Page, who: string) {
  await page.goto("/ht/auth/register");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Non konplè").fill("Rekipere Test");
  await page.getByLabel("Imèl").fill(`${who}.${Date.now()}@example.com`);
  await page.getByLabel("Modpas").fill("Kliyan-Rekipere-2026!");
  await page.getByRole("button", { name: "Kreye yon kont" }).click();
  await page.waitForURL("**/ht/account");
}

const cartLines = (page: Page) =>
  page.evaluate(() => (JSON.parse(localStorage.getItem("hg_cart_v2") ?? "{}").lines ?? []) as { quantity: number; fields: Record<string, string> }[]);

/** "Add to cart" then "Buy now" keeps one of the item; a missing player ID is said under the field. */
test("buy now after add to cart doesn't order two", async ({ page }) => {
  await register(page, "double");
  await page.goto("/ht/products/free-fire-diamonds");
  await page.waitForLoadState("networkidle");

  // Missing ID: message under the field, gone once typing starts
  await page.getByRole("button", { name: "Mete nan panye" }).click();
  const err = page.getByRole("alert").filter({ hasText: /pou nou ka voye l ba ou/ });
  await expect(err).toBeVisible();
  await page.locator('input[id^="field-"]').first().fill("123456789");
  await expect(err).toBeHidden();

  await page.getByRole("button", { name: "Mete nan panye" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Ajoute nan panye" })).toBeVisible();
  await page.getByRole("button", { name: /Achte kounye a/ }).click();
  await page.waitForURL("**/ht/cart");
  const lines = await cartLines(page);
  expect(lines).toHaveLength(1);
  expect(lines[0].quantity).toBe(1);
});

/** Canceling on the MonCash page keeps the cart; the order page offers to try again or pay another way. */
test("MonCash cancel keeps the cart and lets the customer change payment method", async ({ page }) => {
  await register(page, "cancel");
  await page.goto("/ht/products/free-fire-diamonds");
  await page.waitForLoadState("networkidle");
  await page.locator('input[id^="field-"]').first().fill("987654321");
  await page.getByRole("button", { name: /Achte kounye a/ }).click();
  await page.waitForURL("**/ht/cart");
  // The player ID can be fixed in the cart
  await page.getByRole("button", { name: "Chanje" }).click();
  await page.getByLabel(/ID jwè/).fill("111222333");
  await page.getByRole("button", { name: "Anrejistre" }).click();
  await expect(page.getByText("111222333")).toBeVisible();

  await page.getByRole("link", { name: "Peye" }).click();
  await page.waitForURL("**/ht/checkout");
  await expect(page.getByText("111222333")).toBeVisible();
  await page.getByText("MonCash", { exact: true }).first().click();
  await page.getByRole("button", { name: "Pase kòmand lan" }).click();
  await page.waitForURL("**/api/payments/moncash/mock**");
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.waitForURL("**/ht/account/orders/**");

  await expect(page.getByRole("heading", { name: "Peman an pa pase" })).toBeVisible();
  expect(await cartLines(page)).toHaveLength(1);

  await page.getByRole("button", { name: "Chanje mwayen peman" }).click();
  await page.waitForURL("**/ht/checkout");
  await expect(page.getByText("111222333")).toBeVisible();
  expect(await cartLines(page)).toHaveLength(1);
});
