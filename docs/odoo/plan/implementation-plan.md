# Odoo staging rollout plan

The five pilot templates and ten variants are visible through the staging API. Their photos are staged locally. The selected records have no rental pricing rules, and the physical stock location serving Noida is still to be confirmed.

| Stage | Status | Prerequisites and accountable role | Exit evidence |
| --- | --- | --- | --- |
| 0. Read and map the selected products | Verified | Odoo admin approved read access and the user supplied product links | Template actions and variant IDs verified, photos decoded, gaps recorded |
| 1. Configure pilot variants | Ready for staging review | Catalogue owner chooses variants, SKUs and tracking | Approved SKU manifest and one-to-one active variant mapping with no duplicate references |
| 2. Configure and reconcile inventory | Pending | Warehouse owner identifies the servicing company, warehouse and locations, then approves counts | Scope, opening count and stock movement evidence, including a zero-stock check and wrong-location exclusion |
| 3. Configure rental rules | Pending | Finance approves rates, terms and currency. Warehouse owner approves reservation and return workflow | Monthly rate, staged order, overlapping reservation check, return, and amount reconciliation |
| 4. Verify real products on LYOR | Pending | Stages 1–3 signed off for the pilot. Catalogue owner approves media and display | Existing Noida page and details match approved names, images and prices. Preview keeps the cart disabled |
| 5. Verify integration handoff | Pending | Approved Odoo order, Atlas, PMS and payment sandbox contracts, as applicable | Duplicate protection, replay and reconciliation tested. Order and fulfilment references trace to the same intent |

Stage 1 can be prepared while warehouse and finance owners review Stages 2 and 3. Apply opening stock only after the variant and location mapping are verified. Use one product to verify inventory and rental end to end before configuring the rest of the selected products.

Capture the owner, approved Odoo change, before and after evidence, IDs, test result, and rollback in the [development history](../../DEVELOPMENT_CHANGELOG.md). Start Phase 06 GCP staging after the marketplace Phase 05 exit criteria are satisfied and accepted. [Marketplace master plan](../../MASTER_IMPLEMENTATION_PLAN.md)

## Decisions needed before staging changes

- **Catalogue owner** chooses the supported Axel Study Table sizes and finishes, assigns Internal References, and approves the photos and descriptions.
- **Warehouse owner** identifies the company and warehouse serving Noida, approves its location and serviceability map, and approves the opening counts and tracking method.
- **Finance owner** provides the monthly rent or selects the approved rate tier per variant, and confirms deposit, tax, delivery and rounding behavior.
- **Integration owners** provide credentials and contracts for their own staging capabilities when applicable. Catalogue read access is already verified.
