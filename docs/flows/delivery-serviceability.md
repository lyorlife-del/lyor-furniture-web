# Delivery eligibility and slots

Planned LOC-01 through LOC-04 behavior. The user-approved scope is Delhi's entire NCT and Gurugram city; the verified postal list is pending.

1. Load the active complete postal-reference version and the company configuration revision.
2. Resolve PIN existence and reliable geography. Unavailable reference data is an unavailable decision, not evidence that a PIN does not exist.
3. Look up the effective active zone membership. Verify company/city scope, operational status and `[effective_from,effective_until)` at server time. Ambiguous matches fail closed.
4. Return eligibility separately from stock and capacity. A known PIN outside approved mappings is unserviceable even if Google recognizes it.
5. On a bounded requested date range, read configured capacity windows in Asia/Kolkata. Missing/full/paused windows do not produce synthetic alternatives; offer only actual eligible windows.
6. Customer chooses a window. This is a preference, not a hold. Catalogue and quote estimates are not reservations.
7. Final request validation rereads authoritative PostgreSQL configuration/capacity under locks and obtains or reconciles inventory through the appropriate owner workflow.

Admin changes require existing authorized identity, revision conflict handling, actor-attributed audit and atomic configuration-version increment. Read caching, if introduced later, cannot override final transaction checks. See [database design](../architecture/serviceability-database.md).
