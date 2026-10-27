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
  await s.locator("label", { hasText: "Free Fire" }).first().click();
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

test("staff can make the vendor ID photo optional", async ({ browser }) => {
  const a = await newPage(browser);
  await staffLogin(a);
  await a.goto("/admin/market?tab=settings");
  await a.locator('input[name="vendorIdRequired"]').uncheck();
  await a.getByRole("button", { name: "Save" }).click();
  await expect(a.getByText("Saved")).toBeVisible();

  try {
    const c = await newPage(browser);
    const email = `san-id.${stamp}@example.com`;
    await registerCustomer(c, "Wisly Joseph", email, pw);
    await verify(email);
    await c.goto("/ht/market/sell");
    await c.getByLabel("Mwen li règ yo e mwen aksepte yo.").check();
    await c.getByRole("button", { name: "Aksepte epi kontinye" }).click();
    await expect(c.getByText("(si w vle)").first()).toBeVisible();
    await c.getByLabel("Non boutik ou (achtè yo wè l)").fill(`Wisly Store ${stamp}`);
    await c.getByLabel("Non konplè (jan l ye sou pyès ou)").fill("Wisly Joseph");
    await c.locator("#vendor-phone").fill("37334455");
    await c.getByLabel("Vil", { exact: true }).fill("Jacmel");
    await c.locator("label", { hasText: "TikTok" }).first().click();
    await c.getByLabel("Konbyen kont pa mwa?").selectOption("1-2");
    await c.getByLabel(/Kont m ap vann yo se pa m/).check();
    await c.getByRole("button", { name: "Voye demann mwen" }).click();
    await expect(c.getByTestId("vendor-pending")).toBeVisible();

    await a.goto("/admin/market?tab=vendors");
    await expect(a.locator(".card", { hasText: `Wisly Store ${stamp}` }).getByText("No ID photo")).toBeVisible();
  } finally {
    await a.goto("/admin/market?tab=settings");
    await a.locator('input[name="vendorIdRequired"]').check();
    await a.getByRole("button", { name: "Save" }).click();
    await expect(a.getByText("Saved")).toBeVisible();
  }
});

