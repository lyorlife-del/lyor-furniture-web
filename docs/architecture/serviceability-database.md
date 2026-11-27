# Serviceability database design

LOC-00 design with LOC-01 implementation notes. See [API/service design](location-serviceability-lld.md) and [phase plan](../implementation/location-serviceability-plan.md).

LOC-01 implements the reference, postal, area, city, configuration, zone, membership and decision-audit tables using SQLAlchemy Core metadata and frozen Alembic revision `0002_location_reference`. No capacity, preference, quote extension, hold or interest tables exist yet. Reference expiry is explicit `valid_until`; imported data is immutable by checksum and selected per company configuration. Fresh/restored-copy tests preserve all original tables/rows and Prisma history. No production or existing development database was changed.

The supported offline activation path takes the configuration row's exclusive lock; PIN readers take its shared lock. It rejects duplicate active PIN assignments before writing and retains old memberships inactive. No PostgreSQL extension is required. Direct database edits bypassing that path are unsupported; if they create overlapping assignments, public checks report `ambiguous_zone` and never grant delivery. Existing `AuditLog` records configuration actor/reference/revision, and `serviceability_audit` records evaluated PIN decisions without coordinates. Unconfigured/unavailable checks return typed errors rather than manufacturing an audit decision from missing reference data.

## Existing schema and migration boundary

Reuse `Product`, `Cart`, `Quote`, `OrderIntent`, `OutboxEvent`, `Reservation`, `BusinessEnquiry` and `AuditLog` from `apps/api/app/db/models.py`. `Product.cities` supplies current city-level publication. `Quote.pin` and address JSON supply current delivery context. There are no existing postal, city, zone or slot tables. Preserve baseline `0001_legacy`, its frozen SQL/schema JSON, and historical Prisma migration. New schema uses additive Alembic revisions after that baseline; never rewrite or regenerate the baseline from new metadata.

## Proposed entities by implementation gate

All operational tables are company-scoped. PIN is text, country is ISO `IN`, IDs are UUIDs, new timestamps are timezone-aware UTC, and date/window presentation uses Asia/Kolkata. Existing legacy timestamp semantics stay unchanged. Postal metadata is independently licensed reference data, not harvested Google results.

| Entity | Gate | Important fields and constraints |
| --- | --- | --- |
| `postal_reference_versions` | LOC-01 | Source, license/provenance, checksum, imported/verified time, covered jurisdictions, completeness, active version. Immutable imports with an explicit activation step |
| `postal_codes` | LOC-01 | PK `(reference_version_id, pincode)`; ASCII nonzero-leading six-digit CHECK; country, nullable city/district, state, active, source record reference. One PIN may have multiple post offices; retain aliases separately instead of inventing a city |
| `postal_code_areas` | LOC-01 | FK reference/PIN, source administrative area identifiers and verified NCT/city membership, boundary-review evidence. Supports cross-boundary PINs without treating a district label as city membership |
| `delivery_cities` | LOC-01 | Unique company/slug; display name, administrative scope reference, active. Delhi NCT and Gurugram city scope only for the approved live policy; Noida remains demo-only |
| `serviceability_configuration` | LOC-01 | One row per company with monotonic revision, active postal version and update actor/time. Row lock coordinates admin changes with final validation |
| `delivery_zones` | LOC-01 | Company, city FK, name, `active` and `operational_status` (`open`/`paused`/`closed`), revision, created/updated timestamps |
| `delivery_zone_pincodes` | LOC-01 | Zone FK, PIN/reference FK, active, effective `[from,until)` instants; CHECK until > from. Versioned membership with no overlapping active assignments for the same company/PIN |
| `delivery_capacity` | LOC-04 | Zone FK, delivery date, start/end timestamptz, total/reserved capacity, operational status, revision; UNIQUE zone/window; CHECK end > start and `0 <= reserved <= total`. Prevent overlapping windows within the same capacity pool |
| `quote_delivery_context` | LOC-04 | Quote PK/FK, policy/signature version, zone, PIN/reference/configuration version, slot FK and confirmed-address requirements; immutable snapshot bound by the quote signature |
| `delivery_holds` | LOC-04 | Unique order FK, capacity FK, units, state, expiry, external stock reference and reconciliation status; positive units, bounded state transitions, unique durable operation reference. Do not store exact coordinates |
| `location_preferences` | LOC-03 | Unique company/owner; confirmed PIN, revision, confirmed timestamp. Existing guest cookie holds only a nonauthoritative PIN; no new anonymous tracking identity required |
| `serviceability_audit` | LOC-01 | PIN, typed result/reason, source (`manual`/`confirmed_detection`/`checkout`), configuration version, UTC time; no precise GPS or full address. Bounded retention, access restricted to operational roles |
| `expansion_interests` | LOC-05 | PIN, protected minimum contact reference, normalized deduplication key, explicit consent/preference, created/withdrawn timestamps, status, hashed opt-out token; no marketing sends by default |

