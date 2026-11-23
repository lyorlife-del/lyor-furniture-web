# FL-14 — Payments and recurring billing

Audience: customer and authorized operational staff.

Goal: Forged/replayed callbacks cannot mark orders paid; uncertain collection stays pending until reconciled.

Implementation areas: future PaymentModule.

## Ordered steps

| Step | Outcome | Phase |
|---|---|---|
| [ST-01](steps/ST-01.md) | Define the approved gateway contract | PH-05 |
| [ST-02](steps/ST-02.md) | Create server-priced payment intentions | PH-05 |
| [ST-03](steps/ST-03.md) | Verify and deduplicate callbacks | PH-05 |
| [ST-04](steps/ST-04.md) | Reconcile authoritative accounting | PH-05 |
| [ST-05](steps/ST-05.md) | Handle recurring collection and exceptions | PH-05 |
| [ST-06](steps/ST-06.md) | Present verified invoices and payment status | PH-05 |

## Reference evidence

Payment methods are described in help articles only; no transaction was attempted. See the [REA register](../../evidence/furlenco-inspection.md). These observations guide an original design, not competitor backend assumptions.

## Acceptance

Forged/replayed callbacks cannot mark orders paid; uncertain collection stays pending until reconciled. Evidence must cover failure/recovery and owner/role denial, not only a happy path. Refer to [verification](../../verification.md) for actual results and scope limits.
