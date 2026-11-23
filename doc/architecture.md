# Approved Node.js modular monolith

## Runtime

Browser → Next.js server/client components → same-origin BFF → NestJS/Fastify API → Prisma/PostgreSQL. A committed outbox is dispatched to Redis/BullMQ; a separate process runs workers and the local mock ERP. The outbox remains the recoverable source if queue data is lost.

## Modules and data

Authentication, catalog/search, serviceability, pricing, cart, order/checkout, B2B and admin are separate Nest modules. Integrations live behind server-side adapter boundaries. PostgreSQL has explicit cart→quote→order and order→outbox/reservation foreign keys. Company scope is fixed to the local `lyor-demo` company; a true multi-company IAM model is a PH-04 gate.

Money uses integer paise. Quotes include a policy revision, cart revision, PIN, owner, expiry and HMAC over canonically serialized content. Checkout revalidates identity, quote, cart revision, current prices and availability. Requests sharing a customer/key cannot create distinct intentions; the request hash rejects changed payload reuse.

## Security boundary

The local-only fake identities have no real security value and are disabled outside development/test. The BFF stores their selected identity in an HttpOnly SameSite=Strict cookie and rejects cross-origin mutations. Nest enforces ownership and staff roles independently. Never use production personal data in demo forms. Global per-process throttling is a demo control; production needs a shared Redis-backed strategy.

## Worker

The dispatcher leases eligible outbox rows and uses stable BullMQ job IDs. The mock adapter atomically checks component demand and decrements synthetic stock with serializable transactions and unique reservations. Payment stays `not_collected`. Real Odoo methods are not assumed and multiple JSON-2 calls are not treated as a single ERP transaction.

## Hosting direction

Vercel frontend; separate Cloud Run API/worker services; continuously allocated worker CPU and a minimum running instance; managed PostgreSQL/Redis with private connectivity; GCS media; reviewed one-off migrations; OpenTelemetry/Sentry correlation and redaction. Production configuration, telemetry exporters, GCS and OIDC are **not enabled** by this demo.

## Test/runtime versions

The lockfile pins installed packages. Docker Compose targets PostgreSQL 17 and Redis 7. The optional project-local embedded PostgreSQL helper uses PostgreSQL 18 for Windows local verification only. CI tests PostgreSQL 17; neither helper nor synthetic fixtures belong in production.
