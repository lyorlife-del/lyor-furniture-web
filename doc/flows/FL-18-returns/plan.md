# FL-18 — Renewal and returns

Audience: customer and authorized operational staff.

Goal: Returned stock is unavailable until the separate QC release gate passes.

Implementation areas: future LifecycleModule.

## Ordered steps

| Step | Outcome | Phase |
|---|---|---|
| [ST-01](steps/ST-01.md) | Check contract eligibility | PH-05 |
| [ST-02](steps/ST-02.md) | Quote renewal or accept a return request | PH-05 |
| [ST-03](steps/ST-03.md) | Create a pickup task | PH-05 |
| [ST-04](steps/ST-04.md) | Record inbound receipt | PH-05 |
| [ST-05](steps/ST-05.md) | Quarantine the returned unit | PH-05 |
| [ST-06](steps/ST-06.md) | Route to inspection | PH-05 |

## Reference evidence

Help describes app-based renewal/return and pickup scheduling; authenticated workflow unverified. See the [REA register](../../evidence/furlenco-inspection.md). These observations guide an original design, not competitor backend assumptions.

## Acceptance

Returned stock is unavailable until the separate QC release gate passes. Evidence must cover failure/recovery and owner/role denial, not only a happy path. Refer to [verification](../../verification.md) for actual results and scope limits.
