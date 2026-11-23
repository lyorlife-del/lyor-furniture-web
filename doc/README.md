# LYOR implementation documentation

The root documentation directory is `doc/`. Architecture uses the approved TypeScript/Node.js stack. This delivery is a **local synthetic demo**, not a production release.

- [Master plan](master-plan.md)
- [Architecture](architecture.md)
- [Decisions and release gates](decision-register.md)
- [Plan change log](change-log.md)
- [Verification record](verification.md)
- [API contracts](contracts/marketplace.md)
- [REA reference evidence](evidence/furlenco-inspection.md)
- [Storefront readiness matrix and REA replay](evidence/storefront-readiness.md)
- [Local setup](runbooks/local-development.md)
- [Recovery and rollback](runbooks/recovery.md)

## Phases

- [PH-00 — Documentation and decisions](phases/PH-00/plan.md)
- [PH-01 — Platform foundation](phases/PH-01/plan.md)
- [PH-02 — Discovery and quotations](phases/PH-02/plan.md)
- [PH-03 — Complete P0 demo journeys](phases/PH-03/plan.md)
- [PH-04 — Verified integration pilot](phases/PH-04/plan.md)
- [PH-05 — Operational commerce](phases/PH-05/plan.md)
- [PH-06 — Controlled production release](phases/PH-06/plan.md)
- [PH-07 — Expansion](phases/PH-07/plan.md)

## Flows

- [FL-01 — Location and serviceability](flows/FL-01-location/plan.md)
- [FL-02 — Home and navigation](flows/FL-02-home/plan.md)
- [FL-03 — Catalog and search](flows/FL-03-catalog/plan.md)
- [FL-04 — Product configuration](flows/FL-04-product/plan.md)
- [FL-05 — Pricing and quotations](flows/FL-05-pricing/plan.md)
- [FL-06 — Fixed room bundles](flows/FL-06-bundles/plan.md)
- [FL-07 — Identity customer profile and consent](flows/FL-07-identity/plan.md)
- [FL-08 — Cart management](flows/FL-08-cart/plan.md)
- [FL-09 — Rental checkout](flows/FL-09-rental-checkout/plan.md)
- [FL-10 — Purchase checkout](flows/FL-10-purchase-checkout/plan.md)
- [FL-11 — Order integration and customer portal](flows/FL-11-order-integration/plan.md)
- [FL-12 — Multi-site business enquiries](flows/FL-12-business/plan.md)
- [FL-13 — Staff administration and recovery](flows/FL-13-admin/plan.md)
- [FL-14 — Payments and recurring billing](flows/FL-14-payments/plan.md)
- [FL-15 — Delivery and installation](flows/FL-15-delivery/plan.md)
- [FL-16 — PMS and physical-unit assignment](flows/FL-16-property/plan.md)
- [FL-17 — Support and maintenance](flows/FL-17-support/plan.md)
- [FL-18 — Renewal and returns](flows/FL-18-returns/plan.md)
- [FL-19 — Inspection and settlement](flows/FL-19-inspection/plan.md)
- [FL-20 — Expansion capabilities](flows/FL-20-expansion/plan.md)

## Change discipline

Update each affected step, its flow plan, and its phase acceptance document in the same implementation change. Record interface changes in contracts and architectural changes in the decision register. Never label an unexecuted check as passed. See the master plan for status semantics.
