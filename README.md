# Mira

A production-oriented e-commerce storefront and admin for a dress/fashion shop.

Next.js 15 (App Router) · React 19 · TypeScript · PostgreSQL + Prisma · Auth.js v5 · Tailwind CSS v4

---

## Getting started

You need Node 20.11+ and a PostgreSQL 14+ database. There is no local Postgres in
this repo — point `DATABASE_URL` at a hosted dev branch (Neon, Supabase) or a
local server.

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL, DIRECT_URL, AUTH_SECRET
npm run db:migrate            # create the schema
npm run db:seed               # catalogue, admin + customer accounts, discount codes
npm run dev
```

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

The seed creates `admin@mira.example` (ADMIN) and `customer@mira.example`
(CUSTOMER), both using whatever you set as `SEED_ADMIN_PASSWORD`.

**No password is published here on purpose.** The seed refuses to run against a
non-localhost `APP_URL` with a weak or unset `SEED_ADMIN_PASSWORD`, because a
known admin password on a reachable deployment is a back door.

To change the admin password later:

```bash
node -e "const c=require('crypto'),{PrismaClient}=require('@prisma/client'),{hash}=require('@node-rs/argon2');const db=new PrismaClient();const pw=c.randomBytes(16).toString('base64url');(async()=>{await db.user.update({where:{email:'admin@mira.example'},data:{passwordHash:await hash(pw,{memoryCost:19456,timeCost:2,parallelism:1}),sessionVersion:{increment:1}}});console.log('new password:',pw);await db.\$disconnect();})()"
```

Incrementing `sessionVersion` signs out every existing session for that user.

## Scripts

| Command             | Purpose                                       |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Development server                            |
| `npm run build`     | Generate Prisma client, then a production build |
| `npm run typecheck` | `tsc --noEmit`                                 |
| `npm run lint`      | ESLint                                        |
| `npm test`          | Vitest unit tests                             |
| `npm run test:e2e`  | Playwright end-to-end suite (builds, then drives a browser) |
| `npm run test:e2e:ui` | The same suite in Playwright's interactive runner |
| `npm run db:migrate`| Create/apply a migration in development       |
| `npm run db:deploy` | Apply migrations in CI/production             |
| `npm run db:seed`   | Seed development data                         |
| `npm run db:studio` | Prisma Studio                                 |

## Architecture

```
Route handlers / Server Actions / Pages   HTTP + RSC boundary: authz, Zod parse
        ↓
