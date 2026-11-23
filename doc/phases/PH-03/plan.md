# PH-03 — Complete P0 demo journeys

Status: Verification

Cart, order intentions, outbox, mock worker, customer portal, enquiries and staff tools.

Prerequisite: PH-02 accepted, except explicitly independent documentation or contract discovery.

## Included steps

- [FL-05/ST-04 — Reject stale or tampered quotations](../../flows/FL-05-pricing/steps/ST-04.md)
- [FL-05/ST-05 — Require acceptance after repricing](../../flows/FL-05-pricing/steps/ST-05.md)
- [FL-07/ST-03 — Capture addresses and consent](../../flows/FL-07-identity/steps/ST-03.md)
- [FL-08/ST-01 — Create an anonymous persistent cart](../../flows/FL-08-cart/steps/ST-01.md)
- [FL-08/ST-02 — Add update and remove cart lines](../../flows/FL-08-cart/steps/ST-02.md)
- [FL-08/ST-03 — Revalidate configurations and quote revisions](../../flows/FL-08-cart/steps/ST-03.md)
- [FL-08/ST-04 — Claim the cart on demo sign-in](../../flows/FL-08-cart/steps/ST-04.md)
- [FL-08/ST-05 — Recover from expiry location changes and conflicts](../../flows/FL-08-cart/steps/ST-05.md)
- [FL-09/ST-01 — Validate identity address and serviceability](../../flows/FL-09-rental-checkout/steps/ST-01.md)
- [FL-09/ST-02 — Accept the current quote and terms](../../flows/FL-09-rental-checkout/steps/ST-02.md)
- [FL-09/ST-03 — Create an idempotent order intention](../../flows/FL-09-rental-checkout/steps/ST-03.md)
- [FL-09/ST-04 — Commit the transactional outbox event](../../flows/FL-09-rental-checkout/steps/ST-04.md)
- [FL-09/ST-05 — Present pending failure and recovery states](../../flows/FL-09-rental-checkout/steps/ST-05.md)
- [FL-10/ST-01 — Validate one-time pricing and eligibility](../../flows/FL-10-purchase-checkout/steps/ST-01.md)
- [FL-10/ST-02 — Reuse shared checkout infrastructure](../../flows/FL-10-purchase-checkout/steps/ST-02.md)
- [FL-10/ST-03 — Create the sale intention](../../flows/FL-10-purchase-checkout/steps/ST-03.md)
- [FL-11/ST-01 — Implement the local mock ERP adapter](../../flows/FL-11-order-integration/steps/ST-01.md)
- [FL-11/ST-02 — Dispatch durable integration jobs](../../flows/FL-11-order-integration/steps/ST-02.md)
- [FL-11/ST-03 — Persist external mappings](../../flows/FL-11-order-integration/steps/ST-03.md)
- [FL-11/ST-04 — Expose customer-safe status tracks](../../flows/FL-11-order-integration/steps/ST-04.md)
- [FL-12/ST-01 — Capture contact and business details](../../flows/FL-12-business/steps/ST-01.md)
- [FL-12/ST-02 — Capture multiple sites and quantities](../../flows/FL-12-business/steps/ST-02.md)
- [FL-12/ST-03 — Validate consent and deduplicate requests](../../flows/FL-12-business/steps/ST-03.md)
- [FL-12/ST-04 — Return a persisted local receipt](../../flows/FL-12-business/steps/ST-04.md)
- [FL-13/ST-01 — Enforce staff role guards](../../flows/FL-13-admin/steps/ST-01.md)
- [FL-13/ST-02 — Draft and edit public listings](../../flows/FL-13-admin/steps/ST-02.md)
- [FL-13/ST-03 — Publish only eligible SKUs](../../flows/FL-13-admin/steps/ST-03.md)
- [FL-13/ST-05 — Inspect exceptions and safely replay](../../flows/FL-13-admin/steps/ST-05.md)
- [FL-13/ST-06 — Audit staff mutations](../../flows/FL-13-admin/steps/ST-06.md)

## Exit

Cart, checkout, and order history now expose loading and retry states and guard stale responses. See [storefront readiness](../../evidence/storefront-readiness.md).

All included steps have passing evidence or an explicitly documented scope exception. See [acceptance](acceptance.md) and [verification](../../verification.md). Live phases cannot pass with mock integration evidence.
