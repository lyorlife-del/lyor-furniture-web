# Location and delivery serviceability implementation plan

Started 2026-11-27. This is the active LOC record. LOC gates are separate from FastAPI migration Phases 00–07; migration Phase 05 remains in progress. Stop after each LOC gate for user acceptance. LOC-00 is architecture preparation, not a claim of implemented production behavior.

## Phase gates

| Phase | Status | Deliverables and required exit evidence |
| --- | --- | --- |
| LOC-00 Audit and architecture | Accepted 2026-11-27 | Repository findings, HLD/LLD, additive data design, provider terms/pricing review, flows, rollout/rollback and baseline check results |
| LOC-01 Manual PIN validation | Accepted 2026-11-27, live source pending | Database-backed manual eligibility, reviewed-source import, synthetic fixture, UI confirmation and isolated migration evidence below |
| LOC-02 Current location | Accepted 2026-11-27 on local evidence | One-shot detection, provider abstraction, independent PIN check, correction, shared quota controls and failure tests. Approved live staging smoke pending |
| LOC-03 Catalogue | Locally verified, awaiting acceptance | Persistent confirmed preference, configured cities, optional PIN-aware catalogue/detail queries, stale-response rejection, quote invalidation and cart warnings |
| LOC-04 Cart and checkout | Pending LOC-03 acceptance | Versioned delivery quote/request context, address checks, capacity holds and idempotent lifecycle, fresh transaction checks; stock/slot conflict, stale quote, pause race, duplicate submission/release and external uncertainty tests |
| LOC-05 Admin and expansion interest | Pending LOC-04 acceptance | Authorized zone/membership/effective-date/pause/capacity controls, optimistic revision/audit, explicit notification consent and opt-out; no unsolicited sends |
| LOC-06 Production readiness | Pending LOC-05 acceptance and release dependencies | Full API/browser/DB/contract tests, approved live-provider smoke, performance/load and security evidence, operational quotas/costs, staging/rollback rehearsal. Production changes and deployment require separate approval |

## Design records

- [High-level design and actual repository audit](../architecture/location-serviceability-hld.md)
- [Low-level services, endpoints, compatibility and UI state](../architecture/location-serviceability-lld.md)
- [Additive database and migration design](../architecture/serviceability-database.md)
- [Geocoding provider, privacy, terms, quotas and costs](../architecture/geocoding-provider-design.md)
- [Manual PIN flow](../flows/manual-pincode-check.md), [current-location flow](../flows/current-location-detection.md), [eligibility/slots flow](../flows/delivery-serviceability.md) and [checkout flow](../flows/location-aware-checkout.md)

## Approved policy and pending inputs

The user confirmed coverage for all valid PIN codes in Delhi's entire NCT and Gurugram city (Gurgaon). Do not request the coverage policy again. The approved postal dataset/provider and verified PIN list do not yet exist. Build the list from that policy after source approval, with source version and administrative-boundary evidence. Noida remains the accepted synthetic demo and separate Odoo display pilot; it is not an approved January live area.

| Dependency | Needed for | Current state |
| --- | --- | --- |
| Licensed maintained postal source, completeness and update owner | Distinguishing unknown PIN from source gaps; deriving NCT/city coverage | Pending; no live geography may be invented |
| Exact city-boundary mapping and cross-boundary PIN handling | Applying approved Gurugram city policy correctly | Derive/review after source approval; never use district/prefix alone |
| Zone operational owner, effective dates and capacity calendar | Slot offers and final holds | Pending; absent calendar means no available slots |
| Approved Google staging project/key, billing applicability and quotas | Live resolver smoke | Not supplied in this task; keep keys out of chat |
| Real identity and production settings | Secure live customer/admin use | Existing FastAPI settings/auth are demo-only; separate migration/release dependency |
| Odoo date-aware stock/reservation and payment verification contracts | Confirmed commercial booking | Phase 05 integration evidence remains pending; retain request-only states |
| Atlas/PMS and notification contracts where applicable | Fulfilment/site references and opt-in messages | Gated until approved; no unsolicited sends |
| Privacy, audit retention and provider attribution review | Live geographic processing | Design recorded; operational review pending |

