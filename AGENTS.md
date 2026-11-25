# LYOR Furniture implementation guidance

This is an independent Git repository. Run commands here and leave sibling repositories unchanged.

- Approved backend: Python 3.12, FastAPI, Uvicorn, Pydantic v2, PostgreSQL, SQLAlchemy 2, Alembic, and Celery with Redis. Keep a modular monolith and manage the API and workers as separate processes. Node.js remains for Next.js and its build and contract tooling.
- NestJS, Prisma, and BullMQ are the legacy parity and rollback runtime. Retain it until API, database, worker, and frontend parity pass and rollback is approved. Preserve the existing Next.js UI, routes, assets, and workflows.
- Read `docs/MASTER_IMPLEMENTATION_PLAN.md` and the active phase record before editing. Update the affected architecture and implementation records under `docs/` and append to `docs/DEVELOPMENT_CHANGELOG.md` at each phase gate. The existing `doc/` tree is historical.
- Local mock identity and adapters are development/test only. Never silently enable live payments, ERP, Atlas, PMS, OIDC, GCS or deployment.
- Odoo owns real stock/orders/accounting; Atlas owns operational work; PMS owns property assignments. Synthetic database stock is only the local mock ERP.
- Preserve signed quote ownership/expiry/revision checks, customer-scoped idempotency and transactional outbox behavior. Never infer payment or reservation from accepted requests.
- Use fictional demo details. Keep .env, .data, build output and browser traces ignored.
- Required checks: npm run lint; npm run typecheck; npm test; npm run test:db; npm run contracts; npm run build; npm run test:e2e; npm run docs:check. Record failures and unexecuted infrastructure checks honestly.
- On Windows, use npm.cmd if PowerShell blocks npm.ps1. Embedded PostgreSQL may need permission outside the restricted execution account. Its tests use isolated localhost databases only.
- Use isolated database copies and Redis for migration and differential testing. Reconcile all BullMQ jobs before changing worker ownership. One backend writes business records during cutover.
- Report tests and stop for acceptance at each phase gate. Production migrations, worker cutover, and deployment each require explicit approval. See `docs/DECISIONS.md` and the historical release gates in `doc/decision-register.md`.
