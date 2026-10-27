import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { newPage, registerCustomer, staffLogin } from "./helpers";

/** Money transfers, player ID check, accessories with cash on delivery, and the Market with a staff middleman. */
test.describe.configure({ mode: "serial" });
const db = new PrismaClient();
const stamp = Date.now();
const pw = "Kliyan-Faz-2026!";
const physical = `test-headset-${stamp}`;
const checked = `test-check-${stamp}`;
let zoneId = "";
let supplierId = "";

test.afterAll(async () => {
  await db.product.updateMany({ where: { slug: { in: [physical, checked] } }, data: { isPublished: false } });
  if (zoneId) await db.deliveryZone.update({ where: { id: zoneId }, data: { isEnabled: false } });
  if (supplierId) await db.supplier.update({ where: { id: supplierId }, data: { isEnabled: false } });
  await db.$disconnect();
});

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const verify = (email: string) => db.user.update({ where: { email }, data: { emailVerified: true } });

async function depositMoncash(p: Page, amount: string) {
  await p.goto("/ht/account/wallet/deposit");
  await p.waitForLoadState("networkidle");
  await p.getByRole("tab", { name: /MonCash/ }).click();
  await p.getByLabel("Montan (HTG)").fill(amount);
  await p.getByRole("button", { name: "Peye ak MonCash" }).click();
  await p.waitForURL("**/api/payments/moncash/mock**");
  await p.getByRole("button", { name: "Approve payment" }).click();
  await p.waitForURL("**/ht/account/**");
}

test("a customer sends gourdes to another with their code", async ({ browser }) => {
  const to = await newPage(browser);
  const toEmail = `resevwa.${stamp}@example.com`;
  await registerCustomer(to, "Nadège Toussaint", toEmail, pw);
  await to.goto("/ht/account/wallet/transfer");
  const code = (await to.locator("code").first().textContent())!.trim();
  expect(code).toMatch(/^HG-[A-Z0-9]{6}$/);

  const from = await newPage(browser);
  const fromEmail = `voye.${stamp}@example.com`;
  await registerCustomer(from, "Frantz Célestin", fromEmail, pw);
  await verify(fromEmail);
  await depositMoncash(from, "1000");
  // The dashboard button now opens transfers (no more exchange button there)
  await from.goto("/ht/account");
  await from.getByRole("link", { name: "Voye kòb" }).first().click();
  await from.waitForURL("**/account/wallet/transfer");
  await from.getByLabel("Kòd moun nan").fill(code.toLowerCase());
  await expect(from.getByText("✓ Nadège T.")).toBeVisible();
  await from.getByLabel("Kantite (HTG)").fill("300");
  await from.getByRole("button", { name: "Kontinye" }).click();
  await from.getByRole("button", { name: "Wi, voye l" }).click();
  await expect(from.getByText(/300.*voye bay Nadège T\./)).toBeVisible();
  // Own code is refused, and more than the balance is blocked before sending
  await from.getByLabel("Kantite (HTG)").fill("5000");
  await expect(from.getByText("Ou pa gen ase kòb nan bous ou.")).toBeVisible();

  await to.reload();
  await expect(to.getByText(/Soti nan men Frantz C\./)).toBeVisible();
  const n = await db.notification.count({ where: { user: { email: toEmail }, type: "transfer_received" } });
  expect(n).toBe(1);
});