Implementation can use named synthetic fixtures for automated tests and local development while these inputs are pending. It cannot claim real postal validity, live serviceability or confirmed booking from those fixtures. `DEMO-001` will be a new explicit fixture, not an existing discovered production record. Include `122002` serviceable, `400001` out-of-area and `110024` covered/no-slot scenarios.

## Verification matrix

Preserve all legacy contract and signing vectors. Generate new FastAPI schemas separately; the root `npm.cmd run contracts` currently generates the legacy contract, not new Python endpoints. Extend differential assertions to the legacy operation subset as new FastAPI operations are added. Rehearse Alembic additions on fresh and restored isolated PostgreSQL copies, preserving original table rows and immutable migration history.

Backend coverage must include outer-whitespace normalization, ASCII/length/first-digit failures, repeated/missing parameters, unknown PIN, incomplete/stale reference, wrong-company access, disabled/paused zone, effective-date boundaries, concurrent configuration changes, slot overbooking/release/expiry, malicious client availability/price claims, owner-scoped quote and idempotency rules, and rollback without losing audit or external references. Use HTTPX mocked provider transport and real isolated PostgreSQL for constraints/concurrency. Redis failure and multi-instance paid-call limits need actual Redis evidence.

Browser coverage must include desktop/tablet/mobile, keyboard/focus/live announcements, current-location permission granted/denied/unavailable/timeout, no PIN/multiple PINs/provider error, correction and explicit confirmation, stale callback rejection, reload/cross-tab persistence, catalog refresh, retained cart/variants/tenure, no GPS prompt on load, and recoverable checkout errors. Existing Playwright config has one desktop project with some mobile test viewports; it has no dedicated tablet/geolocation test coverage.

LOC-06 should record p50/p95/p99 PIN and provider latency, throughput, dataset/zone size, database pool usage, cache behavior if introduced, quota failures, actual provider requests, retries and estimated monthly cost. Target database-backed PIN p95 under 150 ms in staging as a proposed budget, not a measured result. Final hold checks always bypass advisory caches. Controlled provider calls require approved input/budget and produce no persistent GPS/provider payload artifacts.

## LOC-00 verification evidence

Results from 2026-11-27 apply to the existing repository baseline, not unimplemented LOC features. The working tree already contained staged storefront changes when this task began; those were preserved.

| Command/check | Actual result |
| --- | --- |
| `npm.cmd run lint` | Passed |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd test` | API: 8 passed, 7 database cases skipped; web: 2 passed. Existing Vite configuration warning |
| `npm.cmd run test:db` | Restricted run failed at Windows `uv_os_get_passwd`/ENOMEM; approved unrestricted rerun passed all 15 API tests on a new isolated localhost database |
| `npm.cmd run contracts` | Restricted write failed EPERM; approved unrestricted rerun passed. Generated contract files have no diff |
| `npm.cmd run build` | Restricted build failed writing existing `apps/api/dist`; approved unrestricted rerun passed API and Next.js builds |
| Python `.venv/Scripts/python.exe -m pytest -q -p no:cacheprovider` | 41 passed, 4 database-dependent tests skipped because their isolated database URLs were unset |
| `npm.cmd run test:e2e` | 13 passed in 18.7 seconds against FastAPI on a fresh `lyor_test_loc00_*` localhost database, using an ignored web-source copy at port 3160 and API at 4160. Existing desktop project includes mobile-view tests; tablet/geolocation feature tests remain later work |
| `npm.cmd run docs:check` and `git diff --check` | Passed: 199 Markdown documents, historical 20 flows/109 step documents and local links; no whitespace errors |
| Figma reference | Checkout/account node 17:20 screenshot inspected through Figma MCP; no design writes |
| Live geocoding, live zone/stock/payment, GCP and load verification | Not run; credentials/data/contracts/release configuration not supplied or approved for these actions |

An initial attempt to create an ignored `.data/loc00` log folder was denied by the restricted account before lint executed; lint was then run directly and passed. These environmental failures do not establish application failures, and skipped checks are not passes.

Browser verification used the ignored helper `.data/loc00/verify-browser.mjs`, run with `node .data/loc00/verify-browser.mjs` under approved unrestricted execution. It migrates/seeds a new isolated test database, runs temporary FastAPI/Next.js processes and invokes `npm.cmd run test:e2e` with `PREVIEW_URL=http://127.0.0.1:3160`; it stops its processes and test PostgreSQL afterward. The first preview attempt encountered an existing Next.js developer instance and did not run tests. The successful retry copied only web source, public assets and nonsecret project configuration to `.data/loc00/web`; it neither reused the development database nor stopped the user's developer server. Test database names were `lyor_test_loc00_1795762617766` (aborted preview) and `lyor_test_loc00_1795762666931` (passed run); they remain isolated evidence. Temporary helper/log/build/browser output remains ignored. Build-generated `next-env.d.ts` changes were restored to the pre-check content.

