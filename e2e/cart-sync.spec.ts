import { test, expect, type Page } from "@playwright/test";
import { newPage, registerCustomer } from "./helpers";

/** Items removed from the cart stay removed: after a reload, and on the account's other devices. */
const stamp = Date.now();
const email = `cart.${stamp}@example.com`;
const password = "Kliyan-Panye-2026!";

async function addToCart(p: Page, slug: string, option: string) {
  await p.goto(`/ht/products/${slug}`);
  await p.waitForLoadState("networkidle");
  await p.getByText(option, { exact: true }).click();
  await p.getByRole("button", { name: "Achte kounye a" }).click();
  await p.waitForURL("**/ht/cart");
}

test("a removed item doesn't come back", async ({ browser }) => {
  const a = await newPage(browser);
  await registerCustomer(a, "Ketly Noel", email, password);
  await addToCart(a, "playstation-store-card", "$10 USD");
  await addToCart(a, "playstation-store-card", "$25 USD");
  await a.waitForTimeout(1500); // saved on the account
  const lines = a.locator("main li", { hasText: "Retire" });
  await expect(lines).toHaveCount(2);

  // Remove, then leave right away (before the delayed save): must not come back.
  await lines.filter({ hasText: "$10" }).getByRole("button", { name: "Retire" }).click();
  await a.reload();
  await a.waitForLoadState("networkidle");
  await a.waitForTimeout(1500);
  await expect(a.locator("main li", { hasText: "Retire" })).toHaveCount(1);
  await expect(a.locator("main li", { hasText: "Retire" })).not.toContainText("$10");

  // Another phone, same account: sees the same cart, removes the last item.
  const b = await newPage(browser);
  await b.goto("/ht/auth/login");
  await b.waitForLoadState("networkidle");
  await b.getByLabel("Imèl").fill(email);
  await b.getByLabel("Modpas").fill(password);
  await b.getByRole("button", { name: "Konekte" }).click();
  await b.waitForURL("**/ht/account");
  await b.goto("/ht/cart");
  await b.waitForLoadState("networkidle");
  await expect(b.locator("main li", { hasText: "Retire" })).toHaveCount(1);
  await b.locator("main li", { hasText: "Retire" }).getByRole("button", { name: "Retire" }).click();
  await expect(b.getByText("Panye ou vid.")).toBeVisible();
  await b.waitForTimeout(1500);

  // First phone still has the old copy: the newer (empty) cart wins.
  await a.reload();
  await a.waitForLoadState("networkidle");
  await expect(a.getByText("Panye ou vid.")).toBeVisible({ timeout: 10_000 });
});

/** Shared phone: one account's cart never shows up (or gets merged) into another account's cart. */
test("switching accounts on the same phone keeps each cart separate", async ({ browser }) => {
  const stamp = Date.now();
  const page = await newPage(browser);
  const signIn = async (email: string, password: string) => {
    await page.goto("/ht/auth/login");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Imèl").fill(email);
    await page.getByLabel("Modpas").fill(password);
    await page.getByRole("button", { name: "Konekte" }).last().click();
    await page.waitForURL("**/ht/account");
  };
  const signOut = async () => {
    // Clears the sign-in only; whatever the phone stored stays, like a real shared phone
    await page.context().clearCookies();
  };
  const cartLines = () => page.locator("main li", { hasText: "Retire" });

  const a = { email: `kontA.${stamp}@example.com`, pw: "Kont-A-Panye-2026!" };
  const b = { email: `kontB.${stamp}@example.com`, pw: "Kont-B-Panye-2026!" };
  await registerCustomer(page, "Kont A", a.email, a.pw);
  await page.goto("/ht/products/google-play-gift-card");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Achte kounye a" }).first().click();
  await page.waitForURL("**/ht/cart");
  await expect(cartLines()).toHaveCount(1);
  await page.waitForTimeout(1500); // the cart reaches account A

  // Signed out: A's items are not shown to whoever uses the phone next
  await signOut();
  await page.goto("/ht/cart");
  await page.waitForLoadState("networkidle");
  await expect(cartLines()).toHaveCount(0);

  // Account B signs in on the same phone: empty cart, nothing from A
  await registerCustomer(page, "Kont B", b.email, b.pw);
  await page.goto("/ht/cart");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await expect(cartLines()).toHaveCount(0);

  // A signs back in: A's cart comes back
  await signOut();
  await signIn(a.email, a.pw);
  await page.goto("/ht/cart");
  await page.waitForLoadState("networkidle");
  await expect(cartLines()).toHaveCount(1);
});
