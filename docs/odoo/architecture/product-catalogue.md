# Product catalogue architecture

| Record | Owning system | Use |
| --- | --- | --- |
| Product template | Odoo | Product family, name, category and shared information |
| Product variant | Odoo | Stock-bearing item, attributes, barcode if used and Internal Reference |
| Product mapping | LYOR integration | Source, Odoo company, template ID and variant ID associated with a marketplace listing |
| Listing presentation | LYOR | Approved title, description, category, images and publication decision |

Use the source, company and variant ID as the integration identity. Use the approved Internal Reference as the commercial SKU. Verify its uniqueness across the scoped catalogue and preserve identifiers across product edits. A template can appear as one listing with choices or as separate listings after the catalogue owner confirms the presentation and compatibility with the existing LYOR variant contract.

Reuse the selected template and variant records. Keep the raw photos in ignored local storage during review. Copy approved images to the preview asset path and use Google Cloud Storage when the media deployment is approved. Check photo readability and product match, especially for variants with shared photos.

Publishing in LYOR requires a product mapping, approved media, an approved rental rate and a city mapping. Record the publication decision in LYOR. Configure Odoo eCommerce publication separately if that channel enters scope.

[Odoo product variants](https://www.odoo.com/documentation/19.0/applications/sales/sales/products_prices/products/variants.html)