Existing Next.js image aspect-ratio warnings appeared in the preview; no visual fix was included in this documentation gate. Python database skips remain explicitly unexecuted rather than being inferred from the separate legacy database-suite pass.

## Rollback and acceptance

LOC-00 changes only the new location documentation plus appended master plan, decision and history records. Roll back only those additions while preserving the user's pre-existing staged changes. No application behavior, API schema, database schema, stock, payment, external system, worker ownership or deployment changes occur at this gate.

Later rollback first disables new feature writes, accounts for active holds/outbox/upstream references and restores a compatible application without dropping referenced new tables. Keep demo and live event versions separated; never route a new delivery request to the legacy demo worker. Production migrations, worker cutover and deployment each retain explicit authorization requirements.

The user accepted LOC-00 on 2026-11-27 and authorized LOC-01. See the LOC-01 record below for implementation scope and its separate acceptance gate.

## LOC-01 implementation record

The backend implementation is `app/api/v1/serviceability.py`, `app/services/serviceability.py` and `app/services/postal_import.py` under `apps/api/`. SQLAlchemy Core definitions live in `app/db/serviceability.py`. Alembic `0002_location_reference` adds eight tables from frozen SQL; it changes none of the eight legacy tables. No production or existing development database was migrated during verification.

`GET /api/v1/serviceability/pincode/{pincode}` now evaluates postal validity and database-configured eligibility, returns source/configuration versions and typed reasons, writes a coordinate-free decision audit, and sends `Cache-Control: no-store`. Missing/malformed PIN is HTTP 400, an unknown PIN or known outside-area PIN is a typed HTTP 200 negative, and disabled/missing/stale/incomplete/wrong-mode reference or database failure is HTTP 503. Extra query parameters are rejected. The original `/serviceability?pin=...`, catalogue, pricing, signing, orders and workers keep their demo contracts.

The new endpoint defaults to disabled through `LYOR_SERVICEABILITY_MODE=disabled`. Explicit `demo` permits synthetic reference data; `reference` requires a nonsynthetic reviewed reference. FastAPI itself still permits only local/test demo runtime settings. This phase does not enable production identity, geocoding, real service areas or commercial booking.

`LOCATION_SERVICEABILITY_ENABLED=true` selects the new dialog on the Next.js server. Its default is false, preserving the existing Noida demo and legacy runtime. There is no automatic fallback to the old success path when a new check fails. The new dialog keeps manual input editable while checking, aborts stale work, displays synthetic-data labels, and requires Use this PIN after an eligible result. Saving the PIN retains the cart/variant/tenure, clears the quote and persists PIN/city for reload. It does not yet personalize the Noida catalogue or implement cross-tab/server preference synchronization; those remain LOC-03. Slot checks and checkout changes remain LOC-04; Notify Me remains LOC-05, with the existing enquiry link available now.

### Offline import and operational boundary

The strict JSON manifest includes company, immutable reference ID/provenance/license/verification/expiry/completeness/synthetic flag, postal rows with administrative-area evidence, and a zone snapshot with effective dates. Duplicate PINs, zone assignments, inconsistent city definitions and unverified/cross-boundary scope assignments are rejected. A reference is staged without enabling it; activation requires a current complete version and explicitly replaces the company's operational zone snapshot under a configuration-row lock. Source content is immutable by checksum; reusing a version ID for different source data fails. Configuration activations record actor, time, old/new reference and revision in `AuditLog`, preserving inactive membership history. Each activation increments the revision; replaying an activation is not a no-op, but never duplicates active memberships.

