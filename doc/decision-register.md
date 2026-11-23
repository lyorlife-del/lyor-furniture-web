# Decisions and launch gates

| ID | Decision | State / owner |
|---|---|---|
| ADR-001 | TypeScript NestJS/Fastify modular monolith replaces the earlier backend alternative | Approved by user |
| ADR-002 | Root folder is `doc/`; flow and step records are canonical | Approved plan |
| ADR-003 | Noida synthetic demo first; original LYOR design and owned LYOR logo | Approved by user |
| ADR-004 | PostgreSQL outbox plus BullMQ; queue deduplication alone is insufficient | Implemented baseline |
| ADR-005 | Canonical HMAC quote and customer-scoped idempotency keys | Implemented baseline |
| ADR-006 | Single standard variant and fixed bundles in first seed | Demo scope; configurable variants remain a later P0 step |
| ADR-007 | Quote includes first rental month or purchase, demo delivery ₹199, demo GST 18%, zero demo deposit; 3/6/12-month plans | Synthetic fixture only; Finance must approve real policies |
| GATE-001 | Actual PINs, rent terms, taxes, deposits, refunds, warranty and damage policy | Product/Finance, before live rollout |
| GATE-002 | Odoo entitlement, `/doc`, bot permissions, supported atomic reservation and company scoping | Odoo lead, PH-04 |
| GATE-003 | Physical unit identity: Odoo serials or approved reconciled registry | Inventory lead, PH-04 |
| GATE-004 | Managed OIDC provider, retention, consent and KYC policy | Engineering/Compliance, PH-04–05 |
| GATE-005 | Verified Atlas/PMS contracts and idempotent event mappings | Integration owners, PH-04 |
| GATE-006 | Gateway, webhook signature, accounting reconciliation and refund approval | Finance, PH-05 |
| GATE-007 | Real Redis worker recovery, monitoring, rollback and pilot acceptance | Engineering/QA, before phase exit |
