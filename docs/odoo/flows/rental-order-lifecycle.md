# Rental order lifecycle flow

| Step | Owner | Evidence |
| --- | --- | --- |
| Browse and quote | LYOR | Variant, serviceable PIN, dates, effective rate and quote expiry |
| Submit | LYOR | Order intent, scoped idempotency key and committed outbox event |
| Verify and reserve | Odoo through the approved adapter | Scoped availability, approved price and one confirmed commercial reference |
| Deliver or install | Atlas | Fulfilment task reference and status mapped to the customer order |
| Assign physical asset when applicable | PMS | Approved property or room and asset reference |
| Return, inspect and release | Atlas and Odoo | Operational evidence, corresponding inventory movement and available stock update |
| Close commercial records | Odoo | Accounting and invoice state and reconciled payment reference when approved |

A pricing change causes re-quotation. If stock is unavailable, leave the request unconfirmed and return the contract's availability result. If Odoo times out after a submission, reconcile by the durable reference before allowing any retry. Replaying a processed delivery or return event must preserve one side effect.

[Rental and integration architecture](../architecture/rental-and-integration.md) · [Rental staging checklist](../implementation/03-rental-setup.md)
