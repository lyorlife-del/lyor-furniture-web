# Local recovery and production rollout gates

## API or database unavailable

Check /api/v1/health then /api/v1/health/ready. Liveness is not database readiness. Start only the selected local database; do not reset data to repair a connection. A product page/catalog shows an error state rather than fabricated availability.

## Stale quote or cart conflict

Refresh the cart and request a new quote. Review the revised total before submitting. A quote is owned by one demo identity and includes the cart revision and PIN. Do not replace a failed request with a fabricated success state.

## Pending outbox

Confirm Redis and the separate worker are running. A pending request has not reserved anything. Dispatcher leases recover after expiry; stable queue IDs plus idempotent DB effects tolerate repeat delivery. Set DEMO_ODOO_OUTAGE=true only in the worker's local test environment to simulate failure. Five attempts use exponential backoff. Inspect failed events through the administrator demo and request an audited replay after resolving the cause.

## Mock reservation conflict

If two requests compete for the last unit, only one can reserve. The other must show failure; do not restore synthetic stock except through an explicit demo-data maintenance action. Seed is idempotent and does not reset existing quantities/publication choices.

## Shutdown

Stop owned web/API/worker terminals with Ctrl+C. Stop the optional local PostgreSQL terminal with Ctrl+C. Docker users can run npm run infra:down; volumes are preserved. Never delete .data or database volumes as an automatic recovery step.

## Production gate

There is no production-ready deployment in this change. Before deployment: approve managed OIDC, real policies and privacy, verified Odoo/Atlas/PMS contracts and permissions, atomic ERP reservation, real payment reconciliation, GCS/telemetry, private network/database/Redis setup, worker CPU/minimum instance settings, reviewed migrations, backup restoration and backward-compatible rollback. Local fake identity/startup guards intentionally reject a production environment.
