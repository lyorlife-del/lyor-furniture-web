from http import HTTPStatus
from math import isnan

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse


class ErrorResponse(BaseModel):
    statusCode: int
    message: str | list[str]
    error: str


def error_response(
    status: int,
    message: str | list[str],
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    body = ErrorResponse(statusCode=status, message=message, error=HTTPStatus(status).phrase)
    return JSONResponse(body.model_dump(), status_code=status, headers=headers)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException) -> JSONResponse:
        message = exc.detail if isinstance(exc.detail, (str, list)) else HTTPStatus(exc.status_code).phrase
        if exc.status_code == 404 and message == "Not Found":
            path = request.url.path
            if request.url.query:
                path += "?" + request.url.query
            return JSONResponse(
                {"message": f"Cannot {request.method} {path}", "error": "Not Found", "statusCode": 404},
                status_code=404,
            )
        return error_response(exc.status_code, message, exc.headers)

    @app.exception_handler(RequestValidationError)
    async def request_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        messages = []
        errors = exc.errors()
        if request.url.path.startswith("/api/v1/"):
            if any(error["type"] == "json_invalid" for error in errors):
                return JSONResponse({
                    "statusCode": 400,
                    "message": "Body is not valid JSON but content-type is set to 'application/json'",
                }, status_code=400)
            errors = legacy_body_errors(request, errors)
            for error in whitelist_order(errors):
                for message in legacy_validation_messages(error):
                    if message not in messages:
                        messages.append(message)
            if messages:
                return error_response(400, messages)
        for error in errors:
            # Read the location and type only. Pydantic may include sensitive input in other fields.
            field = ".".join(str(part) for part in error["loc"][1:])
            if error["type"] == "extra_forbidden":
                messages.append(f"property {field} should not exist")
            elif error["type"] == "json_invalid":
                messages.append("Invalid JSON body")
            else:
                messages.append(f"{field or 'request'} is invalid")
        return error_response(400, messages)


def legacy_body_errors(request: Request, errors: list[dict]) -> list[dict]:
    if len(errors) != 1 or tuple(errors[0]["loc"]) != ("body",):
        return errors
    from pydantic import ValidationError
    from app.api.v1.contracts import CartDto, CheckoutDto, EnquiryDto, PublishDto, QuoteDto

    models = {
        "/api/v1/cart": CartDto,
        "/api/v1/orders": CheckoutDto,
        "/api/v1/b2b/enquiries": EnquiryDto,
        "/api/v1/admin/catalog/{id}": PublishDto,
        "/api/v1/quotes": QuoteDto,
    }
    path = request.url.path
    if path.startswith("/api/v1/admin/catalog/"):
        path = "/api/v1/admin/catalog/{id}"
    if (model := models.get(path)) is not None:
        try:
            model.model_validate({})
        except ValidationError as error:
            return [{**item, "loc": ("body", *item["loc"])} for item in error.errors()]
    return errors


def whitelist_order(errors: list[dict]) -> list[dict]:
    def priority(item):
        index, error = item
        if error["type"] != "extra_forbidden":
            return index, 0
        parent = error["loc"][:-1]
        first = next(i for i, other in enumerate(errors) if other["loc"][:len(parent)] == parent)
        return first, -1

    return [error for _, error in sorted(enumerate(errors), key=priority)]


ENUM_OPTIONS = {
    "city": "noida",
    "mode": "rent, buy",
    "category": "living, bedroom, study, dining, storage, appliances, accessories, bundles",
    "sort": "featured, price-asc, price-desc, newest",
    "tenure": "3, 6, 12",
}


def legacy_validation_messages(error: dict) -> list[str]:
    code, details = error["type"], error.get("ctx", {})
    parts = error["loc"][1:]
    path = ".".join(str(part) for part in parts)
    field = path.rsplit(".", 1)[-1]
    if code == "extra_forbidden":
        prefix, _, field = path.rpartition(".")
        return [f"{prefix + '.' if prefix else ''}property {field} should not exist"]
    if code in {"greater_than_equal", "less_than_equal"}:
        direction = "less" if code == "greater_than_equal" else "greater"
        limit = details["ge" if direction == "less" else "le"]
        return [f"{path} must not be {direction} than {limit}"]
    if field in ENUM_OPTIONS:
        return [f"{path} must be one of the following values: {ENUM_OPTIONS[field]}"]
    if field in {"cartId", "quoteId", "phone", "pin"}:
        if field in {"cartId", "quoteId"}:
            return [f"{path} must be a UUID"]
        pattern = r"^[6-9]\d{9}$" if field == "phone" else r"^\d{6}$"
        return [f"{path} must match /{pattern}/ regular expression"]
    if field in {"page", "quantity", "revision", "units"}:
        lower, upper = {"page": (1, 1000), "quantity": (1, 10), "revision": (0, None), "units": (1, 1000)}[field]
        number = error.get("input")
        if field == "page" and isinstance(number, str):
            try:
                number = float(number)
            except ValueError:
                number = None
        invalid = type(number) not in {int, float} or isinstance(number, float) and isnan(number)
        messages = []
        if upper is not None and (invalid or number > upper):
            messages.append(f"{path} must not be greater than {upper}")
        if invalid or number < lower:
            messages.append(f"{path} must not be less than {lower}")
        return messages + [f"{path} must be an integer number"]
    if code in {"bool_type", "bool_parsing"} or field in {"consent", "published"}:
        return [f"{path} must be a boolean value"]
    if code == "email_address":
        return [f"{path} must be an email"]
    invalid_object = code in {"model_type", "model_attributes_type", "dict_type"}
    if len(parts) >= 2 and isinstance(parts[-1], int) and invalid_object:
        parent = ".".join(str(part) for part in parts[:-1])
        return [f"{parent}.each value in nested property {parts[-2]} must be either object or array"]
    if code in {"list_type", "missing"} and field in {"lines", "sites"}:
        limits = [f"{path} must contain no more than {25 if field == 'lines' else 10} elements"]
        if field == "sites":
            limits.append(f"{path} must contain at least 1 elements")
        limits.append(f"{path} must be an array")
        if code == "list_type":
            limits.append(f"each value in nested property {path} must be either object or array")
        return limits
    if code in {"too_short", "too_long"}:
        limit = details["min_length" if code == "too_short" else "max_length"]
        direction = "at least" if code == "too_short" else "no more than"
        return [f"{path} must contain {direction} {limit} elements"]
    if code in {"string_too_short", "string_too_long"}:
        limit = details["min_length" if code == "string_too_short" else "max_length"]
        direction = "longer" if code == "string_too_short" else "shorter"
        return [f"{path} must be {direction} than or equal to {limit} characters"]
    if code in {"missing", "string_type"}:
        minimum = {"name": 2, "company": 2, "signature": 64, "street": 8, "productId": 1, "variantId": 1}
        if field in minimum:
            return [f"{path} must be longer than or equal to {minimum[field]} characters", f"{path} must be a string"]
        if field == "email":
            return [f"{path} must be shorter than or equal to 150 characters", f"{path} must be an email"]
        if field == "q":
            return [f"{path} must be shorter than or equal to 80 characters", f"{path} must be a string"]
    if field == "address" and code == "missing":
        return []
    if field == "address" and invalid_object:
        return ["nested property address must be either object or array"]
    if code == "json_invalid":
        return ["Invalid JSON body"]
    return [f"{path or 'request'} is invalid"]
