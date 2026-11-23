# LYOR Furniture implementation guidance

This is an independent Git repository. Run commands here and leave sibling repositories unchanged.

- Approved stack: Next.js/React/TypeScript; NestJS/Fastify; PostgreSQL/Prisma; Redis/BullMQ. Keep the API a modular monolith with a separate worker process.
- Read doc/README.md, doc/master-plan.md and the applicable flow/step record before modifying behavior. Update affected step, contract, phase acceptance and verification documents in the same change.
- Local mock identity and adapters are development/test only. Never silently enable live payments, ERP, Atlas, PMS, OIDC, GCS or deployment.
- Odoo owns real stock/orders/accounting; Atlas owns operational work; PMS owns property assignments. Synthetic database stock is only the local mock ERP.
- Preserve signed quote ownership/expiry/revision checks, customer-scoped idempotency and transactional outbox behavior. Never infer payment or reservation from accepted requests.
- Use fictional demo details. Keep .env, .data, build output and browser traces ignored.
- Required checks: npm run lint; npm run typecheck; npm test; npm run test:db; npm run contracts; npm run build; npm run test:e2e; npm run docs:check. Record failures and unexecuted infrastructure checks honestly.
- On Windows, use npm.cmd if PowerShell blocks npm.ps1. Embedded PostgreSQL may need permission outside the restricted execution account. Its tests use isolated localhost databases only.
- Live rollout requires the explicit gates in doc/decision-register.md. Do not mark a whole phase Done while scoped subfeatures or runtime acceptance remain open.
