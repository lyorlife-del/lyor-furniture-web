# Inventory and availability architecture

Odoo Inventory owns the stock count and moves for each variant. Map Noida to the servicing company, warehouse, eligible stock locations and serviceable PIN codes. Record the Odoo IDs and location roles. A warehouse outside Noida can serve the city when the operating team confirms that arrangement.

| Location role | Purpose | Rental eligibility |
| --- | --- | --- |
| Receiving or inspection | Incoming furniture awaiting inspection | Eligible after the approved putaway move |
| Rentable stock | Inspected units available to reserve | Eligible subject to bookings, held stock and requested dates |
| Customer rental | Furniture out on rent | Eligible after the approved return and any required inspection |
| Quarantine or maintenance | Returned or damaged items held for review | Ineligible until released |
| Disposal | Damaged units written off by the authorized role | Ineligible |

The rental check needs the requested window, scoped stock, existing reservations and turnaround time. Verify which supported Odoo rental workflow supplies that decision in staging. Track on-hand, reserved and available quantities separately in test evidence. LYOR can project browse availability with a freshness timestamp. Odoo confirms the reservation at the commercial gate. When LYOR lacks a verified location or fresh availability, hold the listing at preview or omit the availability claim.

Choose quantity, lot or serial tracking per variant after the operator confirms how units are counted and reconciled. Maintain unit-level links to Atlas or PMS where the workflow requires them.

[Odoo warehouses and locations](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/warehouses_storage/inventory_management.html) · [Odoo locations and reservations report](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/warehouses_storage/reporting/locations.html)
