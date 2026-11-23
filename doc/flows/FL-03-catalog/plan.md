# FL-03 — Catalog and search

Audience: guest/customer.

Goal: Search and sort use URL state; inactive/unpublished SKUs are excluded; unavailable items remain honestly labelled.

Implementation areas: CatalogModule, catalog routes.

## Ordered steps

| Step | Outcome | Phase |
|---|---|---|
| [ST-01](steps/ST-01.md) | Create listing and SKU projections | PH-02 |
| [ST-02](steps/ST-02.md) | Implement catalog and search contracts | PH-02 |
| [ST-03](steps/ST-03.md) | Add URL filters and sorting | PH-02 |
| [ST-04](steps/ST-04.md) | Paginate catalog results | PH-02 |
| [ST-05](steps/ST-05.md) | Handle inactive unavailable and empty results | PH-02 |

## Reference evidence

Search and categories observed; sorting replay did not confirm selected-state changes; private projection logic unknown. See the [REA register](../../evidence/furlenco-inspection.md). These observations guide an original design, not competitor backend assumptions.

The [storefront readiness verification](../../evidence/storefront-readiness.md) records the browser checks for the updated steps below.

## Acceptance

Search and sort use URL state; inactive/unpublished SKUs are excluded; unavailable items remain honestly labelled. Evidence must cover failure/recovery and owner/role denial, not only a happy path. Refer to [verification](../../verification.md) for actual results and scope limits.
