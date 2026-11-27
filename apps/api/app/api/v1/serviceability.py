from http import HTTPStatus

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel
from sqlalchemy.exc import SQLAlchemyError
from starlette.responses import JSONResponse

from app.services.geocoding import Coordinates, ResolvedLocation, provider_for
from app.services.serviceability import LocationError, PinCheckResponse, check_pin

from .common import AppSettings, Db

router = APIRouter(prefix="/serviceability", tags=["Serviceability"])


class PinCheckError(BaseModel):
    statusCode: int
    message: str
    error: str
    code: str
    retryable: bool


def failure(error: LocationError) -> JSONResponse:
    headers = {"Cache-Control": "no-store"}
    if error.status == 429:
        headers["Retry-After"] = "60"
    return JSONResponse(PinCheckError(
        statusCode=error.status, message=error.message, error=HTTPStatus(error.status).phrase,
        code=error.code, retryable=error.status >= 500 or error.status == 429,
    ).model_dump(), status_code=error.status, headers=headers)


@router.post(
    "/resolve-location", operation_id="resolveDeliveryLocation", response_model=ResolvedLocation,
    responses={status: {"model": PinCheckError} for status in (400, 409, 429, 503, 504)},
)
async def resolve_location(point: Coordinates, request: Request, response: Response, db: Db, settings: AppSettings):
    response.headers["Cache-Control"] = "no-store"
    try:
        if request.query_params:
            raise LocationError("invalid_parameters", "Send location in the request body only.", 400)
        peer = request.client.host if request.client else "shared"
        candidate = await provider_for(settings, peer).reverse(point)
        async with db.begin():
            result = await check_pin(db, candidate, settings, audit_manual=False)
        return ResolvedLocation(provider=settings.geocoding_provider, resolutionStatus="approximate", serviceability=result)
    except LocationError as error:
        return failure(error)
    except SQLAlchemyError:
        return failure(LocationError("serviceability_unavailable", "Delivery checks are temporarily unavailable."))


@router.get("/pincode", operation_id="missingDeliveryPincode", response_model=PinCheckError, status_code=400)
async def missing_pin():
    return failure(LocationError("malformed_pin", "Enter a valid six-digit Indian PIN code.", 400))


@router.get(
    "/pincode/{pincode}", operation_id="checkDeliveryPincode", response_model=PinCheckResponse,
    responses={400: {"model": PinCheckError}, 503: {"model": PinCheckError}},
)
async def pincode_check(pincode: str, request: Request, response: Response, db: Db, settings: AppSettings):
    response.headers["Cache-Control"] = "no-store"
    try:
        if request.query_params:
            raise LocationError("invalid_parameters", "This PIN check does not accept query parameters.", 400)
        async with db.begin():
            return await check_pin(db, pincode, settings)
    except LocationError as error:
        return failure(error)
    except SQLAlchemyError:
        return failure(LocationError("serviceability_unavailable", "Delivery checks are temporarily unavailable. Please try again."))
