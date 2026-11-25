# Migration decisions

| Decision | Rule |
| --- | --- |
| Scope and design | FastAPI/GCP parity is approved. Existing Next.js presentation and workflows are the acceptance reference. New launch features require their own approvals. |
| API compatibility | The legacy 18-operation contract and observed runtime behavior govern schemas, status, errors, ownership, roles, and externally observable effects. |
| Data | Preserve the eight PostgreSQL tables and legacy migration history. Stamp only after equivalence is verified on an isolated restore. |
| Cutover | Only one authoritative backend writes business records. Only one dispatcher owns the outbox. Keep the rollback runtime available until all parity gates pass and rollback is approved. |
| External dependencies | Verify company scope, permissions, and sandbox contracts with the Odoo, Atlas, PMS, payments, and identity owners before enabling each capability. |
| Odoo catalogue pilot | Read explicitly selected active product variants by SKU. Confirm the approved LYOR price, image, and Noida publication mappings before importing. Odoo remains authoritative for real stock and commercial records. |
| Cloud and releases | Cloud Run is the web/API target. Worker pool lifecycle, scale, cost, and shutdown need measured staging evidence. Production migrations, worker cutover, and deployment each require explicit approval. |

See the [historical decisions](../doc/decision-register.md) for prior commercial and release decisions.
