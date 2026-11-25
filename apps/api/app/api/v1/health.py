from asyncio import timeout
from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.errors import ErrorResponse

router = APIRouter(prefix="/health", tags=["Health"])


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["lyor-api"] = "lyor-api"
    demo: Literal[True] = True


class ReadinessResponse(BaseModel):
    status: Literal["ready"] = "ready"


@router.get("", operation_id="health")
async def health() -> HealthResponse:
    return HealthResponse()


@router.get(
    "/ready",
    operation_id="readiness",
    responses={503: {"model": ErrorResponse, "description": "Database unavailable"}},
)
async def readiness(request: Request) -> ReadinessResponse:
    try:
        async with timeout(3):
            async with request.app.state.engine.connect() as connection:
                await connection.execute(text("SELECT 1"))
    except (SQLAlchemyError, TimeoutError):
        raise HTTPException(503, "Database is unavailable") from None
    return ReadinessResponse()
