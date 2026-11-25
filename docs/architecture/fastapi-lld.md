# FastAPI low-level design

Use FastAPI routers for existing paths and keep request and response aliases compatible with camelCase fields. Use Pydantic v2 validators and centralized exception mapping to reproduce observed empty, invalid, conflict, unauthorized, forbidden, and not-found responses. Preserve status-code and message shapes used by the API client. Keep the Next.js session endpoint in Next.js.

Use scoped async SQLAlchemy sessions. Validate quote ownership, revision, PIN, price, expiry, and HMAC before order creation. Keep the order, outbox event, and audit write in the same transaction. Preserve the owner-scoped idempotency key and stored request hash. Use the Node reference inputs and expected outputs to test recursive key ordering, array order, Unicode, nulls, ISO timestamps, and integer-paise values in both runtimes.

Keep the existing TypeScript contracts in use until differential tests pass. See the [compatibility matrix](../implementation/api-compatibility.md).

The [Phase 03 verification](../implementation/phase-03-api-parity.md) covers all 18 routed operations. A candidate OpenAPI and generated TypeScript schema can be adopted independently of the legacy default. The order transaction uses PostgreSQL serializable isolation and repeats the idempotency lookup after a uniqueness or serialization conflict. Authorization and role denials precede operations that read or mutate protected records.