Services  (src/server/services/*)         all business rules
        ↓
Prisma                                    data access, transactions
        ↓
PostgreSQL
```

Rules that keep the layering honest:

- **No Prisma calls in components or route handlers.** Only services touch the database.
- **Every service authorizes its own caller.** Middleware and layout guards are
  UX conveniences; `requirePermission` / `assertOwnership` inside the service is
  the real boundary, and it is on every code path.
- **Prices are never accepted from the client.** Cart and order totals are
  recomputed server-side from the database at every step, including at checkout.
- **Money is an integer in minor units** (paise) plus a currency code. No floats.
- **Server Components by default**; `"use client"` sits at the leaves.

### Layout

```
prisma/            schema, migrations, seed
src/
  app/
    (storefront)/  home, shop, category, product, cart, checkout
    (auth)/        login, register, password reset, email verification
    account/       orders, wishlist, addresses, profile
    admin/         dashboard, products, categories, inventory, orders
    api/           auth, health, cron
  actions/         Server Actions — parse input, call a service, revalidate
  server/
    services/      business logic (the only place that queries the database)
    auth/          Auth.js config, RBAC, session helpers, password hashing
    payments/      provider interface + implementations
  components/
    ui/            unstyled-ish primitives (button, input, dialog, table…)
    commerce/      domain components (product card, cart line, filters…)
    forms/         react-hook-form + Zod forms
    admin/         admin-only components
    layout/        header, footer, sidebars
  lib/             money, slug, pagination, rate limiting, validation schemas
  types/           view models shared between server and client
```

## Payments

**No gateway is integrated yet — this is deliberate and the decision is deferred.**

The checkout UI is complete: method selection (card, UPI, net banking, wallet,
cash on delivery), address capture, order summary and confirmation. Behind it,
`src/server/payments/provider.ts` defines the seam, and `manual.provider.ts`
implements it by recording the order as `AWAITING_PAYMENT` for offline
settlement — which is real behaviour, not a stub. Staff mark the order paid from
the admin, and that path commits the inventory reservation exactly as a webhook
will.

To add Stripe or Razorpay later: implement `PaymentProvider`, register it in
`src/server/payments/index.ts`, add a signature-verified webhook route, and set
`PAYMENT_PROVIDER`. No page, action or service changes.

The checkout deliberately does **not** render card-number fields. Raw card data
must never reach our servers; the provider's hosted element mounts into the
panel that is already in the payment step, which keeps the shop at PCI SAQ-A.

## Notable design decisions

**JWT sessions, not database sessions.** Auth.js only supports the credentials
provider under the JWT strategy, and email+password is required. Revocability —
the reason to prefer database sessions — is recovered with `User.sessionVersion`:
the token carries the version it was minted with, and the `jwt` callback
re-checks it against the database every five minutes and on every update. A
password change, suspension or forced logout increments it and every existing
session dies.

**Oversell is prevented by a conditional UPDATE.** `reserveStock` increments
`reserved` in the same statement that re-checks availability, inside the order
transaction. Two shoppers racing for the last dress cannot both win. Expired
holds are reclaimed on the checkout path itself, with a scheduled sweep as
backstop.

**Order lines are snapshots.** Title, variant, SKU, image and unit price are
copied onto `OrderItem`, so an order still renders correctly years after the
product is renamed, repriced or deleted.

**Filters live in the URL.** Back-button correctness, shareable filtered links,
and a server-rendered results grid with no client-side listing logic.

**Storefront pages render per request.** The header shows this shopper's cart and
session. Catalogue caching lives one level down, in tag-invalidated
`unstable_cache` wrappers around the product and category queries.

## Operations

`/api/cron/release-reservations` (GET or POST, `Authorization: Bearer
$CRON_SECRET`) sweeps expired stock holds. It is scheduled in `vercel.json`.

The sweep is housekeeping, not a correctness dependency: `reserveStock` releases
expired holds on the variants it is about to touch, so an abandoned checkout
cannot block stock even if the sweep has not run.

`GET /api/health` returns 503 when the database is unreachable, so a load
balancer can drain the instance.

## Deploying to Vercel + Neon

1. **Database** — create a project at [neon.tech](https://neon.tech). Copy both
   connection strings: the **pooled** one for `DATABASE_URL` and the **direct**
   one for `DIRECT_URL`. Prisma Migrate cannot run through a pooler.

2. **Push to GitHub** — Vercel deploys from a git remote.

   ```bash
   git remote add origin git@github.com:<you>/mira.git
   git push -u origin main
   ```

3. **Import to Vercel** — New Project, pick the repo, framework auto-detects as
   Next.js. Leave the build command alone: `vercel-build` runs
   `prisma migrate deploy && next build`, so migrations apply on every deploy.

4. **Environment variables** — set these in Vercel (Production and Preview):

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Neon pooled string |
   | `DIRECT_URL` | Neon direct string |
   | `AUTH_SECRET` | `openssl rand -base64 32` |
   | `AUTH_URL` | `https://<your-app>.vercel.app` |
   | `APP_URL` | `https://<your-app>.vercel.app` |
   | `NEXT_PUBLIC_APP_URL` | `https://<your-app>.vercel.app` |
   | `CRON_SECRET` | another 32-byte random value |
   | `SEED_ADMIN_EMAIL` | your admin email |
   | `SEED_ADMIN_PASSWORD` | a strong password |
   | `NEXT_PUBLIC_STORE_NAME` | `Mira` |
   | `NEXT_PUBLIC_DEFAULT_CURRENCY` | `INR` |

   `AUTH_URL`, `APP_URL` and `NEXT_PUBLIC_APP_URL` must exactly match the
   deployed origin, or sign-in redirects break.

5. **Seed the hosted database** — once, from your machine, with `.env` pointed
   at Neon:

   ```bash
   DATABASE_URL="<neon pooled>" DIRECT_URL="<neon direct>"      APP_URL="https://<your-app>.vercel.app"      SEED_ADMIN_PASSWORD="<strong password>" npm run db:seed
   ```

6. **Cron** — `vercel.json` schedules the reservation sweep daily at 03:00 UTC,
   the maximum frequency on the Hobby plan. On Pro, change it to `*/5 * * * *`.
   Either way checkout releases expired holds on the variants it touches, so
   stock is never blocked between runs. Vercel attaches
   `Authorization: Bearer $CRON_SECRET` automatically.

## Testing

Two suites, and they answer different questions.

`npm test` runs Vitest over the pure logic — money arithmetic, pricing, slugs,
rate limiting, email bodies. Fast, no database, no browser.

`npm run test:e2e` runs Playwright against a production build and a real
database. It signs in, browses, fills the bag, places a guest order, and then
goes through the admin to record the payment, ship the parcel and mark it
delivered. It covers what unit tests structurally cannot: that the pages
render, that the Server Actions are wired to the right services, and that
authorisation actually holds at the route.

It needs a seeded development database and `SEED_ADMIN_PASSWORD` set, because
it signs in as the seeded accounts. **It writes to whatever `DATABASE_URL`
points at** — orders, shipments, discount codes. Never point it at production.

```bash
npm run db:seed
npm run test:e2e
```

The first run builds the app, which takes a minute; `E2E_DEV=1 npm run test:e2e`
drives `next dev` instead if you already have one running.

If you want to keep working while the suite builds, give your dev server its
own build directory — otherwise the build replaces files the running server is
reading and Next fails with "Invariant: Expected clientReferenceManifest to be
defined", which looks like an application bug and is not one:

```bash
NEXT_DIST_DIR=.next-dev npm run dev
```

## Observability

Sentry is wired for the server, the browser and middleware, and is completely
inert until `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` are set — no DSN means no
network calls and no overhead, which is what you want locally. Reports are
tunnelled through `/monitoring` so ad blockers do not swallow them, PII is off
by default, and session replay is deliberately not enabled: it would record
what shoppers type into the checkout.

Page-view analytics come from `@vercel/analytics`. It is cookieless and
first-party, so it needs no consent banner, and it sends nothing outside a
Vercel deployment.

## Not built yet

Deferred on purpose, and nothing in the schema blocks them: multi-currency and
i18n, gift cards, product bundles, loyalty, a customer-facing returns/RMA
portal (staff can refund and restock from the admin today), live carrier rates,
Meilisearch, recommendations, editorial `Collection`s beyond categories, the
`Setting` table (shop configuration is environment-driven for now), and a
background job queue.

The one deliberate gap that blocks real trading is the **payment gateway** —
see [Payments](#payments).
