"""One-shot geocoding. Provider coordinates and content stay in request memory."""
import asyncio
import hashlib
import json
import re
from typing import Literal, Protocol

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import Settings
from app.services.serviceability import LocationError, PinCheckResponse

MANUAL = "We couldn't determine your PIN code. Please enter it manually."


class Coordinates(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", allow_inf_nan=False)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy: float | None = Field(default=None, ge=0)


class ResolvedLocation(BaseModel):
    provider: Literal["mock", "google"]
    resolutionStatus: Literal["approximate"]
    serviceability: PinCheckResponse


class GeocodingProvider(Protocol):
    async def reverse(self, point: Coordinates) -> str: ...


class DisabledGeocodingProvider:
    async def reverse(self, point: Coordinates) -> str:
        raise LocationError("provider_unavailable", "Location detection is unavailable. Enter your PIN manually.")


class MockGeocodingProvider:
    async def reverse(self, point: Coordinates) -> str:
        # Only explicit fictional fixture points have a mapping.
        pin = {(1.0, 2.0): "122002", (2.0, 1.0): "400001"}.get((point.latitude, point.longitude))
        if pin is None:
            raise LocationError("pin_unresolved", MANUAL, 409)
        return pin


class AddressComponent(BaseModel):
    types: list[str]
    short_name: str


class GeocodeResult(BaseModel):
    address_components: list[AddressComponent]


class GooglePayload(BaseModel):
    status: str
    results: list[GeocodeResult] = []


def google_pin(raw: bytes) -> str:
    try:
        payload = GooglePayload.model_validate(json.loads(raw))
    except (ValueError, ValidationError, RecursionError):
        raise LocationError("provider_invalid_response", MANUAL) from None
    if payload.status in {"OVER_QUERY_LIMIT", "OVER_DAILY_LIMIT"}:
        raise LocationError("provider_quota_exceeded", MANUAL)
    if payload.status == "ZERO_RESULTS":
        raise LocationError("pin_unresolved", MANUAL, 409)
    if payload.status != "OK":
        raise LocationError("provider_unavailable", MANUAL)
    candidates: set[str] = set()
    countries: set[str] = set()
    for row in payload.results:
        local = {c.short_name for c in row.address_components if "country" in c.types}
        countries.update(local)
        if local == {"IN"}:
            candidates.update(c.short_name for c in row.address_components
                              if "postal_code" in c.types and re.fullmatch(r"[1-9][0-9]{5}", c.short_name))
    if countries and "IN" not in countries:
        raise LocationError("outside_india", "Location is outside India. Enter an Indian delivery PIN.", 409)
    if len(countries) > 1 or len(candidates) > 1:
        raise LocationError("ambiguous_pin", "Multiple areas are possible. Please enter your PIN manually.", 409)
    if not candidates:
        raise LocationError("pin_unresolved", MANUAL, 409)
    return candidates.pop()


# The counters use Redis time and expire independently of API instance lifetime.
# During recovery from a quota error Redis admits one probe per minute.
ADMIT = """
local now = tonumber(redis.call('TIME')[1])
local minute = KEYS[1] .. ':minute:' .. ARGV[1] .. ':' .. math.floor(now / 60)
local day = KEYS[1] .. ':day:' .. math.floor(now / 86400)
if tonumber(redis.call('GET', minute) or '0') >= tonumber(ARGV[2]) or
   tonumber(redis.call('GET', day) or '0') >= tonumber(ARGV[3]) then return 0 end
if redis.call('EXISTS', KEYS[1] .. ':cooldown') == 1 then return -1 end
if redis.call('EXISTS', KEYS[1] .. ':recovering') == 1 and
   not redis.call('SET', KEYS[1] .. ':cooldown', '1', 'EX', 60, 'NX') then return -1 end
redis.call('INCR', minute)
redis.call('EXPIRE', minute, 61)
redis.call('INCR', day)
redis.call('EXPIRE', day, 86401)
return 1
"""
PREFIX = "lyor:geocoding:google"


class GoogleGeocodingProvider:
    def __init__(self, settings: Settings, peer: str):
        self.settings = settings
        self.peer = hashlib.sha256(peer.encode()).hexdigest()

    async def reverse(self, point: Coordinates) -> str:
        settings = self.settings
        if not (settings.geocoding_live_enabled and settings.google_geocoding_api_key
                and settings.google_geocoding_api_key.get_secret_value().strip()
                and settings.geocoding_redis_url and settings.serviceability_mode == "reference"):
            return await DisabledGeocodingProvider().reverse(point)
        try:
            async with asyncio.timeout(5), Redis.from_url(
                settings.geocoding_redis_url.get_secret_value(), socket_connect_timeout=1, socket_timeout=1,
            ) as redis:
                admitted = await redis.eval(ADMIT, 1, PREFIX, self.peer, settings.geocoding_minute_limit,
                                            settings.geocoding_daily_limit)
                if admitted == 0:
                    raise LocationError("geocoding_rate_limited", "Location request limit reached. Enter your PIN manually.", 429)
                if admitted != 1:
                    raise LocationError("provider_quota_exceeded", MANUAL)
                try:
                    return await self.fetch(point)
                except LocationError as exc:
                    if exc.code == "provider_quota_exceeded":
                        async with redis.pipeline(transaction=True) as pipeline:
                            await pipeline.set(PREFIX + ":cooldown", "1", ex=60).set(
                                PREFIX + ":recovering", "1", ex=600).execute()
                    raise
        except (TimeoutError, httpx.TimeoutException):
            raise LocationError("provider_timeout", MANUAL, 504) from None
        except (RedisError, httpx.HTTPError, ValueError, OSError):
            raise LocationError("provider_unavailable", MANUAL) from None

    async def fetch(self, point: Coordinates) -> str:
        key = self.settings.google_geocoding_api_key
        assert key is not None
        # Direct transport avoids the client INFO logger that includes the query string.
        request = httpx.Request("GET", "https://maps.googleapis.com/maps/api/geocode/json",
                                params={"latlng": f"{point.latitude},{point.longitude}", "key": key.get_secret_value()},
                                extensions={"timeout": httpx.Timeout(3, connect=1).as_dict()})
        async with httpx.AsyncHTTPTransport(trust_env=False, retries=0) as transport:
            response = await transport.handle_async_request(request)
            try:
                if response.status_code == 429:
                    raise LocationError("provider_quota_exceeded", MANUAL)
                if response.status_code != 200:
                    raise LocationError("provider_unavailable", MANUAL)
                data = bytearray()
                async for chunk in response.aiter_raw():
                    if len(data) + len(chunk) > 256 * 1024:
                        raise LocationError("provider_invalid_response", MANUAL)
                    data.extend(chunk)
                return google_pin(bytes(data))
            finally:
                await response.aclose()


def provider_for(settings: Settings, peer: str) -> GeocodingProvider:
    if settings.geocoding_provider == "mock" and settings.serviceability_mode == "demo":
        return MockGeocodingProvider()
    if settings.geocoding_provider == "google":
        return GoogleGeocodingProvider(settings, peer)
    return DisabledGeocodingProvider()