The only shipped dataset is `apps/api/tests/fixtures/postal-demo.json`: four synthetic postal rows and three demo zones, including `DEMO-001`, `122002`, `400001`, `110024`, and legacy continuity PIN `201304`. Its completeness flag means a closed synthetic test universe, not a national postal dataset. The `110024` scenario establishes eligibility only; there is no capacity table or slot-success response in this phase.

The importer normalizes an already reviewed offline manifest; no India Post format or external postal provider has been chosen. A nonsynthetic file requires `--reviewed-source`, which records the operator's explicit assertion of prior approval, not automated verification of its license or accuracy. Do not use that flag until the pending source approval is obtained. City-boundary/alias normalization is a source preparation responsibility, never a PIN-prefix inference.

Validate the synthetic manifest from `apps/api/` without credentials or database access:

```powershell
.\.venv\Scripts\python.exe -m app.services.postal_import tests/fixtures/postal-demo.json
```

On an explicitly configured isolated localhost test database, migrate with `python -m alembic upgrade head`, then use `python -m app.services.postal_import tests/fixtures/postal-demo.json --apply --activate --actor LOCAL-REVIEWER`. The importer enforces the existing local fixture URL restrictions and refuses production/network targets. New production migration/configuration actions require separate approval. Do not apply the sample to real service areas.

Reproduce the complete isolated rehearsal from the repository root:

```powershell
node tests/parity/loc01-verification.mjs
```

It requires the existing Python `.venv`, Node dependencies, local browser, and free ports 5433, 4161, 3161 and 3162. It refuses occupied ports, creates fresh/source-cloned localhost databases, checks Alembic and all Python tests with their isolated URLs configured, then runs baseline and feature browser suites against ignored source copies. It stops only its own services; evidence and test databases remain isolated. On restricted Windows accounts it may require execution outside that account, as recorded at LOC-00. No developer server or sibling repository is changed.

Regenerate the additive Python contract with `npm.cmd run contracts:fastapi`. The original `npm.cmd run contracts` continues generating the untouched legacy contract. The legacy API parity test now requires every original path as a subset, while preserving method/operation/status checks; new operations are tested separately.

### LOC-01 verification and acceptance

Initial local pytest without database URLs passed 54 tests and skipped database-dependent cases. The full isolated rehearsal then passed 66 Python tests with no skips, including fresh/restored schema and row/history equivalence, empty-schema downgrade/re-upgrade, staging immutability, source failure classification, company isolation, conflicting mappings, effective dates and concurrent activation. Alembic metadata drift check reported no new operations. An initial disabled-mode test used `None` instead of a session and was corrected to verify the endpoint through the real application lifecycle without opening a database connection.

The first browser rehearsal passed the 13 existing journeys and failed four new assertions because of hidden-background role queries and an early cart-ID read. Those test assumptions were corrected; final rerun outcomes and the remaining required checks are recorded before phase close. No live geographic, stock, slot, payment, provider, load or GCP verification is claimed.

The corrected browser run then exposed a real existing tablet navigation overflow: the Browse all rentals link extended 10 pixels beyond a 768-pixel viewport. Extended the existing horizontal navigation-scroll behavior to the 850-pixel tablet breakpoint in `marketplace.css`. Desktop, tablet and mobile checks subsequently passed. No carousel, search, wishlist, price or route behavior was changed.

Final evidence on 2026-11-27:

| Command/check | Actual final result |
| --- | --- |
| `npm.cmd run lint` | Passed |
| `npm.cmd run typecheck` | Passed; the restricted attempt failed writing the existing incremental cache, then the approved unrestricted run passed |
| `npm.cmd test` | API 8 passed/7 DB cases skipped; web 2 passed; existing Vite configuration warning |
| `npm.cmd run test:db` | 15 passed on a new isolated localhost database |
| `npm.cmd run contracts` | Passed; both original legacy generated files have no diff |
| `npm.cmd run contracts:fastapi` | Passed; candidate OpenAPI/types add two operations without modifying original paths/components |
| `npm.cmd run build` | API and Next.js passed after the tablet CSS fix |
| `node tests/parity/loc01-verification.mjs --backend-only` | 67 Python tests passed, no skips, in 4.53 seconds; all required isolated DB URLs configured. Fresh/restored schema/record/history checks, Alembic drift check, empty downgrade/re-upgrade, populated downgrade rejection, import rollback and concurrent activation passed |
| `npm.cmd run test:e2e` with isolated FastAPI and the original dialog | 13 existing tests passed in 20.1 seconds; five new feature scenarios intentionally skipped because their server flag was off |
| `node tests/parity/loc01-verification.mjs --location-only` | Invoked `npm.cmd run test:e2e -- tests/e2e/manual-location.spec.ts`; all 5 feature scenarios passed in 9.1 seconds, including 1440 px desktop, 768 px tablet and 390 px mobile, manual errors, confirmation, reload, stale requests, API failure, cart retention, tenure and quote invalidation |
| `npm.cmd run docs:check`, whitespace and legacy-contract diff checks | Passed: 199 Markdown documents and local links; no whitespace errors or legacy contract diff |
| Live postal source, geocoding, real delivery zones/slots, stock/payment and deployment | Not run or enabled. Approved source/list and the later phase contracts remain pending |

