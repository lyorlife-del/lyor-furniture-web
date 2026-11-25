# Legacy API compatibility matrix

Baseline commit `fb7d266`. Paths below are relative to `/api/v1`. The [committed OpenAPI](../../packages/api-contracts/openapi.json), [DTO source](../../apps/api/src/common/dto.ts), and observed responses govern parity. The [legacy contract notes](../../doc/contracts/marketplace.md) describe the public fields and compatibility edges.

| Operation | Inputs and access | Expected result and behaviors |
| --- | --- | --- |
| GET /health | Public | 200 process health |
| GET /health/ready | Public | 200 when PostgreSQL answers, 503 otherwise |
| GET /catalog | Public, city, mode, category, search, sort, page | 200 paginated public products with stable ordering, 400 for invalid query |
| GET /products/{slug} | Public, listing slug | 200 public product, 404 missing or ineligible |
| GET /bundles | Public | 200 list of eligible bundles |
| GET /cities | Public | 200 list of demo cities |
| GET /serviceability | Public, six-digit PIN | 200 deliverability and message, 400 invalid PIN |
| GET /cart/{id} | Cart UUID capability, owner auth after claim | 200 persisted cart and public product summaries, 404 missing or unowned, 400 malformed reference |
| PUT /cart | Cart UUID, city, revision, up to 25 validated lines, owner auth after claim | 200 saved or claimed cart with new revision and summaries, 400 invalid payload, 409 stale revision |
| POST /quotes | Cart UUID, PIN, matching owner where required | 201 expiring signed quote and price breakdown, 409 unsupported PIN or unavailable configuration |
| POST /orders | Identity, UUID idempotency header, owned signed quote, address and consent | 201 order intent or identical retry, 400 invalid input, 404 wrong owner, 409 conflict, expiry or repricing |
| GET /me/orders | Identity | 200 owner-filtered array, 401 without demo identity |
| GET /me/orders/{id} | Identity, order ID | 200 owner projection, 404 for other owner or missing |
| POST /b2b/enquiries | UUID idempotency header, consent, contact, up to 10 validated sites | 201 demo receipt, 400 invalid input, 409 same key with changed request |
| GET /admin/catalog | Catalogue or admin role | 200 staff catalogue, 403 for customer |
| PATCH /admin/catalog/{id} | Catalogue or admin role, boolean published | 200 updated listing with audit, 404 missing, 409 inactive publication |
| GET /admin/exceptions | Admin role | 200 bounded outbox exception list, 403 for catalogue role |
| POST /admin/exceptions/{id}/replay | Admin role, failed event ID | 201 reset event with audit, 409 nonfailed or unknown event |

Verify the legacy error envelope containing `statusCode` and `message`, including string and validation-array variants. Exercise rejection of unknown body fields, input coercion where used by the legacy DTO, same-origin BFF mutations, role denials, pagination, and status transitions. The web-local `/api/session` route remains in Next.js.

The [legacy probe results](fixtures/legacy-api-probes.json) record observed HTTP statuses, top-level response fields, and error messages from the isolated Phase 00 API.

For quotes and idempotency, run both implementations against the [synthetic reference vector](fixtures/legacy-signing.json) and expand coverage for nulls, Unicode, array ordering, reordered object keys, timestamp formatting, and changed requests. Confirm cross-runtime quotes remain valid during the rollback window.

The [Phase 03 report](phase-03-api-parity.md) records the differential comparison. Use the [FastAPI candidate spec](../../packages/api-contracts/fastapi-openapi.json) to compare typed inputs and responses against the legacy baseline.
