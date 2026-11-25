# Phase 07 — Production readiness

## Entry

Phase 06 accepted, parity complete, rollback procedure approved, and production actions separately authorized.

## Implementation

Record the cutover and rollback runbook under `docs/implementation/`. Rehearse changing proxy routing, business-write ownership, and dispatcher ownership on staging. Retain tagged legacy artifacts and migration history. Remove legacy backend source and active scripts only after parity, rollback approval, and the rollback window.

## Acceptance and rollback

Demonstrate a single authoritative API writer, one active dispatcher, inventory of outstanding work, and a reversible switch. Verify application, schema, worker, and frontend results and get explicit approvals for production migration, worker cutover, and deployment.

Pause affected writes on a critical failure. Restore compatible revisions, reconcile outbox, orders, and payment or external references, then reopen after approval.

Record changed paths and actual commands and outcomes in the [implementation history](../DEVELOPMENT_CHANGELOG.md). Stop for phase acceptance.
