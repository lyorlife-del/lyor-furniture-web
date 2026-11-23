# FL-01 — Location and serviceability

Audience: guest/customer.

Goal: A supported demo PIN is accepted; malformed and unsupported PINs never permit checkout.

Implementation areas: ServiceabilityModule, Header, cart.

## Ordered steps

| Step | Outcome | Phase |
|---|---|---|
| [ST-01](steps/ST-01.md) | Select the demo city | PH-02 |
| [ST-02](steps/ST-02.md) | Validate delivery PIN | PH-02 |
| [ST-03](steps/ST-03.md) | Persist the selected area | PH-02 |
| [ST-04](steps/ST-04.md) | Invalidate affected quote assumptions | PH-02 |
| [ST-05](steps/ST-05.md) | Offer unsupported-area enquiry | PH-02 |

## Reference evidence

City and PIN UI observed; server rules and unsupported-path behavior were not verified on Furlenco. See the [REA register](../../evidence/furlenco-inspection.md). These observations guide an original design, not competitor backend assumptions.

The [storefront readiness verification](../../evidence/storefront-readiness.md) records the browser checks for the updated steps below.

## Acceptance

A supported demo PIN is accepted; malformed and unsupported PINs never permit checkout. Evidence must cover failure/recovery and owner/role denial, not only a happy path. Refer to [verification](../../verification.md) for actual results and scope limits.
