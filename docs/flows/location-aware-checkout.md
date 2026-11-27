# Location-aware checkout

Planned LOC-04 flow. Preserve the existing demo request receipt; no payment, slot or Odoo reservation is implemented by LOC-00.

1. Require an authenticated customer and a confirmed PIN. Validate full supported address fields and country/city/state/PIN consistency on the server. Detection does not verify the customer's address; missing required operational verification blocks confirmation.
2. Build a versioned delivery quote from owned cart, revision, confirmed PIN, eligible zone, slot and existing price rules. Bind delivery context into the signed payload and record its expiry. No quote reserves a unit or slot.
3. Customer submits the signed quote, address, slot and consent with the existing customer-scoped UUID idempotency mechanism. Same key/same intent returns the original accepted request; changed intent under the same key conflicts.
4. In a SERIALIZABLE transaction, recheck quote ownership/expiry/signature/cart revision/pricing, lock company configuration and relevant zone/membership, and verify fresh eligibility. Lock capacity and inventory rows in a consistent order for the local mock ERP. Allocate capacity conditionally and create the hold/request/outbox/audit atomically; any failure rolls back all local writes.
5. Return a request receipt with independent address, serviceability, capacity, stock, payment and order states. Do not describe a hold or accepted request as paid or confirmed.
6. For live stock, outbox processing asks Odoo for the reservation by a durable idempotent external reference. PostgreSQL cannot atomically commit an Odoo reservation or payment. Reconcile uncertain upstream results before retry; use compensating releases for definitive failure.
7. Verified payment must come from the approved provider verification contract, with amount, currency, ownership and deduplicated event checks. It cannot come from a browser success callback. Until that contract is verified, live order confirmation remains disabled.
8. Confirm a booking only after required address, stock, slot and payment evidence exists. Send Atlas/PMS work through their approved handoff and outbox boundaries. Definitive cancellation/failure/expiry releases local capacity once; unknown upstream state remains held for manual reconciliation.

On changed PIN, zone pause, expired quote, unavailable item, no slot or capacity conflict, return a recoverable structured error with a refresh/change action. Retain cart lines, variant and tenure. Concurrent requests for the last slot must produce at most one hold. Idempotent submission/release/replay must not multiply holds, external reservations or charges.

Legacy BullMQ/Celery demo handling must never claim new delivery events. No worker ownership changes occur in this feature without migration cutover approval. See [contracts](../architecture/location-serviceability-lld.md) and [migration constraints](../architecture/serviceability-database.md).
