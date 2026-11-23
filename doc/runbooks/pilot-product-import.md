# Pilot product import

The source is the `Product Prices` sheet in `Lyor_Pilot_Product_and_Package_Pricelist.xlsx`. Only the 79 product/tier entries are imported. Design counts total 514 and describe options rather than inventory. Monthly rentals are stored in integer paise and shown before GST and logistics. Supplier costs and package sheets are outside the product import.

Each SKU gets a stable `pilot-<sku>` listing ID. The display name includes the price tier. New listings are visible in the local Noida rental catalog. They start with zero stock and no purchase price or photo because the workbook supplies none. The existing demo listings remain available for testing checkout.

Run `npm.cmd run import:pilot -w @lyor/api` from the repository once the local database is running and migrated. Repeating the import refreshes names, categories, design counts, and rates while preserving stock counts and publication settings. The import checks that its database URL points to the local LYOR demo and commits the changes in one transaction.

The local verification matched all 79 imported SKU rates against the workbook extract and found all 10 original demo rows. Fastify checks confirmed 89 Rent listings, 10 Buy listings, a working Accessories filter, and the ₹340 monthly rate for SKU B07.
