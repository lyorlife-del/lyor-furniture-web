# Verification record — 2026-11-23

The [storefront readiness verification](evidence/storefront-readiness.md) records the later browser recheck, REA replay, and performance matrix.

## Current results

| Check | Result | Evidence |
|---|---|---|
| API TypeScript compilation | Passed | npm run build -w @lyor/api |
| Frontend production build | Passed after generated contract-type integration | Next.js compiled all routes |
| Frontend ESLint | Passed | npm run lint -w @lyor/web |
| API unit tests | 8 passed | 5 pricing tests plus 3 identity-boundary tests |
| Real PostgreSQL/Fastify integration | 7 passed | Isolated PG18 test DB: ownership, DTO rejection, stale/tampered/expired quotes, idempotency/outbox, last-unit reservation, staff publication/audit and multi-site receipt |
| Frontend component tests | 2 passed | Vitest/React Testing Library price breakdown disclosure |
| Browser journeys | 6 passed | Chrome desktop/mobile home, search/sort persistence, unsupported PIN, guest→owned quote→pending order, multi-site receipt, and origin/unknown-identity rejection |
| Step documentation links | Passed | 156 Markdown documents checked, including 20 flows and 109 canonical steps |
| Shared contract types and static checks | Passed | NestJS OpenAPI generates the TypeScript client/types consumed by frontend domain models; TypeScript and frontend ESLint pass |
| Actual Redis/BullMQ execution/recovery | Not run locally | Docker daemon/Redis unavailable; worker code is present but phase exit remains open |
| CI, Docker image, deployment, live adapters | Not run / not enabled | Configuration only; no external systems modified |

## Browser observations and fixes

- Home and 375px mobile navigation had no horizontal overflow in the test.
- Browser testing exposed Next's internal hostname differing from the public loopback origin. BFF writes now validate configured WEB_ORIGIN, with no relaxation to arbitrary hosts.
- Checkout status values have separate readable elements for order/payment/stock/delivery.
- Generated contract types caught an unrestricted frontend tenure number; selection now narrows to 3/6/12.
- Final review hardened identity dictionaries against inherited object-property keys; unit and browser regression tests verify rejection.
- Initial infrastructure errors are recorded in the session, corrected before acceptance. Swagger UI assets are disabled in Jest only; the real local API serves interactive documentation.

## Deferred P0 requirements

Rental start dates/slots; first-visit city modal and configurable multi-city behavior; actual multiple variants; existing-account cart merge; full CMS editing/media approval; CRM handoff; external component mappings; real Redis worker recovery. Production operational flows remain planned, not complete.

## Evidence location

Local screenshots: ignored .data/screenshots/home-desktop.png and home-mobile.png. Browser failures/traces are ignored test-results artifacts. Phase/step records link here and do not claim all 109 steps are implemented.
