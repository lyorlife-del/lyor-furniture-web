# PH-01 — Platform foundation

Status: Verification

Workspaces, app shell, API, schema, mock identity, local setup and CI.

Prerequisite: PH-00 accepted, except explicitly independent documentation or contract discovery.

## Included steps

- [FL-02/ST-01 — Build the original LYOR shell](../../flows/FL-02-home/steps/ST-01.md)
- [FL-07/ST-01 — Create local-only demo identities](../../flows/FL-07-identity/steps/ST-01.md)
- [FL-07/ST-02 — Enforce ownership and role permissions](../../flows/FL-07-identity/steps/ST-02.md)

## Exit

The local session cookie now initializes the account header on the server. See [storefront readiness](../../evidence/storefront-readiness.md).

All included steps have passing evidence or an explicitly documented scope exception. See [acceptance](acceptance.md) and [verification](../../verification.md). Live phases cannot pass with mock integration evidence.