Rehearsal results/logs remain ignored under `.data/loc01`. The final backend run used `lyor_test_loc01_1795764095530_*` and a dedicated `lyor_test_odoo_loc01_1795764095530` preview database; the successful feature-browser run used `lyor_test_loc01_1795763954062_*`. Existing browser regressions ran on `lyor_test_loc01_1795763702621_*`. Only isolated fixture records were written. Temporary API/web/PostgreSQL processes were stopped, and build-generated `next-env.d.ts` changes were restored. No package dependencies were added. The new migration SQL is frozen after whitespace normalization.

The rehearsal supports `--backend-only` and `--location-only` to rerun only affected checks. These options still create fresh isolated fixtures and verify their migration boundary; neither option implies a pass for the skipped portion. The no-argument command runs the full rehearsal. Code review also added old/new zone summaries to configuration audits and an explicit failed-activation rollback test before the final backend run.

Rollback disables `LOCATION_SERVICEABILITY_ENABLED` and `LYOR_SERVICEABILITY_MODE`, restores the previous compatible application, and retains added data/audits. New schema downgrade is allowed only when every added table is empty; populated downgrade is intentionally blocked. Existing quote/payment/worker behavior is unchanged. LOC-01 technical evidence is complete and awaits acceptance before LOC-02; live postal-source acceptance remains pending independently.

## Deferred extensions

See the LOC-02 evidence below for current provider support.

Keep interfaces ready for additional business-approved cities, address maps, polygon eligibility, approved distance/volume fees, forecast estimates, aggregated demand reporting, Odoo warehouse-aware stock, Atlas route/crew optimization, consented expansion notifications and alternative providers. Do not implement those capabilities during the initial LOC phases unless their scope is separately approved.

## LOC-02 current location · 2026-11-27

LOC-01 accepted. Added the browser one-shot permission flow, POST resolver and disabled/mock/Google adapters. A customer can edit the PIN during detection, see its independent delivery status and confirm the selected PIN. Exact coordinates exist only in the request path. Suggested PINs and provider content are excluded from the manual audit. The customer-confirmed preference still uses the LOC-01 cart and quote behavior. This phase adds no database migrations.

| Verification | Actual result |
| --- | --- |
| Lint, type checks, API and Next.js builds | Passed |
| Unit and isolated legacy DB suites | 8 API unit passes plus 7 DB skips in the default unit run, 2 web passes, 15 passed in the separate DB run. Existing Vite warning |
| Legacy and candidate contract generation | Passed. The candidate adds the resolver. Legacy generated contract files have no diff |
| Offline Python dependency lock check | Passed, 50 packages resolved |
| Full isolated Python suite | 98 passed, zero skipped, 5.61 s. One Starlette test-client deprecation warning. Includes simulated transport timeout, invalid/oversized payloads, quota, ambiguity, missing PIN/country, disabled path, invalid input and Redis failure |
| Browser suite | Baseline 13 passed in 21.6 s; 10 opt-in cases skipped there and run separately. Feature preview 10 passed in 14.4 s, including all five new detection cases and existing responsive PIN checks. Permission granted, denied, unavailable, timed out, manual correction and stale callbacks exercised |
| Redis 7 isolated container | Concurrent peer and aggregate budget exhaustion, cooldown and single recovery probe passed. Docker Desktop initially stopped; started for this check. Temporary Redis container removed |
| PostgreSQL and migrations | Fresh and restored checks and Alembic drift passed in the full rehearsal, run ID 1795775525074 |
| Documentation and whitespace | 199 Markdown documents, 20 flows and 109 step documents verified. Local links and `git diff --check` passed |

