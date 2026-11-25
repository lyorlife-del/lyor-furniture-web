import re
from decimal import Decimal, InvalidOperation
from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, StringConstraints, field_validator
from pydantic_core import PydanticCustomError

Mode = Literal["rent", "buy"]
Category = Literal["living", "bedroom", "study", "dining", "storage", "appliances", "accessories", "bundles"]
PIN = Annotated[str, StringConstraints(pattern=r"^[0-9]{6}$")]
Phone = Annotated[str, StringConstraints(pattern=r"^[6-9][0-9]{9}$")]
UUIDText = Annotated[str, StringConstraints(
    pattern=r"^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|0{8}-0{4}-0{4}-0{4}-0{12}|[fF]{8}-[fF]{4}-[fF]{4}-[fF]{4}-[fF]{12})$"
)]


def json_int(value):
    # JSON.parse represents integral decimals as numbers. Keep strings and booleans strict.
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


JsonInt = Annotated[int, BeforeValidator(json_int)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class LineDto(Input):
    productId: Annotated[str, StringConstraints(min_length=1, max_length=80)]
    mode: Mode
    quantity: Annotated[JsonInt, Field(ge=1, le=10)]
    variantId: Annotated[str, StringConstraints(min_length=1, max_length=60)]
    tenure: Annotated[Literal[3, 6, 12], BeforeValidator(json_int)]

    @field_validator("tenure", mode="before")
    @classmethod
    def reject_boolean(cls, value):
        if isinstance(value, bool):
            raise PydanticCustomError("tenure_variant", "invalid tenure")
        return value


class CartDto(Input):
    cartId: UUIDText
    city: Literal["noida"]
    revision: Annotated[JsonInt, Field(ge=0)]
    lines: Annotated[list[LineDto], Field(max_length=25)]


class QuoteDto(Input):
    cartId: UUIDText
    pin: PIN


class AddressDto(Input):
    name: Annotated[str, StringConstraints(min_length=2, max_length=80)]
    phone: Phone
    street: Annotated[str, StringConstraints(min_length=8, max_length=300)]
    pin: PIN


class CheckoutDto(Input):
    quoteId: UUIDText
    signature: Annotated[str, StringConstraints(min_length=64, max_length=64)]
    address: AddressDto
    consent: bool


class SiteDto(Input):
    name: Annotated[str, StringConstraints(min_length=2, max_length=80)]
    pin: PIN
    units: Annotated[JsonInt, Field(ge=1, le=1000)]


class EnquiryDto(Input):
    name: Annotated[str, StringConstraints(min_length=2, max_length=80)]
    email: Annotated[str, StringConstraints(max_length=150)]
    phone: Phone
    company: Annotated[str, StringConstraints(min_length=2, max_length=150)]
    mode: Mode
    consent: bool
    sites: Annotated[list[SiteDto], Field(min_length=1, max_length=10)]

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        local, _, domain = value.rpartition("@")
        labels = domain.split(".")
        if (
            not re.fullmatch(r"[^.\s@]+(?:\.[^.\s@]+)*", local)
            or len(local.encode("utf-8")) > 64
            or len(labels) < 2
            or not labels[-1].isalpha()
            or len(labels[-1]) < 2
            or any(not re.fullmatch(r"[^\W_](?:[^\W_\s-]|-)*[^\W_]|[^\W_]", label) for label in labels)
        ):
            raise PydanticCustomError("email_address", "invalid email")
        return value


class PublishDto(Input):
    published: bool


class CatalogQuery(Input):
    city: Literal["noida"] = "noida"
    mode: Mode | None = None
    category: Category | None = None
    q: Annotated[str, StringConstraints(max_length=80)] | None = None
    sort: Literal["featured", "price-asc", "price-desc", "newest"] = "featured"
    page: Annotated[int, Field(ge=1, le=1000)] = 1

    @field_validator("page", mode="before")
    @classmethod
    def coerce_page(cls, value):
        if not isinstance(value, str):
            return value
        value = value.strip()
        try:
            if value.lower().startswith(("0x", "0b", "0o")):
                return int(value, 0)
            number = Decimal(value or "0")
            if number.is_finite() and number == number.to_integral_value():
                return max(0, min(1001, number)).__int__()
        except (InvalidOperation, ValueError):
            pass
        return value


class CartProductResponse(BaseModel):
    id: str
    slug: str
    name: str
    image: str
    monthlyPaise: int
    purchasePaise: int


class VariantResponse(BaseModel):
    id: str
    name: str
    monthlyDeltaPaise: int


class ComponentResponse(BaseModel):
    productId: str
    quantity: int


class ProductDetails(CartProductResponse):
    category: str
    description: str
    images: list[str]
    material: str
    dimensions: str
    color: str
    depositPaise: int
    cities: list[str]
    variants: list[VariantResponse]
    components: list[ComponentResponse]
    featured: bool
    createdAt: str


class ProductResponse(ProductDetails):
    available: bool
    demo: bool


class AdminProductResponse(ProductDetails):
    sku: str
    stock: int
    active: bool
    published: bool
    companyId: str


class CatalogResponse(BaseModel):
    items: list[ProductResponse]
    total: int
    page: int
    pageSize: int
    demo: bool


class CityResponse(BaseModel):
    id: str
    name: str
    demo: bool


class ServiceabilityResponse(BaseModel):
    pin: str
    city: str
    deliverable: bool
    message: str
    demo: bool


class CartResponse(BaseModel):
    id: str
    ownerId: str | None
    city: str
    lines: list[LineDto]
    products: list[CartProductResponse]
    revision: int
    createdAt: str
    updatedAt: str


class SavedCartResponse(CartResponse):
    demo: bool


class BreakdownResponse(BaseModel):
    subtotalPaise: int
    depositPaise: int
    deliveryPaise: int
    gstPaise: int
    totalPaise: int
    currency: str
    taxLabel: str


class PricedLineResponse(LineDto):
    name: str
    unitPaise: int
    totalPaise: int
    depositPaise: int


class QuoteResponse(BaseModel):
    id: str
    cartId: str
    cartRevision: int
    ownerId: str | None
    city: str
    pin: str
    lines: list[PricedLineResponse]
    breakdown: BreakdownResponse
    policyVersion: str
    signature: str
    expiresAt: str
    createdAt: str
    demo: bool


class OrderRecord(BaseModel):
    id: str
    ownerId: str
    companyId: str
    quoteId: str
    idempotencyKey: str
    requestHash: str
    city: str
    address: AddressDto
    lines: list[PricedLineResponse]
    breakdown: BreakdownResponse
    orderState: str
    paymentState: str
    stockState: str
    deliveryState: str
    externalId: str | None
    failureReason: str | None
    attempts: int
    createdAt: str
    updatedAt: str


class OrderResponse(OrderRecord):
    demo: bool


class OutboxResponse(BaseModel):
    id: str
    orderId: str
    status: str
    leaseUntil: str | None
    availableAt: str
    attempts: int
    lastError: str | None
    createdAt: str


class EnquiryResponse(BaseModel):
    id: str
    status: str
    demo: bool
    message: str | None = None
