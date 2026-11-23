# FL-16 — PMS and physical-unit assignment

Audience: customer and authorized operational staff.

Goal: Cross-site access is denied and a mapping conflict remains visible until authorized resolution.

Implementation areas: future PMS adapter.

## Ordered steps

| Step | Outcome | Phase |
|---|---|---|
| [ST-01](steps/ST-01.md) | Verify property site and room contracts | PH-04 |
| [ST-02](steps/ST-02.md) | Enforce company and site access | PH-05 |
| [ST-03](steps/ST-03.md) | Map physical-unit assignments | PH-05 |
| [ST-04](steps/ST-04.md) | Reconcile mapping divergence | PH-05 |
| [ST-05](steps/ST-05.md) | Expose authorized assignment references | PH-05 |

## Reference evidence

No public competitor evidence; this is LYOR-specific architecture. See the [REA register](../../evidence/furlenco-inspection.md). These observations guide an original design, not competitor backend assumptions.

## Acceptance

Cross-site access is denied and a mapping conflict remains visible until authorized resolution. Evidence must cover failure/recovery and owner/role denial, not only a happy path. Refer to [verification](../../verification.md) for actual results and scope limits.
