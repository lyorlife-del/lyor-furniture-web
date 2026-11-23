# PH-05 — Operational commerce

Status: Planned

Approved payments/KYC, fulfilment, billing, service, returns, quarantine/QC and settlement.

Prerequisite: PH-04 accepted, except explicitly independent documentation or contract discovery.

## Included steps

- [FL-07/ST-05 — Add approved KYC](../../flows/FL-07-identity/steps/ST-05.md)
- [FL-10/ST-05 — Add verified payment and invoice visibility](../../flows/FL-10-purchase-checkout/steps/ST-05.md)
- [FL-12/ST-06 — Link property and qualification references](../../flows/FL-12-business/steps/ST-06.md)
- [FL-14/ST-01 — Define the approved gateway contract](../../flows/FL-14-payments/steps/ST-01.md)
- [FL-14/ST-02 — Create server-priced payment intentions](../../flows/FL-14-payments/steps/ST-02.md)
- [FL-14/ST-03 — Verify and deduplicate callbacks](../../flows/FL-14-payments/steps/ST-03.md)
- [FL-14/ST-04 — Reconcile authoritative accounting](../../flows/FL-14-payments/steps/ST-04.md)
- [FL-14/ST-05 — Handle recurring collection and exceptions](../../flows/FL-14-payments/steps/ST-05.md)
- [FL-14/ST-06 — Present verified invoices and payment status](../../flows/FL-14-payments/steps/ST-06.md)
- [FL-15/ST-01 — Receive eligible confirmed-order events](../../flows/FL-15-delivery/steps/ST-01.md)
- [FL-15/ST-02 — Create one logical Atlas task](../../flows/FL-15-delivery/steps/ST-02.md)
- [FL-15/ST-03 — Schedule delivery through verified contracts](../../flows/FL-15-delivery/steps/ST-03.md)
- [FL-15/ST-04 — Reference operational work evidence](../../flows/FL-15-delivery/steps/ST-04.md)
- [FL-15/ST-05 — Update separate delivery projections](../../flows/FL-15-delivery/steps/ST-05.md)
- [FL-15/ST-06 — Recover rescheduling and delivery failures](../../flows/FL-15-delivery/steps/ST-06.md)
- [FL-16/ST-02 — Enforce company and site access](../../flows/FL-16-property/steps/ST-02.md)
- [FL-16/ST-03 — Map physical-unit assignments](../../flows/FL-16-property/steps/ST-03.md)
- [FL-16/ST-04 — Reconcile mapping divergence](../../flows/FL-16-property/steps/ST-04.md)
- [FL-16/ST-05 — Expose authorized assignment references](../../flows/FL-16-property/steps/ST-05.md)
- [FL-17/ST-01 — Submit an owned-order support request](../../flows/FL-17-support/steps/ST-01.md)
- [FL-17/ST-02 — Evaluate service eligibility](../../flows/FL-17-support/steps/ST-02.md)
- [FL-17/ST-03 — Create the operational service task](../../flows/FL-17-support/steps/ST-03.md)
- [FL-17/ST-04 — Display authoritative progress](../../flows/FL-17-support/steps/ST-04.md)
- [FL-17/ST-05 — Record resolution without financial side effects](../../flows/FL-17-support/steps/ST-05.md)
- [FL-18/ST-01 — Check contract eligibility](../../flows/FL-18-returns/steps/ST-01.md)
- [FL-18/ST-02 — Quote renewal or accept a return request](../../flows/FL-18-returns/steps/ST-02.md)
- [FL-18/ST-03 — Create a pickup task](../../flows/FL-18-returns/steps/ST-03.md)
- [FL-18/ST-04 — Record inbound receipt](../../flows/FL-18-returns/steps/ST-04.md)
- [FL-18/ST-05 — Quarantine the returned unit](../../flows/FL-18-returns/steps/ST-05.md)
- [FL-18/ST-06 — Route to inspection](../../flows/FL-18-returns/steps/ST-06.md)
- [FL-19/ST-01 — Record OK DAM or PD condition](../../flows/FL-19-inspection/steps/ST-01.md)
- [FL-19/ST-02 — Require damage notes and evidence](../../flows/FL-19-inspection/steps/ST-02.md)
- [FL-19/ST-03 — Review repair or hold decisions](../../flows/FL-19-inspection/steps/ST-03.md)
- [FL-19/ST-04 — Authorize QC release](../../flows/FL-19-inspection/steps/ST-04.md)
- [FL-19/ST-05 — Reconcile availability through Odoo](../../flows/FL-19-inspection/steps/ST-05.md)
- [FL-19/ST-06 — Settle deposit and refund through finance](../../flows/FL-19-inspection/steps/ST-06.md)

## Exit

All included steps have passing evidence or an explicitly documented scope exception. See [acceptance](acceptance.md) and [verification](../../verification.md). Live phases cannot pass with mock integration evidence.
