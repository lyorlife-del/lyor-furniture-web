# Phase 05 — Integration compatibility

## Entry

Phase 04 accepted and adapter owners approve applicable sandbox access.

## Implementation

Implement mock parity and adapter boundaries in `apps/api/app/integrations/`. Record IAM and tenant restrictions, Odoo 19 commercial mappings, Atlas task ownership, PMS references, and payment verification contracts in the architecture and decision records.

## Acceptance and rollback

Use synthetic fixtures to verify sandbox permissions, retry and replay, duplicate prevention, and reconciliation. Record the approved system owner and evidence for each enabled capability.

Keep a capability gated when its contract or controls are unverified. Reconcile any uncertain provider state by its durable external reference.

Record changed paths and actual commands and outcomes in the [implementation history](../DEVELOPMENT_CHANGELOG.md). Stop for phase acceptance.