Reproduce from the repository root in PowerShell with the existing local dependencies:

```powershell
node tests/parity/loc01-verification.mjs
.\apps\api\.venv\Scripts\python.exe tests/parity/loc02-redis.py
```

The Redis check requires a local Docker engine and cached `redis:7-alpine` image. The browser rehearsal uses explicit mock mode, synthetic points and isolated postal data. No Google traffic, billing, physical GPS accuracy or live postal coverage was tested. The live smoke requires a reviewed postal reference, verified coverage list and approved provider access, disclosures and quota configuration. Keep credentials in the API secret environment.

Rollback sets `LOCATION_DETECTION_ENABLED=false`, `LYOR_GEOCODING_PROVIDER=disabled` and `LYOR_GEOCODING_LIVE_ENABLED=false`, then restarts the affected local processes. The manual PIN flow can stay enabled. LOC-02 awaits user acceptance before LOC-03.

## LOC-03 catalogue · 2026-11-27

The user accepted LOC-02 on its local evidence. LOC-03 adds server-confirmed preferences, configured city discovery and optional `deliveryPin` reads on the existing catalogue and product endpoints. The opt-in storefront refreshes listings, related pieces, bundles and indicative prices after confirmation. An existing detail page keeps the selected finish and tenure across a PIN change. The cart retains all lines and shows a corrective action when the selected quantities or items are unavailable. A new PIN invalidates the existing quote. Signed prices and the Noida demo checkout still use their existing backend rules.

Run `node tests/parity/loc01-verification.mjs` from the repository root in PowerShell for the full isolated rehearsal. It owns temporary processes and disposable database copies. Only its web database gains a second fictional sofa finish and a Gurugram assignment for one fictional bed. These fixtures exercise positive and negative results without assigning real products or editing the development catalogue.

| Check | Actual result |
| --- | --- |
| Full isolated rehearsal, run 1795777166361 | 100 Python tests passed in 5.38 s, zero skips. 13 baseline browser journeys passed in 20.7 s. The 11 gated location journeys skipped in baseline mode and all passed in the feature preview in 17.7 s |
| Preference integrity | Guest and distinct signed-in owners isolated. Simultaneous create and update each produced one successful save and one HTTP 409. Changed zone status was rechecked |
| Browser behavior | Cross-tab refresh, reload, PIN-specific positive and empty catalogue results, option retention, preserved search/sort, cart warnings and stale quote removal passed. Desktop, tablet and mobile confirmation passed |
| Final feature rerun, run 1795777361201 | All 11 browser cases passed again in 17.3 s, including rejection of a guest preference write without its session cookie |
| Documentation and whitespace | 199 Markdown documents, 20 flows and 109 step documents verified; local links and whitespace checks passed |
| Alembic | Fresh and restored upgrades preserved the eight legacy tables and records. Metadata drift and empty downgrade/re-upgrade passed. A downgrade attempted on a populated preference table was rejected and the database remained at `0003_location_preferences` |
| Required workspace checks | Lint, type checks, builds, both contract generators and unit tests passed. Default unit run had 8 API passes, 7 database skips and 2 web passes. All 15 API tests passed in the separate isolated DB run. The original legacy generated contracts have no diff |

The initial browser run passed the 13 baseline cases and 7 of 11 location cases. The shared proxy reached its existing 180/minute API limit across the consecutive suites, and the initial variant test targeted a product with one finish. The harness now waits for the next rate-limit window between suites and supplies a multi-finish fixture in its isolated web database. A product-page JSX lint error was corrected. Existing Vite, Starlette test-client and Next.js image warnings remain.

Enable locally with `LOCATION_CATALOGUE_ENABLED=true` alongside the database-backed location dialog and migrated demo API. Roll back the web behavior by setting this flag to false and restarting the web process. Retain populated preferences on application rollback. Live postal data, verified warehouse-to-zone stock, rental rates and live geocoding smoke remain outstanding. This gate covers synthetic catalogue behavior only. LOC-04 awaits acceptance.
