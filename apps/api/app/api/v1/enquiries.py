from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.db.models import BusinessEnquiry

from .cart import CART_REFERENCE
from .common import VALIDATION, Db, IdempotencyKey
from .contracts import EnquiryDto, EnquiryResponse
from .pricing import request_hash

router = APIRouter(tags=["Business"])


async def by_key(db: Db, key: str):
    return await db.scalar(select(BusinessEnquiry).where(BusinessEnquiry.idempotency_key == key))


@router.post(
    "/b2b/enquiries", status_code=201, operation_id="createBusinessEnquiry",
    response_model=EnquiryResponse, response_model_exclude_none=True, responses=VALIDATION,
)
async def create_enquiry(body: EnquiryDto, db: Db, idempotency_key: IdempotencyKey = None):
    if not CART_REFERENCE.fullmatch(idempotency_key or "") or not body.consent:
        raise HTTPException(400, "Submission key and consent are required")
    data = body.model_dump()
    digest = request_hash(data)
    async with db.begin():
        prior = await by_key(db, idempotency_key)
        if prior:
            if prior.request_hash != digest:
                raise HTTPException(409, "Submission changed. Use a new submission key.")
            return {"id": prior.id, "status": prior.status, "demo": True}
        table = BusinessEnquiry.__table__
        created = (await db.execute(insert(table).values(
            idempotencyKey=idempotency_key, requestHash=digest,
            contact={name: data[name] for name in ("name", "email", "phone", "company")},
            sites=data["sites"], mode=body.mode,
        ).on_conflict_do_nothing(index_elements=["idempotencyKey"]).returning(
            table.c.id, table.c.status,
        ))).one_or_none()
        if created is None:
            prior = await by_key(db, idempotency_key)
            if prior.request_hash != digest:
                raise HTTPException(409, "Submission key conflict")
            return {"id": prior.id, "status": prior.status, "demo": True}
        return {
            "id": created.id, "status": created.status, "demo": True,
            "message": "Demo enquiry saved locally. No sales team has been contacted.",
        }
