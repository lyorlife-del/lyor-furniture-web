# Configure staging rental operations

**Owner** Finance rate approver, Rental administrator and warehouse operator. Use the approved variant and warehouse mappings.

1. Confirm the rental offering and rate by variant. Record the approved period, INR amount, applicable pricelist, minimum term, effective date and service charges. Map the generic pilot spreadsheet tiers only when Finance confirms the exact variant.
2. In the **Rental** app, review applicable rental settings and periods. Enable rental for the approved staging products and add the approved rules in **Rental Prices**. Confirm which periods and prices apply to each variant and whether the website's supported tenures match them.
3. Decide and test rental transfers and turnaround time with the warehouse owner. Track staging pickups and returns through the approved workflow and preserve the system-managed rental location. Record how a damaged return is held and how inventory becomes eligible after inspection.
4. Create one staging rental quote for a selected item and compare the Odoo and LYOR totals, including deposits, taxes, delivery and rounding. Confirm the reservation behavior with a dated rental order and a competing request for the same stock. Exercise pickup, return and damaged-item inspection. Keep live invoice posting and payment behind their approvals.
5. Save the test order reference, rental rules, movement references, before and after quantities and expected customer status for each transition. Repeat for any distinct rate or stock rule.

**Acceptance** Approved rates and terms match both quote paths. Stock is reserved once, overlapping orders respect eligible stock, and a returned unit is available again only after the approved release.

**Rollback** Deactivate the affected pilot rate or remove it from the approved pricing mapping, expire affected preview quotes, and use the Odoo cancellation and return workflow for staged test orders. Preserve commercial and stock history.

[Odoo rental products and pricing](https://www.odoo.com/documentation/19.0/applications/sales/rental/configure_products/products.html)
