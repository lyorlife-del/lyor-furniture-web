import json
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from redis.exceptions import ConnectionError as RedisConnectionError

from app.core.config import Settings
from app.main import create_app
from app.services import geocoding as geo
from app.services.serviceability import LocationError


def settings(**options):
    return Settings(environment="test", demo_mode=True, database_url="postgresql://127.0.0.1/lyor_test_unused",
                    quote_secret="x" * 32, **options)


def row(country="IN", pin="122002"):
    components = [{"types": ["country"], "short_name": country}] if country else []
    if pin:
        components.append({"types": ["postal_code"], "short_name": pin})
    return {"address_components": components, "formatted_address": "Ignored 999999"}


def payload(*rows):
    return json.dumps({"status": "OK", "results": rows}).encode()


@pytest.mark.parametrize(("raw", "code"), [
    (b"broken", "provider_invalid_response"), (b'{"status":"OK","results":[{}]}', "provider_invalid_response"),
    (payload(row(pin=None)), "pin_unresolved"), (payload(row(country=None)), "pin_unresolved"),
    (payload(row("US")), "outside_india"), (payload(row(), row("US")), "ambiguous_pin"),
    (payload(row(), row(pin="110024")), "ambiguous_pin"), (payload(row(pin="012345")), "pin_unresolved"),
    (b'{"status":"REQUEST_DENIED"}', "provider_unavailable"), (b'{"status":"ZERO_RESULTS"}', "pin_unresolved"),
    (b'{"status":"OVER_QUERY_LIMIT"}', "provider_quota_exceeded"),
])
def test_provider_failure_classification(raw, code):
    with pytest.raises(LocationError) as error:
        geo.google_pin(raw)
    assert error.value.code == code


def test_google_candidate_agreement():
    assert geo.google_pin(payload(row(), row(), row(pin=None))) == "122002"


@pytest.mark.parametrize("point", [
    {"latitude": 91, "longitude": 2}, {"latitude": 1, "longitude": -181},
    {"latitude": True, "longitude": 2}, {"latitude": "1", "longitude": 2},
    {"latitude": float("nan"), "longitude": 2}, {"latitude": 1, "longitude": float("inf")},
    {"latitude": 1, "longitude": 2, "accuracy": -1},
])
def test_invalid_coordinate(point):
    with pytest.raises(ValidationError):
        geo.Coordinates(**point)


def test_redacted_validation_and_disabled_http():
    with TestClient(create_app(settings())) as client:
        path = "/api/v1/serviceability/resolve-location"
        bad = client.post(path, json={"latitude": 123.456789, "longitude": 2})
        assert bad.status_code == 400 and "123.456789" not in bad.text
        assert bad.json()["code"] == "invalid_coordinates"
        result = client.post(path, json={"latitude": 1, "longitude": 2})
        assert result.status_code == 503 and result.headers["cache-control"] == "no-store"


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
@pytest.mark.parametrize(("mode","code"), [
    ("missing_key", "provider_unavailable"), ("limit", "geocoding_rate_limited"),
    ("circuit", "provider_quota_exceeded"), ("redis_error", "provider_unavailable"),
    ("quota", "provider_quota_exceeded"), ("timeout", "provider_timeout"), ("ok", None),
])
async def test_paid_path(monkeypatch, mode, code):
    config = settings(geocoding_provider="google", serviceability_mode="reference", geocoding_live_enabled=True,
                      google_geocoding_api_key=None if mode == "missing_key" else "test-only",
                      geocoding_redis_url="redis://127.0.0.1:1")
    redis = AsyncMock()
    redis.eval.return_value = {"limit": 0, "circuit": -1}.get(mode, 1)
    if mode == "redis_error":
        redis.eval.side_effect = RedisConnectionError()
    @asynccontextmanager
    async def connection(*args, **kwargs):
        yield redis
    monkeypatch.setattr(geo.Redis, "from_url", connection)
    from unittest.mock import MagicMock
    pipeline = MagicMock()
    pipeline.set.return_value = pipeline
    pipeline.execute = AsyncMock()
    redis.pipeline = MagicMock()
    redis.pipeline.return_value.__aenter__.return_value = pipeline
    provider = geo.provider_for(config, "test-peer")
    fetch = AsyncMock(return_value="122002")
    if mode == "quota":
        fetch.side_effect = LocationError(code, geo.MANUAL)
    if mode == "timeout":
        fetch.side_effect = httpx.ReadTimeout("sensitive outgoing URL")
    monkeypatch.setattr(provider, "fetch", fetch)
    point = geo.Coordinates(latitude=1, longitude=2)
    if code:
        with pytest.raises(LocationError) as error:
            await provider.reverse(point)
        assert error.value.code == code and "sensitive" not in error.value.message
    else:
        assert await provider.reverse(point) == "122002"
    assert fetch.await_count == int(mode in {"ok", "timeout", "quota"})
    assert pipeline.execute.await_count == int(mode == "quota")


@pytest.mark.anyio
@pytest.mark.parametrize(("status", "body", "expected"), [
    (200, payload(row()), None), (302, b"", "provider_unavailable"),
    (429, b"", "provider_quota_exceeded"), (200, b"x" * 262145, "provider_invalid_response"),
])
async def test_google_http_transport(monkeypatch, status, body, expected):
    def handler(request):
        assert request.url.host == "maps.googleapis.com" and request.url.params["latlng"] == "1.0,2.0"
        return httpx.Response(status, stream=httpx.ByteStream(body))
    monkeypatch.setattr(geo.httpx, "AsyncHTTPTransport", lambda **kwargs: httpx.MockTransport(handler))
    provider = geo.GoogleGeocodingProvider(settings(google_geocoding_api_key="test-only"), "test-peer")
    point = geo.Coordinates(latitude=1, longitude=2)
    if expected:
        with pytest.raises(LocationError) as error:
            await provider.fetch(point)
        assert error.value.code == expected
    else:
        assert await provider.fetch(point) == "122002"
