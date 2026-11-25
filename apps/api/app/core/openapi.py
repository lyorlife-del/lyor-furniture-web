from fastapi import FastAPI

REQUIRES_IDENTITY = {
    "createOrder", "listMyOrders", "getMyOrder",
    "adminCatalog", "publishListing", "integrationExceptions", "replayException",
}
OPTIONAL_IDENTITY = {"getCart", "saveCart", "createQuote"}


def document_legacy_contract(app: FastAPI) -> None:
    default_openapi = app.openapi

    def openapi():
        if app.openapi_schema is not None:
            return app.openapi_schema
        schema = default_openapi()
        components = schema.setdefault("components", {})
        components.setdefault("securitySchemes", {})["bearer"] = {
            "type": "http", "scheme": "bearer",
        }
        errors = {"$ref": "#/components/schemas/ErrorResponse"}
        for path in schema["paths"].values():
            for operation in path.values():
                name = operation["operationId"]
                operation["parameters"] = [
                    parameter for parameter in operation.get("parameters", [])
                    if parameter["name"].lower() != "authorization"
                ]
                for parameter in operation["parameters"]:
                    if parameter["name"].lower() == "idempotency-key":
                        parameter.update(required=True, schema={"type": "string", "format": "uuid"})
                if not operation["parameters"]:
                    del operation["parameters"]
                if name in REQUIRES_IDENTITY:
                    operation["security"] = [{"bearer": []}]
                elif name in OPTIONAL_IDENTITY:
                    operation["security"] = [{}, {"bearer": []}]
                responses = operation["responses"]
                if responses.pop("422", None) is not None:
                    responses.setdefault("400", {
                        "description": "Bad Request",
                        "content": {"application/json": {"schema": errors}},
                    })
        for name in ("HTTPValidationError", "ValidationError"):
            components.get("schemas", {}).pop(name, None)
        return schema

    app.openapi = openapi