test("player ID is checked with the supplier before paying", async ({ browser }) => {
  const a = await newPage(browser);
  await staffLogin(a);
  await a.goto("/admin/suppliers");
  await a.getByLabel("Name").fill(`Check supplier ${stamp}`);
  await a.locator('select[name="preset"]').selectOption("mock");
  await a.getByRole("button", { name: "Add" }).click();
  await a.waitForURL(/\/admin\/suppliers\/[a-z0-9]+$/);
  supplierId = a.url().split("/").pop()!;
  await a.locator('input[name="secret_apiKey"]').fill("mock-key");
  await a.getByLabel("Supplier on (orders are sent to it)").check();
  await a.getByRole("button", { name: "Save" }).click();
  await expect(a.getByText(/Saved/)).toBeVisible();

  const cat = await db.category.findFirstOrThrow();
  const n = { ht: `Tès ID ${stamp}`, fr: `Test ID ${stamp}`, en: `ID test ${stamp}`, es: `Prueba ID ${stamp}` };
  await db.product.create({
    data: {
      slug: checked, categoryId: cat.id, name: n, description: n, isPublished: true, fulfillmentType: "SUPPLIER_API",
      fields: [{ key: "playerId", label: { ht: "ID jwè", fr: "ID joueur", en: "Player ID", es: "ID de jugador" }, type: "text", required: true }],
      variants: { create: [{ name: { ht: "100", fr: "100", en: "100", es: "100" }, priceHtg: 10000, supplierId, supplierSku: "OK-TOPUP" }] },
    },
  });

  const c = await newPage(browser);
  await c.goto(`/ht/products/${checked}`);
  await c.waitForLoadState("networkidle");
  await c.getByLabel(/ID jwè/).fill("000000");
  await c.getByRole("button", { name: "Verifye ID a" }).click();
  await expect(c.getByText(/ID sa a pa bon/)).toBeVisible();
  await c.getByLabel(/ID jwè/).fill("123456789");
  await c.getByRole("button", { name: "Verifye ID a" }).click();
  await expect(c.getByText("Jwè: Mock789")).toBeVisible();
});

test("accessory with city delivery, paid cash on delivery", async ({ browser }) => {
  const zone = await db.deliveryZone.create({ data: { name: `Pétion-Ville ${stamp}`, feeHtg: 25000, eta: "24 h", sortOrder: -1 } });
  zoneId = zone.id;
  const cat = await db.category.findFirstOrThrow();
  const n = { ht: `Kas tès ${stamp}`, fr: `Casque test ${stamp}`, en: `Test headset ${stamp}`, es: `Auriculares ${stamp}` };
  await db.product.create({
    data: { slug: physical, categoryId: cat.id, name: n, description: n, isPublished: true, fulfillmentType: "PHYSICAL", variants: { create: [{ name: { ht: "Nwa", fr: "Noir", en: "Black", es: "Negro" }, priceHtg: 350000, stock: 2 }] } },
  });

  const c = await newPage(browser);
  const email = `livrezon.${stamp}@example.com`;
  await registerCustomer(c, "Judith Pierre", email, pw);
  await verify(email);
  await c.goto(`/ht/products/${physical}`);
  await c.waitForLoadState("networkidle");
  await c.getByRole("button", { name: "Achte kounye a" }).click();
  await c.waitForURL("**/ht/cart");
  await c.getByRole("link", { name: "Peye" }).click();
  await c.waitForURL("**/ht/checkout");
  await c.waitForLoadState("networkidle");
  await c.getByLabel("Vil / zòn").selectOption(zone.id);
  await c.getByLabel("Non moun k ap resevwa l").fill("Judith Pierre");
  await c.locator("#delivery-phone").fill("37123456");
  await c.getByLabel("Adrès konplè").fill("12 Rue Grégoire, Pétion-Ville");
  await c.getByRole("radio", { name: /Peye lè w resevwa l/ }).check();
  await c.getByRole("button", { name: "Pase kòmand lan" }).click();
  await c.waitForURL("**/ht/account/orders/**");
  await expect(c.getByText(/Yon ajan ap kontakte w sou WhatsApp pou fikse livrezon an/).first()).toBeVisible();
  const orderId = c.url().split("/").pop()!;
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  expect(order.total).toBe(375000);
  expect((await db.productVariant.findFirstOrThrow({ where: { product: { slug: physical } } })).stock).toBe(1);

  const a = await newPage(browser);
  await staffLogin(a);
  await a.goto(`/admin/orders/${orderId}`);
  await expect(a.getByText("12 Rue Grégoire, Pétion-Ville")).toBeVisible();
  await expect(a.getByRole("link", { name: "WhatsApp the customer" })).toHaveAttribute("href", /wa\.me\/50937123456/);
  a.once("dialog", (d) => d.accept("Livre pa Jean, 3 750 HTG kach"));
  await a.getByRole("button", { name: "Delivered + cash received" }).click();
  await expect(a.getByText("FULFILLED").first()).toBeVisible();
});

