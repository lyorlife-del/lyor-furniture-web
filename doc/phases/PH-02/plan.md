# PH-02 — Discovery and quotations

Status: Verification

Catalog, PIN checks, search, product configuration, fixed bundles and server quotes.

Prerequisite: PH-01 accepted, except explicitly independent documentation or contract discovery.

## Included steps

- [FL-01/ST-01 — Select the demo city](../../flows/FL-01-location/steps/ST-01.md)
- [FL-01/ST-02 — Validate delivery PIN](../../flows/FL-01-location/steps/ST-02.md)
- [FL-01/ST-03 — Persist the selected area](../../flows/FL-01-location/steps/ST-03.md)
- [FL-01/ST-04 — Invalidate affected quote assumptions](../../flows/FL-01-location/steps/ST-04.md)
- [FL-01/ST-05 — Offer unsupported-area enquiry](../../flows/FL-01-location/steps/ST-05.md)
- [FL-02/ST-02 — Provide Rent Buy Bundles Business navigation](../../flows/FL-02-home/steps/ST-02.md)
- [FL-02/ST-03 — Render city-aware discovery content](../../flows/FL-02-home/steps/ST-03.md)
- [FL-02/ST-04 — Verify responsive and keyboard states](../../flows/FL-02-home/steps/ST-04.md)
- [FL-03/ST-01 — Create listing and SKU projections](../../flows/FL-03-catalog/steps/ST-01.md)
- [FL-03/ST-02 — Implement catalog and search contracts](../../flows/FL-03-catalog/steps/ST-02.md)
- [FL-03/ST-03 — Add URL filters and sorting](../../flows/FL-03-catalog/steps/ST-03.md)
- [FL-03/ST-04 — Paginate catalog results](../../flows/FL-03-catalog/steps/ST-04.md)
- [FL-03/ST-05 — Handle inactive unavailable and empty results](../../flows/FL-03-catalog/steps/ST-05.md)
- [FL-04/ST-01 — Display gallery and specifications](../../flows/FL-04-product/steps/ST-01.md)
- [FL-04/ST-02 — Select transaction mode variant and quantity](../../flows/FL-04-product/steps/ST-02.md)
- [FL-04/ST-03 — Select rental tenure and dates](../../flows/FL-04-product/steps/ST-03.md)
- [FL-04/ST-04 — Check product and bundle eligibility](../../flows/FL-04-product/steps/ST-04.md)
- [FL-04/ST-05 — Request the authoritative quotation](../../flows/FL-04-product/steps/ST-05.md)
- [FL-05/ST-01 — Version synthetic pricing policies](../../flows/FL-05-pricing/steps/ST-01.md)
- [FL-05/ST-02 — Calculate server-side charge breakdown](../../flows/FL-05-pricing/steps/ST-02.md)
- [FL-05/ST-03 — Issue signed expiring quotes](../../flows/FL-05-pricing/steps/ST-03.md)
- [FL-06/ST-01 — Define bundle component mappings](../../flows/FL-06-bundles/steps/ST-01.md)
- [FL-06/ST-02 — Display included pieces and quantities](../../flows/FL-06-bundles/steps/ST-02.md)
- [FL-06/ST-03 — Validate every mandatory component](../../flows/FL-06-bundles/steps/ST-03.md)
- [FL-06/ST-04 — Calculate the combined quote](../../flows/FL-06-bundles/steps/ST-04.md)

## Exit

The storefront now streams discovery content and keeps catalog results visible during filter changes. See [storefront readiness](../../evidence/storefront-readiness.md).

All included steps have passing evidence or an explicitly documented scope exception. See [acceptance](acceptance.md) and [verification](../../verification.md). Live phases cannot pass with mock integration evidence.
