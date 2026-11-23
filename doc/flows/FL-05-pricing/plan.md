# FL-05 — Pricing and quotations

Audience: guest/customer.

Goal: Integer-paise totals are tested; signatures survive JSONB key ordering; expired, stale and tampered quotes cannot create orders.

Implementation areas: pricing domain, Quote, OrderService.

## Ordered steps

| Step | Outcome | Phase |
|---|---|---|
| [ST-01](steps/ST-01.md) | Version synthetic pricing policies | PH-02 |
| [ST-02](steps/ST-02.md) | Calculate server-side charge breakdown | PH-02 |
| [ST-03](steps/ST-03.md) | Issue signed expiring quotes | PH-02 |
| [ST-04](steps/ST-04.md) | Reject stale or tampered quotations | PH-03 |
| [ST-05](steps/ST-05.md) | Require acceptance after repricing | PH-03 |
| [ST-06](steps/ST-06.md) | Approve live commercial policies | PH-06 |

## Reference evidence

Public totals observed; signing, expiry and repricing mechanics unknown. See the [REA register](../../evidence/furlenco-inspection.md). These observations guide an original design, not competitor backend assumptions.

The [storefront readiness verification](../../evidence/storefront-readiness.md) records the browser checks for the updated steps below.

## Acceptance

Integer-paise totals are tested; signatures survive JSONB key ordering; expired, stale and tampered quotes cannot create orders. Evidence must cover failure/recovery and owner/role denial, not only a happy path. Refer to [verification](../../verification.md) for actual results and scope limits.
