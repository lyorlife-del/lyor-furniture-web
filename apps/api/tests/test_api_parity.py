import asyncio
import json
from pathlib import Path

import httpx
import pytest
from pydantic import ValidationError

from app.api.v1.common import get_db
from app.api.v1.contracts import CartDto, CatalogQuery
from app.api.v1.pricing import canonical, request_hash, sign, valid_signature
from app.core.errors import legacy_validation_messages
from app.core.security import get_settings
from app.main import create_app

ROOT = Path(__file__).resolve().parents[3]


def test_openapi_contains_every_legacy_operation_and_success_status():
    legacy = json.loads(
        (ROOT / "packages/api-contracts/openapi.json").read_text(encoding="utf-8")
    )
    candidate = create_app().openapi()
    assert legacy["paths"].keys() == candidate["paths"].keys()
    for path, operations in legacy["paths"].items():
        assert operations.keys() == candidate["paths"][path].keys()
        for method, before in operations.items():
            after = candidate["paths"][path][method]
            assert before["operationId"] == after["operationId"]
            assert {status for status in before["responses"] if status.startswith("2")} == {
                status for status in after["responses"] if status.startswith("2")
            }


def test_node_quote_signature_and_idempotency_vectors():
    fixture = json.loads(
        (ROOT / "docs/implementation/fixtures/legacy-signing.json").read_text(encoding="utf-8")
    )
    quote = fixture["quotePayload"]
    body = fixture["orderRequest"]
    secret = fixture["fixtureSecret"]
    assert canonical(quote) == fixture["expectedCanonicalQuote"]
    assert sign(quote, secret) == fixture["expectedQuoteSignature"]
    assert canonical(body) == fixture["expectedCanonicalOrderRequest"]
    assert request_hash(body) == fixture["expectedOrderRequestHash"]
    assert not valid_signature({**quote, "cartRevision": 2}, fixture["expectedQuoteSignature"], secret)


def test_canonical_uses_javascript_key_order_and_number_format():
    assert canonical({"\ue000": 1.0, "\U00010000": [None, -0.0, 1e-7, 1e20]}) == (
        '{"\U00010000":[null,0,1e-7,100000000000000000000],"\ue000":1}'
    )


@pytest.mark.parametrize(
    ("model", "data", "expected"),
    [
        (CatalogQuery, {"page": "abc"}, [
            "page must not be greater than 1000",
            "page must not be less than 1",
            "page must be an integer number",
        ]),
        (CartDto, {
            "cartId": "00000000-0000-4000-8000-000000000001",
            "city": "noida", "revision": 0, "lines": ["not a line"],
        }, ["lines.each value in nested property lines must be either object or array"]),
    ],
)
def test_observed_legacy_validation_messages(model, data, expected):
    with pytest.raises(ValidationError) as failure:
        model.model_validate(data)
    assert [
        message
        for error in failure.value.errors()
        for message in legacy_validation_messages({**error, "loc": ("body", *error["loc"])})
    ] == expected


def test_non_object_cart_body_returns_legacy_required_field_errors():
    app = create_app()

    async def unused_session():
        yield None

    app.dependency_overrides[get_db] = unused_session
    app.dependency_overrides[get_settings] = lambda: None

    async def request():
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://testserver",
        ) as client:
            return await client.put("/api/v1/cart", json=[])

    response = asyncio.run(request())
    assert response.status_code == 400
    assert response.json()["message"] == [
        "cartId must be a UUID",
        "city must be one of the following values: noida",
        "revision must not be less than 0",
        "revision must be an integer number",
        "lines must contain no more than 25 elements",
        "lines must be an array",
    ]