test("Market: vendor applies and is approved, sells, staff approves, buyer reserves, agent closes the deal with commission", async ({ browser }) => {
  // Seller posts an account
  const s = await newPage(browser);
  const sellerEmail = `vandè.${stamp}@example.com`.replace("è", "e");
  await registerCustomer(s, "Ricardo Augustin", sellerEmail, pw);
  await verify(sellerEmail);
  await s.goto("/ht/market/sell");
  await s.waitForLoadState("networkidle");
  // Rules first
  await expect(s.getByRole("dialog", { name: "Règ Market la" })).toBeVisible();
  await s.getByLabel("Mwen li règ yo e mwen aksepte yo.").check();
  await s.getByRole("button", { name: "Aksepte epi kontinye" }).click();
  await expect(s.getByRole("dialog")).toHaveCount(0);

  // Not a vendor yet: the page asks for an application, and listing is refused
  await s.getByLabel("Non boutik ou (achtè yo wè l)").fill(`Ricardo Shop ${stamp}`);
  await s.getByLabel("Non konplè (jan l ye sou pyès ou)").fill("Ricardo Augustin");
  await s.locator("#vendor-phone").fill("37223344");
  await s.getByLabel("Vil", { exact: true }).fill("Cap-Haïtien");
  await s.getByText("🔥 Free Fire").click();
  await s.getByLabel("Konbyen kont pa mwa?").selectOption("3-10");
  await s.locator("#photo-idPhoto").setInputFiles({ name: "id.png", mimeType: "image/png", buffer: PNG });
  await expect(s.getByText("✓ Foto pyès idantite w")).toBeVisible();
  await s.getByLabel(/Kont m ap vann yo se pa m/).check();
  await s.getByRole("button", { name: "Voye demann mwen" }).click();
  await expect(s.getByTestId("vendor-pending")).toBeVisible();

  const a = await newPage(browser);
  await staffLogin(a);
  await a.goto("/admin/market");
  const app = a.locator(".card", { hasText: `Ricardo Shop ${stamp}` });
  await expect(app.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", /wa\.me\/50937223344/);
  const idPhoto = await a.request.get((await app.getByRole("link", { name: "ID photo ↗" }).getAttribute("href"))!);
  expect(idPhoto.status()).toBe(200);
  // The ID photo is staff-only
  expect((await s.request.get((await app.getByRole("link", { name: "ID photo ↗" }).getAttribute("href"))!)).status()).toBe(403);
  await app.getByRole("button", { name: "Approve" }).click();
  await expect(app.getByText(/can now list accounts/)).toBeVisible();

  await s.reload();
  await s.waitForLoadState("networkidle");
  const title = `Kont Free Fire nivo 70 ${stamp}`;
  await s.getByLabel("Tit").fill(title);
  await s.getByLabel("Pri").fill("5000");
  await s.locator('input[name="dv0"]').fill("70");
  await s.locator('input[name="dv1"]').fill("Heroic");
  await s.getByLabel("Nòt pou achtè yo").fill("Kont pwòp, 12 skin ra.");
  await s.locator('input[name="images"]').setInputFiles({ name: "shot.png", mimeType: "image/png", buffer: PNG });
  await s.getByRole("button", { name: "Voye pou tcheke" }).click();
  await s.waitForURL("**/ht/account/market?posted=1");
  await expect(s.getByText(title)).toBeVisible();
  await expect(s.getByText("N ap tcheke").first()).toBeVisible();
  const listing = await db.marketListing.findFirstOrThrow({ where: { title } });

  // Not public until approved
  const v = await newPage(browser);
  expect((await v.goto(`/ht/market/${listing.id}`))!.status()).toBe(404);

  await a.goto("/admin/market?tab=review");
  const card = a.locator(".card", { hasText: title });
  await card.getByRole("button", { name: "Approve" }).click();
  // Once approved it leaves the review list
  await expect.poll(async () => (await db.marketListing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe("ACTIVE");

  // Anyone can see it; the buyer reserves it and is sent to the agent on WhatsApp
  await v.goto(`/ht/market?p=freefire`);
  await expect(v.getByText(title)).toBeVisible();
  const b = await newPage(browser);
  const buyerEmail = `achte.${stamp}@example.com`;
  await registerCustomer(b, "Mirlande Jean", buyerEmail, pw);
  await b.goto(`/ht/market/${listing.id}`);
  await b.waitForLoadState("networkidle");
  await expect(b.getByText("Heroic")).toBeVisible();
  await expect(b.getByText("Nòt vandè")).toBeVisible();
  await b.route("https://wa.me/**", (r) => r.fulfill({ status: 200, body: "wa" }));
  await b.getByRole("button", { name: /Achte kounye a \(peman jele\)/ }).click();
  await b.getByLabel("Mwen li règ yo e mwen aksepte yo.").check();
  await b.getByRole("button", { name: "Aksepte epi kontinye" }).click();
  await b.waitForURL(/wa\.me/);
  expect(decodeURIComponent(b.url())).toContain(title);
  expect((await db.marketListing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe("RESERVED");
  const deal = await db.marketDeal.findFirstOrThrow({ where: { listingId: listing.id } });

  // Agent: paid → handed over → seller paid with 10 % kept
  await a.goto("/admin/market?tab=deals");
  const d = a.locator("section.card", { hasText: `Deal #${deal.number}` });
  await d.getByText("Buyer paid me").click();
  await d.getByRole("button", { name: "Confirm" }).click();
  await expect(d.getByText("PAID").first()).toBeVisible();
  await d.getByText("Account handed to buyer").click();
  await d.getByRole("button", { name: "Confirm" }).click();
  await expect(d.getByText("DELIVERED").first()).toBeVisible();

  await b.goto("/ht/account/market");
  b.once("dialog", (x) => x.accept());
  await b.getByRole("button", { name: "Mwen resevwa kont lan, tout bon" }).click();
  await expect(b.getByText("Achtè a").or(b.getByText("Remèt")).first()).toBeVisible();

  await a.reload();
  await d.getByText("Seller paid · close").click();
  await expect(d.locator('input[name="commission"]')).toHaveValue("500.00");
  await d.getByRole("button", { name: "Confirm" }).click();
  await expect(d.getByText("COMPLETED").first()).toBeVisible();
  const closed = await db.marketDeal.findUniqueOrThrow({ where: { id: deal.id } });
  expect(closed.commission).toBe(50000);
  expect((await db.marketListing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe("SOLD");

  // Seller sees the net amount; buyer rates
  await s.goto("/ht/account/market");
  await expect(s.getByText(/ou resevwa 4[\s  ]?500/)).toBeVisible();
  await b.goto("/ht/account/market");
  await b.getByRole("radio", { name: "5" }).click();
  await b.getByRole("button", { name: "Voye" }).click();
  await expect(b.getByText("★★★★★")).toBeVisible();
});

test("staff edits the Market rules; customers must accept the new ones", async ({ browser }) => {
  const a = await newPage(browser);
  await staffLogin(a);
  await a.goto("/admin/market?tab=settings");
  const ht = a.locator('textarea[name="rules_ht"]');
  await expect(ht).toHaveValue(/Chak acha pase nan men yon ajan/);
  await ht.fill(`Règ tès ${stamp}\nDezyèm règ tès`);
  await a.locator('input[name="reaccept"]').check();
  await a.getByRole("button", { name: "Save" }).click();
  await expect(a.getByText("Saved")).toBeVisible();

  const c = await newPage(browser);
  await registerCustomer(c, "Lourdes Michel", `regleman.${stamp}@example.com`, pw);
  await c.goto("/ht/market/sell");
  const sheet = c.getByRole("dialog", { name: "Règ Market la" });
  await expect(sheet.getByText(`Règ tès ${stamp}`)).toBeVisible();
  await expect(sheet.getByText("Dezyèm règ tès")).toBeVisible();
  await expect(sheet.getByText(/Chak acha pase/)).toHaveCount(0);

  // Emptying the box brings the standard rules back
  await a.reload();
  await a.locator('textarea[name="rules_ht"]').fill("");
  await a.getByRole("button", { name: "Save" }).click();
  await expect(a.getByText("Saved")).toBeVisible();
  await a.reload();
  await expect(a.locator('textarea[name="rules_ht"]')).toHaveValue(/Chak acha pase nan men yon ajan/);
});
