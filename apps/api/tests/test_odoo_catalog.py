import json

import httpx
import pytest

from app.integrations.odoo_catalog import CatalogCheckError, read_products


def read(handler, skus=("LYOR-002", "LYOR-001"), url="https://odoo.example"):
    with httpx.Client(transport=httpx.MockTransport(handler), follow_redirects=True) as client:
        return read_products(client, url, "pilot", "synthetic-key", list(skus))


def test_reads_exact_active_variants_in_requested_order():
    def handler(request):
        assert str(request.url) == "https://odoo.example/json/2/product.product/search_read"
        assert request.method == "POST"
        assert request.headers["x-odoo-database"] == "pilot"
        assert request.headers["authorization"] == "Bearer synthetic-key"
        assert json.loads(request.content) == {
            "domain": [["active", "=", True], ["default_code", "in", ["LYOR-002", "LYOR-001"]]],
            "fields": ["id", "default_code", "name"],
            "limit": 3,
            "order": "id asc",
        }
        return httpx.Response(200, json=[
            {"id": 1, "default_code": "LYOR-001", "name": "Table"},
            {"id": 2, "default_code": "LYOR-002", "name": "Chair"},
        ])

    assert [row.id for row in read(handler)] == [2, 1]


@pytest.mark.parametrize(
    ("rows", "message"),
    [
        ([], "No readable active variant"),
        ([{"id": 1, "default_code": "LYOR-003", "name": "Table"}], "outside the requested"),
        ([{"id": 1, "default_code": "LYOR-001", "name": "Table"}] * 2, "duplicate"),
        ([{"id": 1, "default_code": 7, "name": "Table"}], "unexpected product data"),
    ],
)
def test_rejects_unusable_catalog_rows(rows, message):
    with pytest.raises(CatalogCheckError, match=message):
        read(lambda _: httpx.Response(200, json=rows))


def test_rejects_redirect_without_forwarding_credentials():
    def handler(request):
        assert request.url.host == "odoo.example"
        return httpx.Response(307, headers={"Location": "https://other.example"})

    with pytest.raises(CatalogCheckError, match="HTTP 307"):
        read(handler)


def test_fails_locally_for_non_https_endpoint():
    with pytest.raises(CatalogCheckError, match="Use an HTTPS Odoo URL"):
        read(lambda _: pytest.fail("Unexpected network request"), url="http://odoo.example")


def test_variant_lookup_preserves_blank_internal_references():
    def handler(request):
        assert json.loads(request.content)["domain"] == [["active", "=", True], ["id", "in", [20, 10]]]
        return httpx.Response(200, json=[
            {"id": 10, "default_code": False, "name": "Table"},
            {"id": 20, "default_code": False, "name": "Chair"},
        ])

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        rows = read_products(client, "https://odoo.example", "pilot", "synthetic-key", product_ids=[20, 10])
    assert [(row.id, row.default_code) for row in rows] == [(20, None), (10, None)]
