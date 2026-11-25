# Phase 06 — GCP staging

## Entry

Phase 05 accepted and staging project, region, access, and budget approved.

## Implementation

Update `infra/`, `.github/workflows/`, and standalone Next.js build configuration for independent web, API, and worker artifacts. Configure staging service identities, secrets, networking and observability through approved GCP configuration.

## Acceptance and rollback

Verify health, ingress and private connectivity, startup, instance scaling, queue latency, idle and loaded worker cost, Celery shutdown and redelivery, and prior-revision rollback. Record resource and workload assumptions with the cost evidence.

Incompatible revisions or unbounded worker cost block rollout. Revert to the previous compatible staging revision and reconcile outstanding tasks.

Record changed paths and actual commands and outcomes in the [implementation history](../DEVELOPMENT_CHANGELOG.md). Stop for phase acceptance.
