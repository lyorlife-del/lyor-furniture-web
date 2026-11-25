# Verify the LYOR pilot and adapter handoff

**Owner** LYOR engineering with the catalogue, inventory, finance and adapter owners.

1. Verify the approved template-to-variant map with the existing read-only catalogue command. Record the company, Odoo variant ID, Internal Reference, approved LYOR category and description, primary image and price source.
2. Stage the approved images for the isolated preview. Create a manifest using the existing preview fields. Validate the manifest, target a disposable `lyor_test_odoo_*` database, and apply the projection with the [Phase 05 commands](../../implementation/phase-05-integrations.md#display-only-preview).
3. Check the existing Noida catalogue and detail page for approved names, variants, media and monthly prices. Exercise empty and unavailable states. Confirm repeat import retains the same record IDs and the display-only preview disables the cart for those products.
4. Separately verify the agreed Odoo availability and reservation contract for dated orders. Use staging references to test duplicate submission, two requests competing for one unit, stale availability, and an uncertain upstream response. Trace the confirmed Odoo reference to the LYOR order.
5. Rehearse Atlas fulfilment and return task mapping, PMS site and asset references for applicable orders, and payment status mapping where a sandbox contract is approved. Verify task or event replay leaves one externally visible result. Review errors and reconciliation with each adapter owner.

**Acceptance** The store displays the reviewed products with valid media and prices. An approved staging order can be traced through all applicable systems with no duplicate side effects. Record evidence and stop at marketplace Phase 05 for acceptance.

**Rollback** Stop the preview and discard its database. For a commercial sandbox rehearsal, pause the affected dispatcher, reconcile uncertain references and use the approved cancellation workflow before retrying or resuming.
