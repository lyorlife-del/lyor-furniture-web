from typing import Literal, Self

from pydantic import Field, SecretStr, ValidationError, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import ArgumentError


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="LYOR_", hide_input_in_errors=True)

    environment: Literal["development", "test", "production"] = "development"
    demo_mode: bool = False
    database_url: SecretStr
    quote_secret: SecretStr = Field(min_length=32)
    serviceability_mode: Literal["disabled", "demo", "reference"] = "disabled"
    serviceability_company_id: str = Field(default="lyor-demo", min_length=1, max_length=80)
    geocoding_provider: Literal["disabled", "mock", "google"] = "disabled"
    geocoding_live_enabled: bool = False
    google_geocoding_api_key: SecretStr | None = None
    geocoding_redis_url: SecretStr | None = None
    geocoding_daily_limit: int = Field(default=100, ge=1)
    geocoding_minute_limit: int = Field(default=5, ge=1)

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: SecretStr) -> SecretStr:
        try:
            url = make_url(value.get_secret_value())
        except (ArgumentError, ValueError):
            raise ValueError("use a PostgreSQL connection URL") from None
        if url.drivername not in {"postgresql", "postgresql+psycopg"} or not url.database:
            raise ValueError("use a PostgreSQL URL with an explicit database name")
        if "schema" in url.query:
            raise ValueError("remove the Prisma-only schema query parameter")
        return value

    @model_validator(mode="after")
    def require_local_demo(self) -> Self:
        if not self.demo_mode or self.environment not in {"development", "test"}:
            raise ValueError("the foundation permits local and test demo mode only")
        return self

    def psycopg_url(self) -> URL:
        return make_url(self.database_url.get_secret_value()).set(
            drivername="postgresql+psycopg",
        )


def load_settings() -> Settings:
    try:
        return Settings()
    except ValidationError as error:
        # ASGI startup logs should show field names and reasons without inputs.
        problems = error.errors(include_input=False, include_context=False, include_url=False)
        summary = "; ".join(
            f"{'.'.join(str(part) for part in item['loc']) or 'settings'}: {item['msg']}"
            for item in problems
        )
        raise RuntimeError(f"Invalid LYOR settings: {summary}") from None
