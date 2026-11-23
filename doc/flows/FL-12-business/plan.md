# FL-12 — Multi-site business enquiries

Audience: business customer.

Goal: A multi-site enquiry preserves every site and quantity; the same request key returns the same receipt.

Implementation areas: BusinessModule, business page.

## Ordered steps

| Step | Outcome | Phase |
|---|---|---|
| [ST-01](steps/ST-01.md) | Capture contact and business details | PH-03 |
| [ST-02](steps/ST-02.md) | Capture multiple sites and quantities | PH-03 |
| [ST-03](steps/ST-03.md) | Validate consent and deduplicate requests | PH-03 |
| [ST-04](steps/ST-04.md) | Return a persisted local receipt | PH-03 |
| [ST-05](steps/ST-05.md) | Verify the CRM handoff | PH-04 |
| [ST-06](steps/ST-06.md) | Link property and qualification references | PH-05 |

## Reference evidence

Public business form inspected without submission. Multi-site capture is an independent LYOR extension. See the [REA register](../../evidence/furlenco-inspection.md). These observations guide an original design, not competitor backend assumptions.

## Acceptance

A multi-site enquiry preserves every site and quantity; the same request key returns the same receipt. Evidence must cover failure/recovery and owner/role denial, not only a happy path. Refer to [verification](../../verification.md) for actual results and scope limits.
