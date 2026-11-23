# Marketplace contract baseline

Base: `/api/v1`. Canonical generated OpenAPI: `packages/api-contracts/openapi.json`. Run `npm run contracts` and check the generated diff when modifying DTOs/routes. Browser mutations go through the same-origin Next.js BFF.

| Method/path | Behavior |
|---|---|
| GET /cities | Synthetic Noida demo city |
| GET /serviceability?pin= | Six-digit format, explicit deliverable flag |
| GET /catalog | city, mode, category, q, sort, page; stable pagination; no raw stock/SKU |
| GET /products/:slug; /bundles | Public eligible listing/combination |
| GET /cart/:id; PUT /cart | UUID capability for guest, owner required after claim, and revision conflict 409. Both return public product summaries. |
| POST /quotes | Cart capability/ownership and supported PIN; quote expiry 15 minutes |
| POST /orders | Demo identity, current owned quote, consent, address and UUID Idempotency-Key |
| GET /me/orders; /me/orders/:id | Owner-only projection; no false paid state |
| POST /b2b/enquiries | Validated multi-site fictional data, consent and idempotent local receipt |
| GET/PATCH /admin/catalog | Staff access, active-SKU publication gate and audit |
| GET /admin/exceptions; POST /admin/exceptions/:id/replay | Admin-only failed-event replay and audit |
| GET /health; /health/ready | Process liveness / actual PostgreSQL readiness |

## Errors and compatibility

The cart response adds a `products` array. Each summary has `id`, `slug`, `name`, `image`, `monthlyPaise`, and `purchasePaise`. Only eligible public listings for the cart’s city appear. An unavailable listing may be absent from the array while its cart line remains removable.

Catalog categories include `accessories`. A purchase price of zero means no purchase price is configured. Buy catalog results exclude those listings, and the pricing service rejects purchases for them. A listing may have an empty image path when no photo is available.

400 malformed/extra request fields; 401 absent identity; 403 wrong role; 404 missing/not-owned resource; 409 stale/conflicting/unavailable state; 429 local rate limit. PII is never written into application log statements. No real external endpoint is specified here.

## Deferred boundaries

Production OIDC, payment webhooks, Atlas/PMS events, live Odoo methods, return eligibility and financial settlements require separate verified contract revisions. No placeholder route claims live behavior.
