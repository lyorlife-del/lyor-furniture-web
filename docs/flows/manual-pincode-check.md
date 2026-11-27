# Manual PIN check

LOC-01 implements this flow behind `LOCATION_SERVICEABILITY_ENABLED=true` using the new FastAPI PIN endpoint and an explicitly activated postal reference. The default remains the original Noida demo described in the [audit](../architecture/location-serviceability-hld.md). Only eligible results can be saved in this phase; outside-area checks offer manual correction and the existing enquiry link. Notify Me and catalogue personalization remain later gates.

1. Customer opens the existing header location dialog or product delivery action. Browsing requires no location.
2. Accept a PIN as text; trim outer whitespace and validate six ASCII digits with nonzero first digit in the new API. Keep manual correction available.
3. FastAPI validates independently, checks the active approved postal-reference version and distinguishes malformed, unknown and reference-unavailable results.
4. For known PINs, evaluate the company-scoped zone, operational status and effective membership in PostgreSQL. Geographic validity alone does not imply delivery.
5. Display the resolved reliable locality/state, eligibility message and separate slot status if queried. Paused service differs from permanent outside coverage.
6. Customer confirms the PIN. Save a preference, invalidate old quotes/slots and refresh location-aware data, retaining cart contents, variant and tenure.
7. For outside coverage offer Change PIN and optional consented Notify Me. An enquiry is not a reservation or notification subscription.

Reject stale requests by generation; close aborts pending fetches. Announce progress/results and restore dialog-trigger focus. Store no client-authoritative availability boolean. See [API contract](../architecture/location-serviceability-lld.md) and [database provenance](../architecture/serviceability-database.md).
