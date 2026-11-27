from contextlib import asynccontextmanager
from os import getenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.v1 import cart, catalog, enquiries, location, orders, pricing, serviceability, staff
from app.services.serviceability import LocationError
from app.api.v1.health import router as health_router
from app.core.config import Settings, load_settings
from app.core.errors import register_error_handlers
from app.core.http import LegacyHttpLimits
from app.core.openapi import document_legacy_contract


def create_app(settings: Settings | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.settings = settings if settings is not None else load_settings()
        engine = create_async_engine(
            app.state.settings.psycopg_url(),
            connect_args={"connect_timeout": 2},
        )
        app.state.engine = engine
        app.state.sessions = async_sessionmaker(engine, expire_on_commit=False)
        try:
            yield
        finally:
            await engine.dispose()

    app = FastAPI(
        title="LYOR local demo API",
        description="Synthetic demo only. No live ERP or financial effects.",
        version="0.1.0",
        docs_url="/api/docs",
        openapi_url="/api/docs-json",
        redoc_url=None,
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[getenv("LYOR_WEB_ORIGIN", "http://127.0.0.1:3000")],
        allow_methods=["GET", "POST", "PUT", "PATCH"],
        allow_headers=["*"],
    )
    app.add_middleware(LegacyHttpLimits)
    register_error_handlers(app)
    @app.exception_handler(LocationError)
    async def location_error(request, exc):
        return serviceability.failure(exc)
    for router in (health_router, catalog.router, cart.router, pricing.router,
                   orders.router, enquiries.router, staff.router, serviceability.router, location.router):
        app.include_router(router, prefix="/api/v1")
    document_legacy_contract(app)
    return app


app = create_app()
