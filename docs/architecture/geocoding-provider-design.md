# Geocoding provider design

LOC-02 implements the provider boundary described below. Google documentation and published terms/pricing were inspected on 2026-11-27. Account-specific billing, public disclosures and a live staging smoke remain pending.

### Implemented behavior

`POST /api/v1/serviceability/resolve-location` accepts strict finite JSON numbers for latitude, longitude and optional accuracy in metres. It returns an approximate candidate with provider identity and the full independent PostgreSQL eligibility decision. A provider candidate never writes a manual-check audit row. Unresolved, ambiguous and outside-India results return 409. Input errors return 400, admission limits 429, source/provider failures 503 and timeouts 504. The UI requires explicit confirmation and always allows manual correction.

Settings use the `LYOR_` prefix. The Google adapter requires provider `google`, live enablement, a server-only key, a dedicated Redis URL and reference serviceability mode. The local mock requires `mock` plus demo serviceability mode. The web server shows the control when both `LOCATION_SERVICEABILITY_ENABLED` and `LOCATION_DETECTION_ENABLED` are true. Configure the two applications together. Only explicitly mapped synthetic coordinates yield a mock PIN.

The shipped adapter makes **one paid attempt per user action** with a five-second total provider deadline, one-second connect and three-second I/O timeout. Redis atomically caps attempts per hashed API peer per UTC minute and per project per UTC day across replicas using the same Redis. Default limits are 5 and 100. A storefront proxy may share a peer bucket across customers. Use the same dedicated Redis across all replicas sharing the key and configure trusted ingress before staging. The daily counter measures admitted attempts. Quota exhaustion cools the provider for 60 seconds, then permits at most one probe per minute during the ten-minute recovery interval. Manual entry uses its existing independent path. HTTPX is a locked runtime dependency. The provider uses direct HTTPS transport, a fixed endpoint, bounded response size and no response cache. Live release still requires review of ingress, tracing and billing controls.

## Provider contract

`GeocodingProvider.reverse(latitude, longitude)` returns typed candidate Indian PINs with provider status, ambiguity and attribution requirements. The service then checks the approved postal reference and LYOR zones. Providers cannot declare delivery eligibility or confirm an address. Implement `DisabledGeocodingProvider` as the default, `MockGeocodingProvider` only for explicit development/test, and `GoogleGeocodingProvider` only with approved server configuration. A missing live key never selects mock success.

Use async HTTP with fixed allowlisted HTTPS provider endpoints, TLS verification, redirects disabled, bounded response size and strict response parsing. For the planned Google v3 reverse-geocoding adapter, parse structured `address_components` by `types`, require country short name `IN`, extract exact PINs and reject inconsistent/ambiguous candidates. Never parse the last six digits of a formatted address. Google reverse geocoding may return multiple geographic results; it does not promise a deliverable doorstep or a numerical confidence score. [Google reverse-geocoding request/response reference](https://developers.google.com/maps/documentation/geocoding/guides-v3/requests-reverse-geocoding)

The customer may initiate a new lookup after a failure. Every new attempt consumes the applicable Redis budget. Validate latency in staging.

## Failure mapping

| Condition | Application outcome |
| --- | --- |
| Browser unsupported, permission denied, device unavailable or timeout | Client explains the condition and offers manual entry; no provider call |
| Low browser accuracy | Show approximate result for confirmation; if conflicting PINs remain, require manual entry |
| `ZERO_RESULTS`, no postal component or non-India result | Typed unresolved/outside-India result; no fabricated PIN |
| Multiple distinct plausible PINs | Ambiguous result; manual correction/confirmation required |
| Provider malformed JSON, bad schema or oversized response | 503 `provider_invalid_response`; redact payload |
| `OVER_QUERY_LIMIT`, resource exhaustion or HTTP 429 | 503 `provider_quota_exceeded`; circuit opens; no paid retry storm |
| `REQUEST_DENIED`, billing/credential errors | 503 `provider_unavailable`; alert operator, hide provider details |
| Transient server failure or network error | 503 and manual entry; timeout maps to 504 |
| Local abuse or account request budget exceeded | 429 with Retry-After; manual database lookup remains available under its own limits |

Use a shared Redis rate limiter before paid calls, configurable project request budget and a circuit breaker with bounded half-open probes. Redis failure blocks the paid path and preserves manual entry. Restrict keys to the selected API and supported server egress identity/IP controls; do not claim browser referrer restrictions secure a server key. Configure Google-side daily quotas and billing alerts. [Google usage and quota documentation](https://developers.google.com/maps/documentation/geocoding/usage-and-billing)

## Credentials, privacy and caching

Inject `LYOR_GOOGLE_GEOCODING_API_KEY` and `LYOR_GEOCODING_REDIS_URL` into the API process through approved secret handling. Both use SecretStr. Set `LYOR_GEOCODING_LIVE_ENABLED=true` only for an approved live configuration. Cloud Run requires a separately approved Secret Manager binding and least-privilege service identity.

Coordinates exist only in the browser's one-shot result, POST body and in-memory provider request. Suppress coordinate/request-body logging, outbound provider query strings and sensitive trace attributes. Do not store Google responses, formatted addresses, GPS or a shared geocode cache in Redis/PostgreSQL. Persist only customer-confirmed preferences and independently sourced postal metadata; provenance must distinguish those from provider content.

Google permits use without a map under its applicable terms, with attribution. Published terms contain specific caching exceptions with purpose and user-isolation conditions; they do not authorize building a shared postal-reference dataset. LYOR chooses no persistent provider cache initially. Any retention change requires field/purpose/account review before implementation. [Service-specific terms, Geocoding section](https://cloud.google.com/maps-platform/terms/maps-service-terms) · [Geocoding policies and attribution](https://developers.google.com/maps/documentation/geocoding/policies)

Display the required Google Maps attribution next to provider-derived results and provide public privacy/terms disclosures before live enablement. The current demo policies page is not evidence of completed provider disclosures. An alternative provider must declare its own attribution, retention and failure behavior through the adapter contract.

## Cost and verification

The inspected global Geocoding pricing lists a 10,000 monthly free-use cap and USD 5 per 1,000 in the first paid tier. The India table lists 70,000 and USD 1.50 per 1,000 for its first paid tier, subject to account eligibility. Do not assume the India rate from customer location. Example, 80,000 monthly requests would be USD 350 global or USD 15 under eligible India pricing at those tiers, excluding taxes/other services. Retry attempts can add billable requests. These are published-rate examples, not a LYOR bill estimate. [Global pricing](https://developers.google.com/maps/billing-and-pricing/pricing) · [India pricing](https://developers.google.com/maps/billing-and-pricing/pricing-india)

Before LOC-02 live smoke, confirm billing account applicability, key restrictions, enabled API, approved request budget and privacy/attribution. Before LOC-06, record actual provider calls, retry counts, latency, quota failures, forecast volume and billable SKU; compare with Cloud billing and quota dashboards. Never label mocked transport tests as live evidence.
