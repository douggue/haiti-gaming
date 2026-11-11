import { test, expect } from "@playwright/test";

/** After paying, the "Payment complete" moment shows once with the amount, closes, and doesn't replay on refresh. */
test("payment complete animation shows once after paying", async ({ page }) => {
  const stamp = Date.now();
  await page.goto("/ht/auth/register");
  await page.evaluate(() => localStorage.setItem("hg_cel_test", "1"));
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Non konplè").fill("Fèt Test");
  await page.getByLabel("Imèl").fill(`cel.${stamp}@example.com`);
  await page.getByLabel("Modpas").fill("Kliyan-Fet-2026!");
  await page.getByRole("button", { name: "Kreye yon kont" }).click();
  await page.waitForURL("**/ht/account");

  await page.goto("/ht/products/google-play-gift-card");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Achte kounye a" }).click();
  await page.waitForURL("**/ht/cart");
  await page.getByRole("link", { name: "Peye" }).click();
  await page.waitForURL("**/ht/checkout");
  await page.getByText("MonCash", { exact: true }).first().click();
  await page.getByRole("button", { name: "Pase kòmand lan" }).click();
  await page.waitForURL("**/api/payments/moncash/mock**");
  await page.getByRole("button", { name: "Approve payment" }).click();
  await page.waitForURL("**/ht/account/orders/**");

  const dialog = page.getByRole("dialog", { name: "Peman konplè!" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("HTG");
  await dialog.getByRole("button", { name: "Kontinye" }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("dialog", { name: "Peman konplè!" })).toHaveCount(0);
});