Use existing `AuditLog` for actor-attributed configuration and consent changes; serviceability decision logs have their own retention policy. Do not duplicate full contacts in audit JSON. Index PIN/reference lookups; active mapping company/PIN/effective ranges; zone/date/status capacity lookups; hold expiry/status; audit timestamp and controlled PIN/time investigation; and contact deduplication. Use restrictive foreign keys for historical quote/order references.

## Mapping consistency

Coverage policy is approved, but no live PIN rows are approved or seeded yet. Once the postal source is approved, ingest into an inactive version, validate checksum/provenance and completeness, derive Delhi NCT and Gurugram city memberships, and review source exceptions. Unknown or cross-boundary area membership must not become eligible through a prefix. Fixture `DEMO-001` represents a synthetic scenario/zone identifier only; `122002` is demo serviceable, `400001` demo outside coverage, and `110024` demo covered with no slots. Keep synthetic geographic assertions and availability in isolated demo/test datasets.

Serialize all mapping edits on the company's configuration row. Under that lock, reject overlapping effective mappings before insert/update and bump the configuration revision in the same transaction. Final booking/hold validation takes the same lock before zone and capacity locks, preventing a pause from racing through an old eligibility check. A PostgreSQL exclusion constraint using `btree_gist` may strengthen interval enforcement if extension approval is available; the design must not silently depend on that extension. Test overlapping concurrent admin writes even without it.

## Capacity and lifecycle

Capacity is initially one request per window; product/crew/volume weights require separate approved rules. Missing capacity rows mean no offered window, not unlimited capacity. A scoped atomic update increments reserved only if the slot is open, unexpired and has capacity, followed by hold/request/outbox/audit writes in the same transaction. Unique order/hold keys prevent retries from consuming capacity twice. Cancellation, definitive upstream failure and expiry release capacity transactionally once; uncertain upstream state stays held for reconciliation. Idempotent release cannot decrement twice. Never reduce total below reserved or delete a slot referenced by a hold.

Exact stock and slot atomicity is possible only inside the local mock database. Live Odoo stock requires an external reservation workflow with durable references and compensation; see [checkout flow](../flows/location-aware-checkout.md).

## Migration, verification and rollback

LOC-03 revision `0003_location_preferences` adds one table with composite primary key `(company_id, subject)`, a six-digit PIN, positive revision and timestamp. Authenticated demo identities have owner-specific rows. Guest subjects use the digest of a random session identifier held in an HTTP-only cookie. The initial insert is unique per subject. Further writes condition on the expected revision, and concurrent or stale submissions return 409. Reads resolve the PIN against current serviceability. Application rollback retains populated preferences.

LOC-01 adds reference/zone/audit tables, LOC-03 preferences, LOC-04 capacity/context/holds, and LOC-05 interests. Rehearse each upgrade on a fresh database and isolated restored copy. Compare all eight original table definitions and original rows, unique/FK constraints and migration histories. Test failed import rollback, concurrent writes, effective-date boundaries, missing source, disabled zone, ambiguous mapping and idempotent reference activation. Existing whole-schema equality tools need an explicit comparison of the frozen legacy subset plus the expected additive schema, rather than falsely requiring no new tables.

Keep feature flags off while migrating. Legacy runtime may read its original tables; only FastAPI owns new feature writes, and event version dispatch must prevent BullMQ from claiming unsupported delivery events. New production migration is a separate approval. Disable feature writes before rollback, reconcile pending holds and upstream effects, and restore the prior compatible application with new tables retained. Downgrade may drop only unreferenced new data in disposable databases; block destructive downgrade of accepted orders, references or audit evidence. Take an approved backup before any production schema action.
