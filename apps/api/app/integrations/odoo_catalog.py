"""Read approved Odoo product variants before mapping them into LYOR."""

import argparse
import json
import os

import httpx
from pydantic import BaseModel, Field, TypeAdapter, ValidationError


class CatalogCheckError(Exception):
    pass


class OdooProduct(BaseModel):
    id: int = Field(gt=0)
    default_code: str | None
    name: str = Field(min_length=1)


product_rows = TypeAdapter(list[OdooProduct])


def read_products(
    client: httpx.Client,
    base_url: str,
    database: str,
    api_key: str,
    skus: list[str] | None = None,
    *,
    product_ids: list[int] | None = None,
) -> list[OdooProduct]:
    try:
        url = httpx.URL(base_url.rstrip("/"))
    except httpx.InvalidURL:
        raise CatalogCheckError("The Odoo URL is invalid.") from None
    if (
        url.scheme != "https"
        or not url.host
        or url.userinfo
        or url.query
        or url.fragment
    ):
        raise CatalogCheckError("Use an HTTPS Odoo URL without credentials, a query, or a fragment.")
    if not database.strip() or not api_key.strip():
        raise CatalogCheckError("Set the Odoo database name and a product-read API key.")
    if (skus is None) == (product_ids is None):
        raise CatalogCheckError("Select products by SKU or Odoo variant ID.")
    field, keys = ("default_code", skus) if skus is not None else ("id", product_ids)
    if not keys or len(keys) > 20 or len(set(keys)) != len(keys):
        raise CatalogCheckError("Provide between 1 and 20 distinct SKUs or Odoo variant IDs.")
    if any(key <= 0 if isinstance(key, int) else not key.strip() for key in keys):
        raise CatalogCheckError("Provide non-empty SKUs or positive Odoo variant IDs.")

    try:
        response = client.post(
            f"{url}/json/2/product.product/search_read",
            headers={"Authorization": f"Bearer {api_key}", "X-Odoo-Database": database},
            json={
                "domain": [["active", "=", True], [field, "in", keys]],
                "fields": ["id", "default_code", "name"],
                "limit": len(keys) + 1,
                "order": "id asc",
            },
            follow_redirects=False,
        )
    except httpx.RequestError:
        raise CatalogCheckError("Could not reach Odoo. Check the URL, TLS, and network access.") from None
    if response.status_code != 200:
        raise CatalogCheckError(f"Odoo product read returned HTTP {response.status_code}.")
    try:
        rows = response.json()
        if isinstance(rows, list):
            for row in rows:
                if isinstance(row, dict) and row.get("default_code") is False:
                    row["default_code"] = None
        products = product_rows.validate_python(rows, strict=True)
    except (ValidationError, ValueError):
        raise CatalogCheckError("Odoo returned unexpected product data.") from None

    by_key = {getattr(product, field): product for product in products}
    label = "SKU" if field == "default_code" else "variant ID"
    if len(by_key) != len(products):
        raise CatalogCheckError(f"Odoo returned duplicate product {label}s. Resolve the variant mapping.")
    if by_key.keys() - set(keys):
        raise CatalogCheckError(f"Odoo returned products outside the requested {label} set.")
    if missing := set(keys) - by_key.keys():
        raise CatalogCheckError(f"No readable active variant for {label}(s): " + ", ".join(map(str, sorted(missing))))
    return [by_key[key] for key in keys]


def read_configured_products(
    *, skus: list[str] | None = None, product_ids: list[int] | None = None,
) -> list[OdooProduct]:
    with httpx.Client(timeout=15.0) as client:
        return read_products(
            client,
            os.environ.get("LYOR_ODOO_URL", ""),
            os.environ.get("LYOR_ODOO_DATABASE", ""),
            os.environ.get("LYOR_ODOO_API_KEY", ""),
            skus,
            product_ids=product_ids,
        )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument("--sku", action="append")
    selection.add_argument("--product-id", action="append", type=int)
    args = parser.parse_args()
    try:
        products = read_configured_products(
            skus=[sku.strip() for sku in args.sku] if args.sku else None,
            product_ids=args.product_id,
        )
    except CatalogCheckError as error:
        parser.exit(1, f"Odoo catalogue check failed: {error}\n")
    print(json.dumps([product.model_dump() for product in products], indent=2))


if __name__ == "__main__":
    main()
