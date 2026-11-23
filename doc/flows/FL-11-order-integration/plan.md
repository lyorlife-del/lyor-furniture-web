# FL-11 — Order integration and customer portal

Audience: guest/customer.

Goal: Repeated mock execution reserves once; last-unit concurrency produces one winner; payment remains uncollected.

Implementation areas: mock-odoo, worker, OrderModule.

## Ordered steps

| Step | Outcome | Phase |
|---|---|---|
| [ST-01](steps/ST-01.md) | Implement the local mock ERP adapter | PH-03 |
| [ST-02](steps/ST-02.md) | Dispatch durable integration jobs | PH-03 |
| [ST-03](steps/ST-03.md) | Persist external mappings | PH-03 |
| [ST-04](steps/ST-04.md) | Expose customer-safe status tracks | PH-03 |
| [ST-05](steps/ST-05.md) | Verify Odoo methods and company permissions | PH-04 |
| [ST-06](steps/ST-06.md) | Reconcile ambiguous failures and duplicates | PH-04 |

## Reference evidence

No private ERP integration or authenticated customer timeline could be observed. See the [REA register](../../evidence/furlenco-inspection.md). These observations guide an original design, not competitor backend assumptions.

The [storefront readiness verification](../../evidence/storefront-readiness.md) records the browser checks for the updated steps below.

## Acceptance

Repeated mock execution reserves once; last-unit concurrency produces one winner; payment remains uncollected. Evidence must cover failure/recovery and owner/role denial, not only a happy path. Refer to [verification](../../verification.md) for actual results and scope limits.