test("Market chat: buyer and seller talk, contact details hidden, offer accepted becomes the deal price", async ({ browser }) => {
  // An approved vendor with an account on sale
  const s = await newPage(browser);
  const sellerEmail = `chat-vande.${stamp}@example.com`;
  await registerCustomer(s, "Kervens Louis", sellerEmail, pw);
  const seller = await verify(sellerEmail);
  await db.marketVendor.create({ data: { userId: seller.id, shopName: `KL Gaming ${stamp}`, legalName: "Kervens Louis", whatsapp: "50937445566", city: "Gonaïves", platforms: ["freefire"], volume: "3-10", status: "APPROVED" } });
  const title = `Kont chat ${stamp}`;
  const listing = await db.marketListing.create({ data: { sellerId: seller.id, platform: "freefire", title, price: 500000, currency: "HTG", images: ["/icon-192.png"], status: "ACTIVE" } });

  // Buyer writes from the listing; the phone number is hidden
  const b = await newPage(browser);
  await registerCustomer(b, "Daphné Noël", `chat-achte.${stamp}@example.com`, pw);
  await b.goto(`/ht/market/${listing.id}`);
  await b.waitForLoadState("networkidle");
  await expect(b.getByText(`KL Gaming ${stamp}`)).toBeVisible();
  await b.getByRole("button", { name: /Ekri machann nan/ }).click();
  await b.waitForURL(/\/ht\/account\/messages\/[a-z0-9]+$/);
  const chatId = b.url().split("/").pop()!;
  await b.getByLabel("Ekri yon mesaj…").fill("Bonjou! Kont lan toujou la? Rele m 3712 3456");
  await b.getByRole("button", { name: "Voye", exact: true }).click();
  const msgs = b.getByTestId("chat-messages");
  await expect(msgs.getByText("Bonjou! Kont lan toujou la? Rele m •••")).toBeVisible();
  await expect(msgs.getByText(/3712/)).toHaveCount(0);
  // Photo
  await b.getByTestId("chat-photo").setInputFiles({ name: "p.png", mimeType: "image/png", buffer: PNG });
  await expect(msgs.locator("img")).toHaveCount(1);
  // Offer with the keypad
  await b.getByRole("button", { name: "Fè yon òf" }).click();
  for (const k of ["4", "0", "0", "0"]) await b.getByRole("button", { name: k, exact: true }).click();
  await expect(b.getByTestId("offer-amount")).toHaveText(/4[\s  ]?000/);
  await b.getByRole("button", { name: "Voye òf la" }).click();
  await expect(msgs.getByText("N ap tann vandè a")).toBeVisible();
  // Not seen yet: one tick
  await expect(msgs.getByLabel("Voye").first()).toBeVisible();
  // One notification for the whole batch, not one per message
  expect(await db.notification.count({ where: { userId: seller.id, type: "market_message", readAt: null } })).toBe(1);

  // Seller: unread chat in Messages, sees the hidden number as •••, photo is visible to them only
  await s.goto("/ht/account/messages");
  await expect(s.getByRole("link", { name: /Mesaj \(1\)/ }).first()).toBeVisible();
  await expect(s.getByTestId("header-messages")).toContainText("3");
  await expect(s.getByLabel("3 poko li")).toBeVisible();
  await s.getByRole("link", { name: /Daphné N\./ }).click();
  await s.waitForURL(`**/account/messages/${chatId}`);
  await expect(s.getByTestId("unread-divider")).toBeVisible();
  await expect(s.getByTestId("header-messages")).not.toContainText("3");
  // Opening the chat clears its notification and the counters
  expect(await db.notification.count({ where: { userId: seller.id, type: "market_message", readAt: null } })).toBe(0);
  // The buyer's messages now show as seen (✓✓) on the buyer's screen
  await expect(msgs.getByLabel("Wè").first()).toBeVisible({ timeout: 10_000 });
  await expect(s.getByText("Bonjou! Kont lan toujou la? Rele m •••")).toBeVisible();
  const img = await db.marketMessage.findFirstOrThrow({ where: { chatId, kind: "IMAGE" } });
  expect((await s.request.get(`/api/market-chat/image/${img.id}`)).status()).toBe(200);
  const stranger = await newPage(browser);
  await registerCustomer(stranger, "Lòt Moun", `chat-lot.${stamp}@example.com`, pw);
  expect((await stranger.request.get(`/api/market-chat/image/${img.id}`)).status()).toBe(403);
  expect((await stranger.goto(`/ht/account/messages/${chatId}`))!.status()).toBe(404);
  await s.getByRole("button", { name: "Aksepte" }).click();
  await expect(s.getByText("✓ Aksepte")).toBeVisible();

  // Buyer sees it (refreshes by itself) and buys at the agreed price
  await expect(msgs.getByText("✓ Aksepte")).toBeVisible({ timeout: 10_000 });
  await b.route("https://wa.me/**", (r) => r.fulfill({ status: 200, body: "wa" }));
  await b.getByRole("button", { name: /Achte · 4[\s  ]?000 HTG/ }).click();
  await b.getByLabel("Mwen li règ yo e mwen aksepte yo.").check();
  await b.getByRole("button", { name: "Aksepte epi kontinye" }).click();
  await b.waitForURL(/wa\.me/);
  const deal = await db.marketDeal.findFirstOrThrow({ where: { listingId: listing.id } });
  expect(deal.price).toBe(400000);

  // Staff sees the chat with what was really typed, and writes as the agent
  const a = await newPage(browser);
  await staffLogin(a);
  await a.goto("/admin/market?tab=chats");
  await a.getByRole("link", { name: new RegExp(title) }).click();
  await expect(a.getByText(/Typed \(hidden from the other side\): .*3712 3456/)).toBeVisible();
  await a.getByPlaceholder(/Write as the Haiti Gaming agent/).fill("Bonjou tou de, se mwen k ajan an.");
  await a.getByRole("button", { name: "Send as agent" }).click();
  await expect(a.getByText("Sent")).toBeVisible();
  await s.reload();
  await expect(s.getByTestId("chat-messages").getByText("🛡️ Ajan Haiti Gaming")).toBeVisible();
  await expect(s.getByText("Bonjou tou de, se mwen k ajan an.")).toBeVisible();
});

test("Market: switching games and searching filter instantly, without reloading the page", async ({ browser }) => {
  const s = await newPage(browser);
  const email = `filt.${stamp}@example.com`;
  await registerCustomer(s, "Filtè Tès", email, pw);
  const seller = await verify(email);
  const ff = await db.marketListing.create({ data: { sellerId: seller.id, platform: "freefire", title: `FF filt ${stamp}`, price: 200000, currency: "HTG", images: ["/icon-192.png"], status: "ACTIVE" } });
  const tt = await db.marketListing.create({ data: { sellerId: seller.id, platform: "tiktok", title: `TikTok filt ${stamp}`, price: 900000, currency: "HTG", images: ["/icon-192.png"], status: "ACTIVE" } });

  const v = await newPage(browser);
  await v.goto("/ht/market");
  await v.waitForLoadState("networkidle");
  await v.evaluate(() => ((window as unknown as { stayed: boolean }).stayed = true));
  await v.getByRole("button", { name: /TikTok/ }).click();
  await expect(v.getByText(tt.title)).toBeVisible();
  await expect(v.getByText(ff.title)).toHaveCount(0);
  expect(v.url()).toContain("p=tiktok");
  await v.getByRole("button", { name: /^Tout/ }).click();
  await v.getByLabel("Chèche yon kont…").fill(`FF filt ${stamp}`);
  await expect(v.getByText(ff.title)).toBeVisible();
  await expect(v.getByText(tt.title)).toHaveCount(0);
  // Same page all along (a reload would have cleared this)
  expect(await v.evaluate(() => (window as unknown as { stayed?: boolean }).stayed)).toBe(true);
  // A shared link opens on the same filter
  await v.goto("/ht/market?p=tiktok");
  await expect(v.getByText(tt.title)).toBeVisible();
  await expect(v.getByText(ff.title)).toHaveCount(0);
  await db.marketListing.updateMany({ where: { id: { in: [ff.id, tt.id] } }, data: { status: "REMOVED" } });
});
