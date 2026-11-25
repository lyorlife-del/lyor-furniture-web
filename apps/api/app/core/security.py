from dataclasses import dataclass
from typing import Annotated, Literal

from fastapi import Depends, Header, HTTPException, Request

from .config import Settings


@dataclass(frozen=True)
class Identity:
    id: str
    role: Literal["customer", "catalog", "admin"]


DEMO_IDENTITIES = {
    "Bearer demo-customer-a": Identity("customer-a", "customer"),
    "Bearer demo-customer-b": Identity("customer-b", "customer"),
    "Bearer demo-catalog": Identity("catalog-manager", "catalog"),
    "Bearer demo-admin": Identity("system-admin", "admin"),
}


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def require_identity(
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header()] = None,
) -> Identity:
    if not settings.demo_mode or settings.environment not in {"development", "test"}:
        raise HTTPException(401, "Demo identities are disabled")
    identity = DEMO_IDENTITIES.get(authorization) if authorization is not None else None
    if identity is None:
        raise HTTPException(401, "Select a local demo identity")
    return identity


def require_staff(identity: Annotated[Identity, Depends(require_identity)]) -> Identity:
    if identity.role not in {"catalog", "admin"}:
        raise HTTPException(403, "Staff permission required")
    return identity


def require_admin(identity: Annotated[Identity, Depends(require_identity)]) -> Identity:
    if identity.role != "admin":
        raise HTTPException(403, "Administrator permission required")
    return identity
