# FL-13 — Staff administration and recovery

Audience: authorized staff.

Goal: Customer access is denied; inactive SKU publication fails; successful staff changes and replay are audited.

Implementation areas: AdminModule, admin page.

## Ordered steps

| Step | Outcome | Phase |
|---|---|---|
| [ST-01](steps/ST-01.md) | Enforce staff role guards | PH-03 |
| [ST-02](steps/ST-02.md) | Draft and edit public listings | PH-03 |
| [ST-03](steps/ST-03.md) | Publish only eligible SKUs | PH-03 |
| [ST-04](steps/ST-04.md) | Manage approved policies and zones | PH-04 |
| [ST-05](steps/ST-05.md) | Inspect exceptions and safely replay | PH-03 |
| [ST-06](steps/ST-06.md) | Audit staff mutations | PH-03 |

## Reference evidence

Competitor staff interfaces are not publicly observable. See the [REA register](../../evidence/furlenco-inspection.md). These observations guide an original design, not competitor backend assumptions.

## Acceptance

Customer access is denied; inactive SKU publication fails; successful staff changes and replay are audited. Evidence must cover failure/recovery and owner/role denial, not only a happy path. Refer to [verification](../../verification.md) for actual results and scope limits.
