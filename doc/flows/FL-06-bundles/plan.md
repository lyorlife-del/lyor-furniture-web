# FL-06 — Fixed room bundles

Audience: guest/customer.

Goal: Overlapping bundle/individual demand is aggregated; one unavailable component blocks a quote.

Implementation areas: demo catalog, demandFor, ProductDetails.

## Ordered steps

| Step | Outcome | Phase |
|---|---|---|
| [ST-01](steps/ST-01.md) | Define bundle component mappings | PH-02 |
| [ST-02](steps/ST-02.md) | Display included pieces and quantities | PH-02 |
| [ST-03](steps/ST-03.md) | Validate every mandatory component | PH-02 |
| [ST-04](steps/ST-04.md) | Calculate the combined quote | PH-02 |
| [ST-05](steps/ST-05.md) | Preserve components through fulfilment | PH-04 |

## Reference evidence

Combo categories and combined prices observed; internal component reservation unknown. See the [REA register](../../evidence/furlenco-inspection.md). These observations guide an original design, not competitor backend assumptions.

## Acceptance

Overlapping bundle/individual demand is aggregated; one unavailable component blocks a quote. Evidence must cover failure/recovery and owner/role denial, not only a happy path. Refer to [verification](../../verification.md) for actual results and scope limits.
