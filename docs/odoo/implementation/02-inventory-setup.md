# Configure staging inventory

**Owner** Warehouse operator and Odoo Inventory administrator. Start after the pilot variant mapping is approved.

1. Review **Inventory → Configuration → Warehouses**. Identify the real facility that will service Noida. Reuse an existing warehouse if approved. If a new staging warehouse is needed, have the owner approve its company, address, short code, and route.
2. Review **Inventory → Configuration → Locations** with storage locations enabled where needed. Identify the internal stock location eligible for rent and the receiving, inspection, maintenance and return locations used by the pilot. Record their Odoo IDs and map the Noida PIN codes separately.
3. Verify the pilot goods' units and tracking settings. Collect the count per variant and stock location. Include serial or lot values when required. Record the count timestamp, operator, source and reason for any manual adjustment.
4. In **Inventory → Operations → Physical Inventory**, enter the counted quantities for the approved staging location. Compare counted, on-hand and difference values. Reconcile moves made since the count before applying. Have the designated operator apply only the reviewed lines.
5. Compare the stock and location reports with the reviewed count. Create a staging transfer into and out of the rentable location, then verify how availability changes. Repeat with a zero-stock variant and a variant stocked only in an ineligible location.

**Acceptance** The approved company and Noida warehouse mapping point to specific Odoo IDs. The staging count equals the evidence by active variant and location. Reservation and movement reports show where each available unit came from.

**Rollback** Pause pilot availability and capture current stock and moves. Correct an applied adjustment using an authorized reversing or corrective inventory movement. Retain the original movement and reconcile quantities and any valuation effects with the responsible owner.

[Odoo warehouses](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/warehouses_storage/inventory_management/warehouses.html) · [Odoo physical inventory and adjustments](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/management/inventory_adjustments.html)
