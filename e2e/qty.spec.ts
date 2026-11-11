import { test, expect } from "@playwright/test";

/** Quantity can be typed (number keypad on phones) as well as stepped; it settles between 1 and 10. */
test("quantity can be typed on the product page and in the cart", async ({ page }) => {
  await page.goto("/ht/products/google-play-gift-card");
  await page.waitForLoadState("networkidle");
  const qty = page.locator("#qty");
  await qty.fill("3");
  await expect(qty).toHaveValue("3");
  await qty.fill("25");
  await qty.blur();
  await expect(qty).toHaveValue("10");
  await qty.fill("");
  await qty.blur();
  await expect(qty).toHaveValue("10");
  await qty.fill("2");
  await qty.press("Enter");
  await expect(qty).toHaveValue("2");

  await page.getByRole("button", { name: "Achte kounye a" }).first().click();
  await page.waitForURL("**/ht/cart");
  const box = page.getByRole("textbox", { name: "Kantite" }).first();
  await expect(box).toHaveValue("2");
  await box.fill("4");
  await box.blur();
  await expect(box).toHaveValue("4");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Kantite" }).first()).toHaveValue("4");
});
