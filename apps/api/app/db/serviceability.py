"""Additive LOC tables. The eight legacy ORM tables remain unchanged."""

from sqlalchemy import (
    Boolean, CheckConstraint, Column, ForeignKey, ForeignKeyConstraint, Index,
    Integer, MetaData, Table, Text, UniqueConstraint, text,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP

metadata = MetaData(naming_convention={"pk": "%(table_name)s_pkey"})

preferences = Table(
    "location_preferences", metadata,
    Column("company_id", Text, primary_key=True), Column("subject", Text, primary_key=True),
    Column("pincode", Text, nullable=False), Column("revision", Integer, nullable=False),
    Column("confirmed_at", TIMESTAMP(timezone=True), nullable=False),
    CheckConstraint("revision > 0", name="location_preference_revision"),
    CheckConstraint("pincode ~ '^[1-9][0-9]{5}$'", name="location_preference_pin"),
)

references = Table(
    "postal_reference_versions", metadata,
    Column("id", Text, primary_key=True),
    Column("source", Text, nullable=False),
    Column("license", Text, nullable=False),
    Column("checksum", Text, nullable=False),
    Column("verified_at", TIMESTAMP(timezone=True), nullable=False),
    Column("valid_until", TIMESTAMP(timezone=True), nullable=False),
    Column("complete", Boolean, nullable=False),
    Column("synthetic", Boolean, nullable=False),
    Column("imported_at", TIMESTAMP(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    CheckConstraint("valid_until > verified_at", name="postal_reference_dates"),
)
postal_codes = Table(
    "postal_codes", metadata,
    Column("reference_id", Text, ForeignKey(references.c.id, ondelete="RESTRICT"), primary_key=True),
    Column("pincode", Text, primary_key=True),
    Column("country", Text, nullable=False),
    Column("city", Text), Column("district", Text), Column("state", Text, nullable=False),
    Column("active", Boolean, nullable=False),
    CheckConstraint("pincode ~ '^[1-9][0-9]{5}$'", name="postal_code_format"),
    CheckConstraint("country = 'IN'", name="postal_code_country"),
)
postal_areas = Table(
    "postal_code_areas", metadata,
    Column("reference_id", Text, primary_key=True), Column("pincode", Text, primary_key=True),
    Column("area_id", Text, primary_key=True),
    Column("coverage_scope", Text, nullable=False),
    Column("evidence", Text, nullable=False),
    ForeignKeyConstraint(["reference_id", "pincode"], [postal_codes.c.reference_id, postal_codes.c.pincode], ondelete="RESTRICT"),
    CheckConstraint("coverage_scope IN ('delhi-nct', 'gurugram-city', 'outside', 'unverified', 'demo-noida')", name="postal_area_scope"),
)
cities = Table(
    "delivery_cities", metadata,
    Column("id", Text, primary_key=True), Column("company_id", Text, nullable=False),
    Column("slug", Text, nullable=False), Column("name", Text, nullable=False),
    Column("coverage_scope", Text, nullable=False), Column("active", Boolean, nullable=False),
    UniqueConstraint("id", "company_id", name="delivery_city_company_key"),
    UniqueConstraint("company_id", "slug", name="delivery_city_slug_key"),
)
configuration = Table(
    "serviceability_configuration", metadata,
    Column("company_id", Text, primary_key=True),
    Column("reference_id", Text, ForeignKey(references.c.id, ondelete="RESTRICT")),
    Column("revision", Integer, nullable=False, server_default=text("0")),
    Column("updated_at", TIMESTAMP(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_by", Text, nullable=False),
    CheckConstraint("revision >= 0", name="serviceability_revision_positive"),
)
zones = Table(
    "delivery_zones", metadata,
    Column("id", Text, primary_key=True), Column("company_id", Text, nullable=False),
    Column("city_id", Text, nullable=False), Column("name", Text, nullable=False),
    Column("active", Boolean, nullable=False), Column("operational_status", Text, nullable=False),
    Column("updated_at", TIMESTAMP(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    UniqueConstraint("id", "company_id", name="delivery_zone_company_key"),
    ForeignKeyConstraint(["city_id", "company_id"], [cities.c.id, cities.c.company_id], ondelete="RESTRICT"),
    CheckConstraint("operational_status IN ('open', 'paused', 'closed')", name="delivery_zone_status"),
)
memberships = Table(
    "delivery_zone_pincodes", metadata,
    Column("id", Text, primary_key=True), Column("company_id", Text, nullable=False),
    Column("zone_id", Text, nullable=False), Column("reference_id", Text, nullable=False),
    Column("pincode", Text, nullable=False), Column("active", Boolean, nullable=False),
    Column("effective_from", TIMESTAMP(timezone=True), nullable=False),
    Column("effective_until", TIMESTAMP(timezone=True)),
    ForeignKeyConstraint(["zone_id", "company_id"], [zones.c.id, zones.c.company_id], ondelete="RESTRICT"),
    ForeignKeyConstraint(["reference_id", "pincode"], [postal_codes.c.reference_id, postal_codes.c.pincode], ondelete="RESTRICT"),
    CheckConstraint("effective_until IS NULL OR effective_until > effective_from", name="delivery_membership_dates"),
)
Index("delivery_pin_lookup", memberships.c.company_id, memberships.c.reference_id, memberships.c.pincode, memberships.c.active)
audit = Table(
    "serviceability_audit", metadata,
    Column("id", Text, primary_key=True), Column("company_id", Text, nullable=False),
    Column("pincode", Text, nullable=False), Column("reason_code", Text, nullable=False),
    Column("configuration_revision", Integer), Column("source", Text, nullable=False),
    Column("created_at", TIMESTAMP(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)
Index("serviceability_audit_time", audit.c.created_at)
