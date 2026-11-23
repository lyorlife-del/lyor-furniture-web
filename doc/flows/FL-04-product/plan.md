# FL-04 — Product configuration

Audience: guest/customer.

Goal: Configuration reaches the cart intact, invalid variants fail server validation, and displayed indicative prices are never checkout authority.

Implementation areas: ProductDetails, PricingModule.

## Ordered steps

| Step | Outcome | Phase |
|---|---|---|
| [ST-01](steps/ST-01.md) | Display gallery and specifications | PH-02 |
| [ST-02](steps/ST-02.md) | Select transaction mode variant and quantity | PH-02 |
| [ST-03](steps/ST-03.md) | Select rental tenure and dates | PH-02 |
| [ST-04](steps/ST-04.md) | Check product and bundle eligibility | PH-02 |
| [ST-05](steps/ST-05.md) | Request the authoritative quotation | PH-02 |

## Reference evidence

Variant selection changed the reference product URL and price; tenure/date selection and signed quote issuance were unverified. See the [REA register](../../evidence/furlenco-inspection.md). These observations guide an original design, not competitor backend assumptions.

The [storefront readiness verification](../../evidence/storefront-readiness.md) records the browser checks for the updated steps below.

## Acceptance

Configuration reaches the cart intact, invalid variants fail server validation, and displayed indicative prices are never checkout authority. Evidence must cover failure/recovery and owner/role denial, not only a happy path. Refer to [verification](../../verification.md) for actual results and scope limits.
