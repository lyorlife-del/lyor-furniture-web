# Odoo 19 furniture implementation

Start with the five selected furniture templates and the warehouse that serves Noida. Use the existing LYOR storefront to verify the catalogue.

Odoo access and product discovery are verified. Inventory setup, rental rules, real-product storefront verification, and commercial integration are open. See the [marketplace Phase 05 record](../implementation/phase-05-integrations.md).

## Architecture

| Area | Design |
| --- | --- |
| Product identity, variants, media and publishing | [Product catalogue](architecture/product-catalogue.md) |
| Warehouses, stock movements, availability and returns | [Inventory and availability](architecture/inventory-and-availability.md) |
| Rental pricing, orders and system boundaries | [Rental and integration](architecture/rental-and-integration.md) |

## Plan and implementation

| Order | Checklist |
| --- | --- |
| Rollout and approval gates | [Odoo implementation plan](plan/implementation-plan.md) |
| 1. Products and SKUs | [Configure the pilot catalogue](implementation/01-pilot-products.md) |
| 2. Locations and opening stock | [Configure inventory](implementation/02-inventory-setup.md) |
| 3. Rental pricing and test orders | [Configure rental operations](implementation/03-rental-setup.md) |
| 4. Marketplace sync and handoff | [Verify the LYOR pilot](implementation/04-marketplace-handoff.md) |

## Flows

| Flow | Operational sequence |
| --- | --- |
| Product setup through publication | [Catalogue publication](flows/catalogue-publication.md) |
| Opening count through return and inspection | [Inventory lifecycle](flows/inventory-lifecycle.md) |
| Quote through reservation, delivery and reconciliation | [Rental order lifecycle](flows/rental-order-lifecycle.md) |
