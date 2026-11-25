# Configure the pilot catalogue in staging

**Owner** Odoo catalogue administrator and LYOR catalogue owner.

1. Export or record the current product attributes, status, existing Internal References and images for the selected templates. Preserve any existing Commercial or Inventory history.
2. Open **Products** in the approved Odoo staging company. Review the existing template first and then the variant records from the table below.
3. Choose the variants offered in the pilot. For each, approve an Internal Reference, the unit of measure, whether the product is tracked by quantity, lot or serial, and which photo belongs to that variant. Keep the template and variant IDs in the mapping sheet.
4. After owner review, configure the approved variant data in staging and reread the records through JSON-2. Verify allowed variants are active and Internal References are unique. If using an import, rehearse on one row with the export's matching record identifier and verify it updated the intended existing variant.

| Template | Pilot furniture | Variant candidates |
| --- | --- | --- |
| 2880 | Axel Study Chair, Maxwell Black | 28112 |
| 2781 | Axel Study Table | 27148–27150 Walnut and 27151–27153 Natural. Each group has three sizes |
| 3222 | Axel Study Table, Rosewood | 29664 |
| 3243 | Baltic Partition Rack, Brass/Rosewood | 29691 |
| 3501 | Bar Chair, Black Base/Beige | 30029 |

**Acceptance** The product export matches the approved row set and the API returns the same variants. Review proposed changes to attributes on products with stock or order history before saving.

**Rollback** Restore the reviewed pre-change fields on those records. Keep referenced variants and historical transactions. If a variant needs retiring, use controlled archival after reviewing its stock and reservations.

[Catalogue architecture](../architecture/product-catalogue.md)
