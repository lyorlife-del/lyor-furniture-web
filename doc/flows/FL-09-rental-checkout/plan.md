# FL-09 — Rental checkout

Audience: guest/customer.

Goal: Identical repeated requests yield one order/outbox record; modified idempotency reuse conflicts; no false paid state.

Implementation areas: OrderModule, checkout, OutboxEvent.

## Ordered steps

| Step | Outcome | Phase |
|---|---|---|
| [ST-01](steps/ST-01.md) | Validate identity address and serviceability | PH-03 |
| [ST-02](steps/ST-02.md) | Accept the current quote and terms | PH-03 |
| [ST-03](steps/ST-03.md) | Create an idempotent order intention | PH-03 |
| [ST-04](steps/ST-04.md) | Commit the transactional outbox event | PH-03 |
| [ST-05](steps/ST-05.md) | Present pending failure and recovery states | PH-03 |
| [ST-06](steps/ST-06.md) | Enable approved authoritative reservation | PH-04 |

## Reference evidence

Reference checkout stopped at phone authentication. Idempotency and reservation internals unknown. See the [REA register](../../evidence/furlenco-inspection.md). These observations guide an original design, not competitor backend assumptions.

The [storefront readiness verification](../../evidence/storefront-readiness.md) records the browser checks for the updated steps below.

## Acceptance

Identical repeated requests yield one order/outbox record; modified idempotency reuse conflicts; no false paid state. Evidence must cover failure/recovery and owner/role denial, not only a happy path. Refer to [verification](../../verification.md) for actual results and scope limits.
