# FL-10 — Purchase checkout

Audience: guest/customer.

Goal: Purchase lines use one-time prices; backend revalidates the quote and never treats submission as payment.

Implementation areas: PricingModule, OrderModule, checkout.

## Ordered steps

| Step | Outcome | Phase |
|---|---|---|
| [ST-01](steps/ST-01.md) | Validate one-time pricing and eligibility | PH-03 |
| [ST-02](steps/ST-02.md) | Reuse shared checkout infrastructure | PH-03 |
| [ST-03](steps/ST-03.md) | Create the sale intention | PH-03 |
| [ST-04](steps/ST-04.md) | Project verified ERP outcome | PH-04 |
| [ST-05](steps/ST-05.md) | Add verified payment and invoice visibility | PH-05 |

## Reference evidence

Purchase PDP and condition labels observed; purchase completion not exercised. See the [REA register](../../evidence/furlenco-inspection.md). These observations guide an original design, not competitor backend assumptions.

The [storefront readiness verification](../../evidence/storefront-readiness.md) records the browser checks for the updated steps below.

## Acceptance

Purchase lines use one-time prices; backend revalidates the quote and never treats submission as payment. Evidence must cover failure/recovery and owner/role denial, not only a happy path. Refer to [verification](../../verification.md) for actual results and scope limits.
