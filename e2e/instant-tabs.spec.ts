import { test, expect } from "@playwright/test";

/** Wallet history and order tabs switch on the spot: no page load, the address keeps the choice. */
test("wallet and order tabs filter without reloading the page", async ({ page }) => {
  const stamp = Date.now();
  await page.goto("/ht/auth/register");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Non konplè").fill("Tab Test");
  await page.getByLabel("Imèl").fill(`tabs.${stamp}@example.com`);
  await page.getByLabel("Modpas").fill("Kliyan-Tab-2026!");
  await page.getByRole("button", { name: "Kreye yon kont" }).click();
  await page.waitForURL("**/ht/account");

  await page.goto("/ht/account/wallet");
  await page.waitForLoadState("networkidle");
  // A full page load would wipe this marker
  await page.evaluate(() => { (window as unknown as { __stay: number }).__stay = 1; });
  const tabs = page.getByRole("tablist", { name: "Istorik" });
  await tabs.getByRole("tab").nth(1).click();
  await expect(tabs.getByRole("tab").nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/\?f=deposits/);
  await tabs.getByRole("tab").nth(3).click();
  await expect(page).toHaveURL(/\?f=transfers/);
  await tabs.getByRole("tab").nth(0).click();
  await expect(page).not.toHaveURL(/\?f=/);
  expect(await page.evaluate(() => (window as unknown as { __stay?: number }).__stay)).toBe(1);

  await page.goto("/ht/account/orders");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => { (window as unknown as { __stay: number }).__stay = 1; });
  const ot = page.getByRole("tablist").first();
  await ot.getByRole("tab").nth(2).click();
  await expect(ot.getByRole("tab").nth(2)).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/\?tab=done/);
  expect(await page.evaluate(() => (window as unknown as { __stay?: number }).__stay)).toBe(1);
});
