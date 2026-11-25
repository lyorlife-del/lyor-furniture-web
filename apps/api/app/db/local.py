from sqlalchemy.engine import URL

from app.core.config import Settings


def local_fixture_url(settings: Settings) -> URL:
    url = settings.psycopg_url()
    demo = (url.username, url.port, url.database) == ("lyor", 5432, "lyor")
    test = (
        url.username == "lyor_test"
        and url.port == 5433
        and url.database is not None
        and url.database.startswith("lyor_test_")
    )
    if (
        url.host != "127.0.0.1"
        or url.query
        or not (
            (settings.environment == "development" and demo)
            or (settings.environment == "test" and test)
        )
    ):
        raise ValueError("Use the local LYOR demo database or an isolated LYOR test database")
    return url.update_query_dict({"hostaddr": "127.0.0.1"})
