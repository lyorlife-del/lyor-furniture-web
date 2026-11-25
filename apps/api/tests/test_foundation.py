from asyncio import SelectorEventLoop
from contextlib import asynccontextmanager
from socket import socket
from typing import Annotated

import httpx
import pytest
from asgi_lifespan import LifespanManager
from fastapi import Depends
from pydantic import BaseModel, ConfigDict, ValidationError
from sqlalchemy.engine import URL

from app.core.config import Settings
from app.core.security import Identity, require_admin, require_identity, require_staff
from app.main import create_app


@pytest.fixture
def anyio_backend():
    return "asyncio", {"loop_factory": SelectorEventLoop}


@asynccontextmanager
async def running_client(app):
    async with LifespanManager(app) as manager:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=manager.app),
            base_url="http://testserver",
        ) as client:
            yield client


def make_settings(**changes):
    return Settings(
        **{
            "environment": "test",
            "demo_mode": True,
            "database_url": "postgresql://test@127.0.0.1/lyor_test",
            "quote_secret": "synthetic-phase-one-quote-secret-only",
            **changes,
        }
    )


@pytest.mark.parametrize(
    "bad_setting",
    [
        {"database_url": "sqlite:///example"},
        {"database_url": "postgresql://localhost"},
        {"database_url": "postgresql://localhost/test?schema=public"},
        {"quote_secret": "short"},
        {"demo_mode": False},
        {"environment": "production"},
    ],
)
def test_invalid_settings_are_rejected(bad_setting):
    with pytest.raises(ValidationError):
        make_settings(**bad_setting)


def test_wires_psycopg_without_losing_connection_parameters():
    settings = make_settings(
        database_url="postgresql://test:p%40ss@localhost:5433/lyor_test?sslmode=require",
    )
    assert settings.psycopg_url() == URL.create(
        "postgresql+psycopg",
        username="test",
        password="p@ss",
        host="localhost",
        port=5433,
        database="lyor_test",
        query={"sslmode": "require"},
    )


@pytest.mark.anyio
async def test_startup_fails_closed_without_environment(monkeypatch):
    for name in ("ENVIRONMENT", "DEMO_MODE", "DATABASE_URL", "QUOTE_SECRET"):
        monkeypatch.delenv(f"LYOR_{name}", raising=False)
    with pytest.raises(RuntimeError, match="Invalid LYOR settings"):
        async with running_client(create_app()):
            pytest.fail("The API should reject incomplete configuration")


@pytest.mark.anyio
async def test_liveness_survives_postgresql_unavailability():
    with socket() as unreachable:
        unreachable.bind(("127.0.0.1", 0))
        port = unreachable.getsockname()[1]
        settings = make_settings(database_url=f"postgresql://test@127.0.0.1:{port}/lyor_test")
        async with running_client(create_app(settings)) as client:
            live = await client.get("/api/v1/health")
            assert live.status_code == 200
            assert live.json() == {"status": "ok", "service": "lyor-api", "demo": True}
            ready = await client.get("/api/v1/health/ready")
            assert ready.status_code == 503
            assert ready.json() == {
                "statusCode": 503,
                "message": "Database is unavailable",
                "error": "Service Unavailable",
            }


def test_documented_health_operations():
    schema = create_app().openapi()
    assert schema["paths"]["/api/v1/health"]["get"]["operationId"] == "health"
    ready = schema["paths"]["/api/v1/health/ready"]["get"]
    assert ready["operationId"] == "readiness"
    assert set(ready["responses"]) == {"200", "503"}


@pytest.fixture
async def protected_client():
    app = create_app(make_settings())

    # Test-only consumers exercise the dependencies without publishing placeholder routes.
    @app.get("/identity")
    def whoami(identity: Annotated[Identity, Depends(require_identity)]):
        return identity

    @app.get("/staff")
    def staff(identity: Annotated[Identity, Depends(require_staff)]):
        return identity

    @app.get("/admin")
    def administrator(identity: Annotated[Identity, Depends(require_admin)]):
        return identity

    async with running_client(app) as client:
        yield client


@pytest.mark.anyio
@pytest.mark.parametrize("token", [None, "Bearer unknown", "bearer demo-customer-a"])
async def test_identity_rejects_missing_or_unrecognized_credentials(protected_client, token):
    headers = {"Authorization": token} if token is not None else {}
    response = await protected_client.get("/identity", headers=headers)
    assert response.status_code == 401
    assert response.json() == {
        "statusCode": 401,
        "message": "Select a local demo identity",
        "error": "Unauthorized",
    }


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("route", "token", "identity"),
    [
        ("/identity", "customer-a", ("customer-a", "customer")),
        ("/identity", "customer-b", ("customer-b", "customer")),
        ("/staff", "catalog", ("catalog-manager", "catalog")),
        ("/staff", "admin", ("system-admin", "admin")),
        ("/admin", "admin", ("system-admin", "admin")),
    ],
)
async def test_legacy_identity_mapping(protected_client, route, token, identity):
    response = await protected_client.get(route, headers={"Authorization": f"Bearer demo-{token}"})
    assert response.status_code == 200
    assert response.json() == dict(zip(("id", "role"), identity, strict=True))


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("route", "token", "message"),
    [
        ("/staff", "customer-a", "Staff permission required"),
        ("/admin", "catalog", "Administrator permission required"),
        ("/admin", "customer-a", "Administrator permission required"),
    ],
)
async def test_role_denial(protected_client, route, token, message):
    response = await protected_client.get(route, headers={"Authorization": f"Bearer demo-{token}"})
    assert response.status_code == 403
    assert response.json() == {"statusCode": 403, "message": message, "error": "Forbidden"}


class StrictInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    quantity: int


@pytest.mark.anyio
async def test_validation_preserves_legacy_envelope_without_echoing_input():
    app = create_app(make_settings())

    @app.post("/validate")
    def validate(payload: StrictInput):
        return payload

    async with running_client(app) as client:
        response = await client.post(
            "/validate", json={"quantity": "private-value", "unexpected": "private"}
        )
        assert response.status_code == 400
        assert response.json() == {
            "statusCode": 400,
            "message": ["quantity is invalid", "property unexpected should not exist"],
            "error": "Bad Request",
        }
        malformed = await client.post(
            "/validate", content="{", headers={"Content-Type": "application/json"}
        )
        assert malformed.status_code == 400
        assert malformed.json()["message"] == ["Invalid JSON body"]
