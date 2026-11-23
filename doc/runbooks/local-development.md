# Local development

## Requirements

Node.js matching `.nvmrc`, npm, and PostgreSQL/Redis. Use Chrome for the local Playwright configuration. The repository is a local-only synthetic demo; use fictional contact details.

## First setup (repository root)

```powershell
npm.cmd ci
npm.cmd run setup:local
npm.cmd run db:generate
npm.cmd run infra:up
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

Open http://127.0.0.1:3000 . API: http://127.0.0.1:4000/api/v1 . Interactive API documentation: http://127.0.0.1:4000/api/docs . Readiness: /api/v1/health/ready . The exact loopback origin matters because BFF mutations enforce WEB_ORIGIN.

The backend dev command compiles TypeScript before starting. Restart it after API edits. Next.js reloads frontend edits automatically.

## When Docker is unavailable

Start `npm.cmd run db:local` in a separate terminal instead of the PostgreSQL container. It starts a project-local PostgreSQL 18 process on port 5432 and preserves state under ignored `.data/postgres`. The Windows sandbox may require permission to run it outside the restricted account. It does not install a Windows service or modify an existing database. Do not run it alongside another database on port 5432.

Then run migration, seed and dev as above. Redis remains necessary for BullMQ; without it, submitted requests correctly stay pending. Do not infer reservation from a saved request.

## Worker

With Redis available, start `npm.cmd run worker` in a separate terminal. It dispatches outbox records and processes only the local mock ERP. Its local health endpoint is http://127.0.0.1:4001 . No real ERP, Atlas, PMS or payment endpoints exist in this delivery.

## Demo journey

1. Browse a product and choose rent/buy, quantity and tenure.
2. Add it to the cart; select Aarav or Ananya as a demo identity.
3. Check PIN 201304 and request the server quote.
4. Review checkout, enter fictional address/phone and consent.
5. Submit once or retry the same request safely. Inspect separate order/payment/stock/delivery states.
6. With the worker running, mock stock is reserved and order becomes confirmed_demo; payment remains not_collected.
7. Use staff demo identities for publication and exception inspection.

## Verification

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:db
npm.cmd run contracts
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run docs:check
```

`npm test` runs unit/component tests and skips DB tests unless RUN_DB_TESTS=true. `test:db` starts its own isolated localhost test cluster on 5433 and creates a uniquely named test database; it never resets the demo database. It preserves ignored test-cluster data and shuts down after tests. CI uses a PostgreSQL 17 service instead.

Playwright uses running local servers or starts them. Screenshots are saved under ignored `.data/screenshots`; failure traces remain under ignored test-results/playwright-report.

## Environment

setup:local creates ignored .env and apps/web/.env.local only when absent. Existing local configuration is preserved. QUOTE_SECRET is generated randomly. The example PostgreSQL password is local-only. Never reuse these settings for shared or production systems.

When a local API is already running, restart its NestJS dev process after pulling the storefront readiness change so cart responses include the product summary field. The API process compiles when it starts.
