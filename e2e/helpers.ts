import type { Browser, Page } from "@playwright/test";
import { totp } from "./totp";

export const admin = { email: process.env.E2E_ADMIN_EMAIL ?? "admin@haitigaming.test", password: process.env.E2E_ADMIN_PASSWORD ?? "AdminPassw0rd!2026" };
const secrets: Record<string, string> = {};

/** Signs a staff member in; sets up 2FA on first sign-in and remembers the secret for later steps. */
export async function staffLogin(page: Page, who = admin) {
  await page.goto("/admin/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Continue" }).click();
  const totpField = page.getByLabel("Authenticator code");
  await Promise.race([page.waitForURL("**/admin/setup-2fa"), totpField.waitFor()]);
  if (page.url().includes("setup-2fa")) {
    await page.getByLabel("Confirm your password").fill(who.password);
    await page.getByRole("button", { name: "Continue" }).click();
    secrets[who.email] = (await page.locator("p.font-mono").textContent())!.trim();
    await page.getByLabel("6-digit code").fill(totp(secrets[who.email]));
    await page.getByRole("button", { name: "Activate" }).click();
  } else {
    await totpField.fill(totp(secrets[who.email]));
    await page.getByRole("button", { name: "Verify" }).click();
  }
  await page.waitForURL(/\/admin$/);
  // Answer step-up prompts (re-confirm with the authenticator code) automatically.
  page.on("dialog", async (d) => {
    if (d.message().startsWith("Security check")) await d.accept(totp(secrets[who.email]));
    else await d.accept();
  });
}

export async function newPage(browser: Browser) {
  return (await browser.newContext({ locale: "ht-HT" })).newPage();
}

export async function registerCustomer(page: Page, name: string, email: string, password: string, path = "/ht/auth/register") {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Non konplè").fill(name);
  await page.getByLabel("Imèl").fill(email);
  await page.getByLabel("Modpas").fill(password);
  await page.getByRole("button", { name: "Kreye yon kont" }).click();
  await page.waitForURL("**/ht/account");
}
