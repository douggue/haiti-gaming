# Haiti Gaming

Responsive digital-goods store for Haiti: game top-ups, gift cards and subscriptions, paid with **MonCash** (automatic) or **NatCash** (staff-verified), plus an HTG/USD store-credit wallet. Built from *Website Blueprint v1.1*.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL + Prisma 6 · Better Auth (Argon2id, sessions, TOTP 2FA) · next-intl (Kreyòl default, French, English, Spanish).

## Quick start

```bash
cp .env.example .env            # fill DATABASE_URL, BETTER_AUTH_SECRET, ENCRYPTION_KEY (openssl rand -base64 32)
npm install
npm run db:deploy               # apply migrations
npm run db:seed                 # demo categories, products and demo gift-card codes
npm run setup:admin -- --email you@example.com --name "Your Name"   # prompts for a password
npm run dev                     # http://localhost:3000  →  /ht
```

Sign in to the back office at `/admin/login`. Two-factor authentication is mandatory for every staff account and is set up on first sign-in.

Without MonCash credentials the site runs MonCash in **mock mode** (a test approval page, no real money). Mock mode refuses to run in production unless `ALLOW_MOCK_PAYMENTS=1`.

## What is built

| Area | Included |
| --- | --- |
| Storefront | Home, store with search/sort/category filters, categories, product pages with variants and required player-ID fields, cart, checkout, payment guides, FAQ, about, contact, terms, privacy, refunds |
| Languages | `ht` (default), `fr`, `en`, `es`; locale URLs, cookie → browser language → Kreyòl, hreflang, canonical, sitemap, robots, JSON-LD (Organization, Product, Breadcrumb, FAQ) |
| Customer account | Dashboard with wallet card and stats, orders with delivered codes and timeline, saved player IDs, buy again, notifications, profile (language/currency), security (password, sessions) |
| Payments | MonCash adapter (sandbox/live/mock) verified server-side via MonCash's API on return, callback and a polling cron; NatCash manual flow with reference + optional screenshot and staff approval |
| Wallet | Double-entry, append-only ledger in integer minor units; HTG and USD balances; held funds; HTG↔USD exchange with expiring quotes; **no withdrawals** (store credit) |
| Fulfillment | Encrypted code inventory (AES-256-GCM, dedupe by HMAC, `SKIP LOCKED` assignment), manual delivery with notes, automatic refund to wallet on cancel |
| Fraud controls | One-time NatCash references (DB-unique), new-account daily limits, holds on large deposits, high-value order review queue, amount-mismatch flags, rate-limited auth |
| Images | Upload in the admin (JPG/PNG/WebP, up to 5 MB, content-checked): product main image + gallery of up to 8, category images, logo (light and dark), homepage hero image, social-share image. Stored on Vercel Blob (public), served through Next.js image optimization (AVIF/WebP, responsive sizes). Anything without an image falls back to a generated tile, the category emoji or the built-in logo |
| Operations | Automatic refund to the wallet for paid orders not delivered within N hours (setting, runs with the cron job); public order-tracking link (`/order-status/[id]?t=…`, no sign-in, codes stay private); reports with daily sales chart, top products, sales by payment method and CSV exports (orders, payments, ledger, customers) |
| Staff controls | Re-confirmation with the authenticator code (10 minutes) before wallet adjustments, role changes, 2FA resets and settings; two-person approval for wallet adjustments above a threshold; custom roles with per-permission checkboxes |
| Content | Homepage editor (reorder/hide sections, hero text per language, draft → preview → publish, version history); news articles with scheduling; SEO manager (page titles/descriptions per language, redirects for old links); translation editor for every interface text; theme editor (colors, rounding, animations) with contrast checks, live preview and rollback |
| Customer extras | Support tickets with screenshots and staff replies; referral program (link, store-credit reward after the friend's first delivered order, same-network self-referrals rejected); notification preferences; cart saved to the account across devices; data export (JSON) and self-service account deletion; optional two-step verification for customers; offline page (service worker) and data-saver mode |
| Admin | Dashboard, orders, payment review, risk queue, products/variants/categories in 4 languages, code import, customers (status, wallet adjustments), ledger, staff roles, settings (rate, limits, NatCash recipient, WhatsApp, announcement), audit log |
| Accounts | Email sign-up/sign-in/sign-out; passwords checked against known breaches (Have I Been Pwned, k-anonymity, fails open); sign-up errors don't reveal registered emails; suspended accounts refused at sign-in; forgot/reset password (email via Resend when configured, otherwise WhatsApp support + one-time admin reset link, 1 hour, single use, signs out all devices); email verification once email is configured; staff backup codes and Super Admin 2FA reset |
| Security | Argon2id, HttpOnly sessions, mandatory staff TOTP, server-side permission checks on every admin page and action, audit trail for approvals, adjustments, code reveals and role changes, security headers |

### Ledger guarantees (enforced in PostgreSQL, not only in code)
- Every transaction's entries sum to zero per currency (deferred constraint trigger).
- Customer wallets cannot go negative (CHECK constraint + row locks).
- Ledger entries, transactions and order history cannot be updated or deleted (triggers).
- Every posting has a unique idempotency key, so callbacks, retries and double-clicks credit once.

## Tests

```bash
TEST_DATABASE_URL=postgresql://…/haiti_gaming_test npm test       # ledger, concurrency, idempotency, exchange, auto-refund, crypto (16 tests)
# End-to-end (14 tests in 5 files) against a running server started with test-only switches:
AUTH_RATE_LIMIT=off ALLOW_MOCK_PAYMENTS=1 npm start
npx playwright test e2e/journeys.spec.ts    # run each file on its own; each sets up the admin's 2FA from scratch
```

The end-to-end suite covers: Kreyòl signup → MonCash purchase → code delivered; NatCash deposit and duplicate-reference rejection; admin 2FA setup and approval; wallet purchase of a manual top-up delivered by staff; HTG→USD exchange.

## Deploying to Vercel

1. **Database (Neon):** create a Neon project. Set `DATABASE_URL` to the **pooled** connection string (host contains `-pooler`; add `&pgbouncer=true` to the end) and `DIRECT_URL` to the **direct** one. Both are on Neon's "Connect" panel. You can also add Neon from Vercel → Storage, then copy its pooled/unpooled URLs into these two names.
2. **Storage (Vercel Blob):** in Vercel → Storage, create a Blob store and connect it to the project. That sets `BLOB_READ_WRITE_TOKEN`. The same store holds **public** images (products, categories, logo, hero) and **private** NatCash payment screenshots that only staff can open. Without it, image uploads are disabled in production and screenshots are skipped.
3. **Environment variables:** in Vercel → Settings → Environment Variables, add everything from `.env.example`. Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL` to your real domain (e.g. `https://haitigaming.com`). Generate new `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY` and `CRON_SECRET`. **Keep `ENCRYPTION_KEY` safe and never change it**: stored gift-card codes cannot be read without it.
4. **Deploy:** import the repository in Vercel. The `vercel-build` script runs `prisma migrate deploy` automatically before each build.
5. **First admin:** from your computer, with `DATABASE_URL`/`DIRECT_URL` pointing at production, run `npm run setup:admin -- --email you@example.com`, then sign in at `/admin/login` and set up 2FA. Optionally run `npm run db:seed` for demo products (delete the demo codes before launch).
6. **MonCash:** until `MONCASH_CLIENT_ID`/`MONCASH_CLIENT_SECRET` are set, MonCash is hidden at checkout in production. In the MonCash merchant portal set the return URL to `https://<domain>/api/payments/moncash/return` and the alert URL to `https://<domain>/api/payments/moncash/callback`.
7. **Cron:** `vercel.json` runs `/api/cron/maintenance` once a day (the Hobby plan limit). On the Pro plan, change the schedule to `*/10 * * * *` so missed MonCash callbacks are recovered and held deposits are released within minutes.

## Waiting on your accounts (code is ready, switched off)

| Feature | What turns it on |
| --- | --- |
| Live MonCash | Merchant approval; set `MONCASH_CLIENT_ID`, `MONCASH_CLIENT_SECRET`, `MONCASH_MODE=live` |
| Emails (password reset, verification, order and deposit notifications) | A domain verified in Resend; set `RESEND_API_KEY` and `EMAIL_FROM` |
| WhatsApp notifications and phone sign-in | A WhatsApp Business account (Meta or Twilio); the hook is `src/lib/notify.ts` |
| Automatic supplier delivery | A signed supplier and its API; products can already be marked `SUPPLIER_API` (delivered manually until then) |
| USD card payments, Google sign-in | Stripe / Google Cloud accounts, later |

Before launch: native-speaker review of the Kreyòl, French and Spanish text; legal review of the stored-value wallet and HTG/USD exchange; replace the demo products, demo codes and placeholder business details (Admin → Settings).

**Never set `AUTH_RATE_LIMIT=off` or `ALLOW_MOCK_PAYMENTS=1` in production.** They exist only for automated tests.
