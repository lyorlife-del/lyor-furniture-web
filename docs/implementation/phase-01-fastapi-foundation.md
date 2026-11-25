# Phase 01 — FastAPI foundation

Entry requires acceptance of [Phase 00](phase-00-baseline.md).

1. Add `apps/api/pyproject.toml`, locked dependencies, an application entry point, settings, API routers, and Python tests alongside the legacy implementation.
2. Run FastAPI locally on port 4100 while NestJS remains on port 4000. Keep the browser pointed at NestJS.
3. Implement health and PostgreSQL readiness, scoped async connection handling, local and test-only demo identities, and legacy-shaped HTTP errors. Reject malformed deployment settings and preserve the production demo block.
4. Use pytest and HTTPX to verify startup, health, database unavailable behavior, validation, and role denial. Export a candidate OpenAPI artifact for comparison and retain the existing frontend contract until Phase 03 acceptance.

Risk: FastAPI validation and dependency failures can use a different status or response shape from NestJS. Compare against the baseline. Rollback is stopping the parallel Python service. Report the commands and results, append the changelog entry, and stop for acceptance.

## Local runtime

Run from `apps/api/` with uv and Python 3.12. Set `LYOR_ENVIRONMENT` to `development` or `test`, `LYOR_DEMO_MODE=true`, `LYOR_DATABASE_URL` to an approved local PostgreSQL test database, and `LYOR_QUOTE_SECRET` to a synthetic value of at least 32 characters. The Python URL uses a database name and standard psycopg parameters. Use a separate setting from the legacy Prisma URL, which may contain its own `schema` parameter.

```powershell
uv sync --locked
uv run --locked python -m pytest -q
uv run --locked python -m uvicorn app.main:app --host 127.0.0.1 --port 4100 --loop asyncio:SelectorEventLoop
```

Both health operations are available under `/api/v1/health`. Uvicorn publishes the candidate OpenAPI document at `/api/docs-json`, with a [saved Phase 01 copy](fixtures/phase-01-fastapi-openapi.json). The browser proxy still uses NestJS. The test-only routes used to exercise auth, RBAC, and validation are absent from the public candidate.

The explicit selector event loop supports psycopg's async connections on Windows. The default Windows event loop caused readiness to return 503 against a healthy PostgreSQL instance in the first live check. [Psycopg async connections](https://www.psycopg.org/psycopg3/docs/advanced/async.html) · [Uvicorn event loop configuration](https://uvicorn.dev/concepts/event-loop/#custom-event-loop)

## Verification on 25 November 2026

| Check | Actual result |
| --- | --- |
| Python and dependency lock | Workspace-local Python 3.12.16. `uv lock --check --offline` passed. |
| pytest and HTTPX | `uv run --locked --offline python -m pytest -q` passed all 22 tests. Coverage includes invalid configuration, startup, unavailable PostgreSQL, legacy demo identities and role denial, and 400 validation without echoing submitted values. |
| Live health comparison | Ran NestJS on port 4000 and Uvicorn on 4100 against an isolated PostgreSQL test database. HTTPX confirmed matching HTTP 200 liveness and readiness with PostgreSQL running. After stopping the disposable database, both kept HTTP 200 liveness and returned the same HTTP 503 readiness body. |
| OpenAPI | Verified that the published candidate matched the saved artifact and used the existing `health` and `readiness` operation IDs. The frontend contract remains on the legacy specification. |
| Repository checks | `npm.cmd run lint`, `npm.cmd run docs:check`, and `git diff --check` passed. |

The database check used a read-only `SELECT 1` against a newly created isolated database. SQLAlchemy model mapping and Alembic migrations start in Phase 02. Business endpoint parity and route-specific validation wording remain Phase 03 checks.

The temporary processes were stopped after verification. The rollback action is to stop or omit the parallel FastAPI process. Phase 01 was accepted on 25 November 2026.
