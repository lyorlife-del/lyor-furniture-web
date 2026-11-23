# FL-19 — Inspection and settlement

Audience: customer and authorized operational staff.

Goal: DAM/PD require evidence and cannot relist; QC release and financial settlement require distinct permissions.

Implementation areas: future InspectionModule, future FinanceModule.

## Ordered steps

| Step | Outcome | Phase |
|---|---|---|
| [ST-01](steps/ST-01.md) | Record OK DAM or PD condition | PH-05 |
| [ST-02](steps/ST-02.md) | Require damage notes and evidence | PH-05 |
| [ST-03](steps/ST-03.md) | Review repair or hold decisions | PH-05 |
| [ST-04](steps/ST-04.md) | Authorize QC release | PH-05 |
| [ST-05](steps/ST-05.md) | Reconcile availability through Odoo | PH-05 |
| [ST-06](steps/ST-06.md) | Settle deposit and refund through finance | PH-05 |

## Reference evidence

Damage/deposit policies observed as public claims; inspection and settlement internals unknown. See the [REA register](../../evidence/furlenco-inspection.md). These observations guide an original design, not competitor backend assumptions.

## Acceptance

DAM/PD require evidence and cannot relist; QC release and financial settlement require distinct permissions. Evidence must cover failure/recovery and owner/role denial, not only a happy path. Refer to [verification](../../verification.md) for actual results and scope limits.
