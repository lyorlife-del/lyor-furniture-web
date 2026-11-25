# Phase 05 — Integration compatibility

## Entry

Phase 04 accepted and adapter owners approve applicable sandbox access.

## Odoo catalogue pilot

The user authorized proceeding to Phase 05 on 2026-11-25 and asked to verify actual Odoo furniture in the existing storefront first. The catalogue check reads selected product variants through Odoo 19 JSON-2. It identifies a variant by its SKU and numeric Odoo ID and checks for missing, duplicate, or out-of-scope rows. It performs no marketplace database writes. [Odoo 19 JSON-2 reference](https://www.odoo.com/documentation/19.0/developer/reference/external_api.html)

Supply the approved Odoo HTTPS URL, database, and a product-read key scoped to the relevant company. Select three to five furniture SKUs. Confirm the sources for monthly rental pricing, approved images, Noida publication, and stock or availability. Keep the key in the local process environment. Run this from `apps/api/` with the locked development environment:

```powershell
uv run --locked python -m app.integrations.odoo_catalog --sku YOUR-SKU-1 --sku YOUR-SKU-2
uv run --locked python -m app.integrations.odoo_catalog --product-id 30081 --product-id 30074
```

The check reads `LYOR_ODOO_URL`, `LYOR_ODOO_DATABASE`, and `LYOR_ODOO_API_KEY`. After checking the mapping, apply the reviewed catalogue projection to an isolated local preview database first. Compare the imported listing and detail page to the approved names, images, monthly prices, and Noida availability. Keep quotes, reservations, and commercial orders on the mock workflow during catalogue verification. Verify the projection can be reverted without affecting existing listings or operational records.

The Phase 05 catalogue check and its six tests are in `apps/api/app/integrations/odoo_catalog.py` and `apps/api/tests/test_odoo_catalog.py`.

The authenticated staging check on 2026-11-25 returned HTTP 200 for JSON-2 product and field reads. The local pilot spreadsheet SKUs returned zero matches. Five furniture candidates had images and empty Internal References. Those five were marked neither rentable nor published in Odoo. A separate rental-enabled sample included mattresses and curtains. Catalogue import and storefront verification await approved pilot product IDs or matching SKUs, monthly rates, and the Noida availability and publication mapping. The live check made no changes to Odoo or the marketplace database.

### Display-only preview

The ID lookup verified all five staging candidates using their Odoo variant IDs. A blank Internal Reference remains blank in the read result. The preview importer in `apps/api/app/integrations/odoo_preview.py` requires an explicit manifest pairing each approved variant ID with Noida, a category, approved description and monthly rate in paise, and image assets staged under `apps/web/public/images/`. Odoo supplies the product name. Preview listings have zero stock and cannot be reserved. The preview does not establish real Noida availability.

Run from `apps/api/`. Validate before applying. For apply mode use a freshly migrated disposable database named `lyor_test_odoo_*` on `127.0.0.1:5433`, the local test settings documented in Phase 02, and the same Odoo read credentials as the catalogue check.

```powershell
uv run --locked python -m app.integrations.odoo_preview "../../.data/odoo-noida-preview.json"
uv run --locked python -m app.integrations.odoo_preview "../../.data/odoo-noida-preview.json" --apply
```

The manifest is a JSON object with an `items` array. Each item specifies `odoo_id`, `category`, `city`, `monthly_paise`, `description`, and `images`. Applying creates or refreshes only the identified preview records. A conflicting listing rolls back the transaction. Roll back the preview by stopping its services and discarding the dedicated database.

Verification ran 45 Python tests on disposable PostgreSQL. The tests covered the variant-ID read, preview boundary, idempotent insert and update, rejection of a conflicting row, and compatible catalogue/detail responses. A Playwright check loaded the existing Noida rental page and verified the synthetic fixture's image, ₹530 monthly rate, detail navigation, and disabled cart action. No real listing was published.

### User-selected Odoo products

Odoo action 2967 opens `product.template`. The record numbers from its URLs must be resolved to variants before import. Direct variant lookup of some of those numbers returned unrelated products.

| Template | Product | Verified variant IDs |
| --- | --- | --- |
| 2880 | Axel Study Chair, Maxwell Black | 28112 |
| 2781 | Axel Study Table | 27148, 27149, 27150, 27151, 27152, 27153 |
| 3222 | Axel Study Table, Rosewood | 29664 |
| 3243 | Baltic Partition Rack, Brass/Rosewood | 29691 |
| 3501 | Bar Chair, Black Base/Beige | 30029 |

All five templates and ten variants were active in the authorized staging reads. All five templates had the rental and publication flags off, with zero linked rental pricing rules. The stock warehouse search found no records with Noida in the name. Confirm the actual servicing location. The pilot price list has generic Study Table and Study Chair tiers. Confirm which rates apply to these Odoo variants.

The five template WebP files were saved and decoded successfully under ignored `.data/phase05-odoo-assets/`. Templates 2781 and 3222 returned identical image content. The local selection file records template and variant IDs, image filenames and hashes, and empty approved rate and Noida availability fields. No Odoo rows or storefront listings were changed. Rollback for this preparation is discarding the staged local asset folder.

## Implementation

The [Odoo staging plan](../odoo/plan/implementation-plan.md) tracks catalogue, inventory and rental preparation. Product discovery and the preview importer are verified. The approved stock location, physical counts, variant choices and rental pricing must be configured and verified before real-product storefront acceptance.

Implement mock parity and adapter boundaries in `apps/api/app/integrations/`. Record IAM and tenant restrictions, Odoo 19 commercial mappings, Atlas task ownership, PMS references, and payment verification contracts in the architecture and decision records.

## Acceptance and rollback

Use synthetic fixtures to verify sandbox permissions, retry and replay, duplicate prevention, and reconciliation. Record the approved system owner and evidence for each enabled capability.

Keep a capability gated when its contract or controls are unverified. Reconcile any uncertain provider state by its durable external reference.

Record changed paths and actual commands and outcomes in the [implementation history](../DEVELOPMENT_CHANGELOG.md). Stop for phase acceptance.
