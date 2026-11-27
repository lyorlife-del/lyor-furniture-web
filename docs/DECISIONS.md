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

## Location serviceability decisions — 2026-11-27

| Decision | Rule |
| --- | --- |
| Approved delivery geography | User confirmed all valid PIN codes in Delhi's entire NCT and Gurugram city (Gurgaon). This expands the initial New Delhi wording; Gurugram city does not mean the entire district. Postal source and verified PIN list are pending, not the coverage policy |
| Postal and delivery authority | Approved independent postal reference establishes geography; LYOR PostgreSQL zones establish operational eligibility. Neither Google recognition nor a PIN prefix grants serviceability. Derive versioned coverage from the confirmed policy after approving the source |
| Separate gates | LOC-00 through LOC-06 have independent evidence and acceptance. Migration Phase 05 remains in progress; no implicit Phase 06/deployment authorization |
| Compatibility | Preserve the original demo contract, signatures and rollback runtime. Add FastAPI-only location operations and versioned delivery quote/request context; new delivery events must not be processed by demo workers |
| Geographic privacy | One-time user-initiated GPS, explicit detected-PIN confirmation, no stored exact coordinates or persistent provider-response cache. Provider failure always leaves manual entry available |
| Request versus confirmation | PIN check/quote/slot selection creates no reservation. Local holds use PostgreSQL transactions; Odoo/payment use durable idempotent reconciliation and compensation. Confirm only with required address, stock, slot and verified-payment evidence |
| Live activation | Missing postal source, verified list, capacity, identity or provider/payment/stock contracts keeps the affected capability gated. Synthetic fixtures cannot stand in for live evidence |

Implementation proposals and acceptance evidence: [LOC plan](implementation/location-serviceability-plan.md).

## LOC-01 implementation decisions — 2026-11-27

- LOC-00 was accepted and LOC-01 authorized. The feature remains opt-in with independent server flags; default legacy Noida behavior and all 18 original API operations remain available.
- Add eight SQLAlchemy Core tables through frozen additive Alembic SQL. New reference activation is an explicitly reviewed offline operation on guarded local/test databases; no public configuration-write endpoint is introduced at this phase.
- An approved complete reference is required before unknown PINs can be distinguished from source gaps. Disabled, expired, incomplete, wrong-mode or unreachable data produces an unavailable result, with no fallback to hardcoded eligibility. Synthetic and nonsynthetic references cannot be substituted across modes.
- The approved Delhi NCT/Gurugram city policy is unchanged. The shipped manifest is synthetic test evidence only. A real source, boundary mapping and verified list are still pending; no geocoding or live booking is enabled by these changes.
- Configuration activations serialize against readers, retain inactive membership history and increment an audited revision. Reapplying a snapshot creates a new revision, while reference staging is idempotent and immutable by content checksum. Populated downgrade is blocked; application rollback retains the additive tables.
