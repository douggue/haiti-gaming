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
| Admin | Dashboard, orders, payment review, risk queue, products/variants/categories in 4 languages, code import, customers (status, wallet adjustments), ledger, staff roles, settings (rate, limits, NatCash recipient, WhatsApp, announcement), audit log |
| Security | Argon2id, HttpOnly sessions, mandatory staff TOTP, server-side permission checks on every admin page and action, audit trail for approvals, adjustments, code reveals and role changes, security headers |

### Ledger guarantees (enforced in PostgreSQL, not only in code)
- Every transaction's entries sum to zero per currency (deferred constraint trigger).
- Customer wallets cannot go negative (CHECK constraint + row locks).
- Ledger entries, transactions and order history cannot be updated or deleted (triggers).
- Every posting has a unique idempotency key, so callbacks, retries and double-clicks credit once.

## Tests

```bash
TEST_DATABASE_URL=postgresql://…/haiti_gaming_test npm test       # ledger, concurrency, idempotency, exchange, crypto (14 tests)
npx playwright test                                              # 5 end-to-end journeys against a running server
```

The end-to-end suite covers: Kreyòl signup → MonCash purchase → code delivered; NatCash deposit and duplicate-reference rejection; admin 2FA setup and approval; wallet purchase of a manual top-up delivered by staff; HTG→USD exchange.

## Deploying to Vercel

1. Create a managed PostgreSQL database (Neon or Supabase) and set the env vars from `.env.example` in Vercel.
2. Build command `npm run build`; run `npm run db:deploy` against production before the first deploy.
3. `vercel.json` schedules `/api/cron/maintenance` every 10 minutes (MonCash polling, hold release, expiry). Set `CRON_SECRET`; Vercel sends it automatically.
4. In the MonCash merchant portal set the return URL to `https://<domain>/api/payments/moncash/return` and the alert URL to `/api/payments/moncash/callback`.

## Not done yet (needs accounts, decisions or a later stage)

- **Payment evidence storage** uses local disk (`src/lib/storage.ts`). Vercel's filesystem is not persistent: switch it to Cloudflare R2/S3 before production.
- **Email** (verification, receipts) and **WhatsApp/SMS** notifications: notifications are stored in-app; provider adapters plug into `src/lib/notify.ts` once Resend/WhatsApp accounts exist. Email verification is therefore not enforced yet.
- **Phone sign-in**, **referrals**, **support tickets**, **news/CMS page builder**, **theme builder** and **analytics exports** from the blueprint are not built.
- **Supplier API fulfillment**: products can be marked `SUPPLIER_API` but are delivered manually until a supplier adapter is written for a signed supplier.
- **Roles** are the six starter roles in code (`src/lib/permissions.ts`), not an editable role builder.
- **Background jobs** run through the cron route; Inngest is not wired in.
- **Kreyòl, French and Spanish copy** was written without native review; have a native speaker check it before launch.
- Legal review of the stored-value wallet and HTG/USD exchange is still required before launch.
