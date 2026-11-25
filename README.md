# Lyor Furniture Web

A local Noida furniture marketplace built with Next.js/React/TypeScript and NestJS/Fastify, PostgreSQL/Prisma and a separate Redis/BullMQ worker. Commerce data is synthetic: no money is collected and no real external order or message is sent.

## Documentation

The [FastAPI migration plan](docs/MASTER_IMPLEMENTATION_PLAN.md) tracks the approved target architecture, phase gates, and verification. The local startup commands below run the legacy reference application during the migration.

Start at [doc/README.md](doc/README.md). It indexes 8 phases, 20 flow plans and 109 step documents, architecture decisions, REA evidence and actual [verification results](doc/verification.md). Not all planned steps are implemented.

## Local startup

Use Node.js LTS matching .nvmrc. From this repository:

```powershell
npm.cmd ci
npm.cmd run setup:local
npm.cmd run db:generate
```

Start PostgreSQL and Redis with `npm.cmd run infra:up`. If Docker is unavailable, run `npm.cmd run db:local` in a separate terminal; this starts a project-local database without installing a Windows service.

Then:

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

Open **http://127.0.0.1:3000**. API docs: http://127.0.0.1:4000/api/docs . Try PIN **201304** and the local **Aarav / Ananya** demo identities. Use fictional details only.

With Redis available, start `npm.cmd run worker` separately. Without a worker, saved requests honestly remain pending; mock confirmation never means payment was collected.

See the [local runbook](doc/runbooks/local-development.md) for ports, environment settings, startup and shutdown details.

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

Database tests use an isolated localhost PostgreSQL cluster on 5433. Browser tests use Chrome locally and Chromium in CI.

## Delivery boundary

Implemented: catalog/search/filter/sort/pagination, product configuration, fixed bundles, persisted cart, signed expiring quotes, owned idempotent order intentions/outbox, mock stock reservation, customer status tracks, multi-site enquiries and staff publication/replay controls.

Deferred: rental start-date/slot planning, existing-account cart merge, full CMS editing, production OIDC, verified ERP/Atlas/PMS/payment connections and operational returns/QC/settlement. Actual Redis recovery remains a separate acceptance gate. Production demo authentication is intentionally disabled.

No deployment, commit or Git push has been performed.
