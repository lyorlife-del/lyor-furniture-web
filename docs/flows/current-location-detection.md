# Current location detection

Implemented LOC-02 flow in the opt-in location dialog. The browser prompts only after the customer presses Use Current Location. The API defaults to the disabled provider.

1. Customer clicks Use Current Location in the existing dialog. Explain one-time approximate detection and manual fallback.
2. Browser calls `getCurrentPosition` with a bounded timeout; never start a watch. Unsupported browser, insecure non-local origin, denial, timeout and unavailable device each get actionable guidance.
3. Send finite coordinates and optional accuracy by same-origin POST to FastAPI over HTTPS in staging/production. Reject stale callbacks when the dialog/input generation changed.
4. Validate coordinate ranges, apply the shared paid-provider limiter and call only the explicitly configured provider. Disabled/configuration failure does not select the mock adapter.
5. Validate structured country/PIN components; classify missing PIN, outside India and ambiguous results. Verify candidate PIN against the independent approved postal reference and then LYOR serviceability.
6. Display the approximate candidate and required provider attribution. A successful result still requires customer confirmation; allow manual correction before saving.
7. Save only the confirmed preference. Discard exact coordinates/provider content and suppress them in telemetry. Clear stale quote/slot selections while retaining cart lines and tenure.

Use “We couldn't determine your PIN code. Please enter it manually.” when resolution fails, with a more specific permission/network explanation where useful. Never continuously retry or poll GPS. See [provider design](../architecture/geocoding-provider-design.md) for budgets, errors and caching decisions.
