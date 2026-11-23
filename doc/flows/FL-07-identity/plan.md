# FL-07 — Identity customer profile and consent

Audience: guest/customer.

Goal: Two customer identities cannot access each other's carts/orders; production demo-auth startup fails closed.

Implementation areas: AuthenticationModule, BFF session, IdentityPicker.

## Ordered steps

| Step | Outcome | Phase |
|---|---|---|
| [ST-01](steps/ST-01.md) | Create local-only demo identities | PH-01 |
| [ST-02](steps/ST-02.md) | Enforce ownership and role permissions | PH-01 |
| [ST-03](steps/ST-03.md) | Capture addresses and consent | PH-03 |
| [ST-04](steps/ST-04.md) | Integrate approved managed OIDC | PH-04 |
| [ST-05](steps/ST-05.md) | Add approved KYC | PH-05 |

## Reference evidence

Phone login gate observed. KYC described publicly; authenticated execution unverified. See the [REA register](../../evidence/furlenco-inspection.md). These observations guide an original design, not competitor backend assumptions.

The [storefront readiness verification](../../evidence/storefront-readiness.md) records the browser checks for the updated steps below.

## Acceptance

Two customer identities cannot access each other's carts/orders; production demo-auth startup fails closed. Evidence must cover failure/recovery and owner/role denial, not only a happy path. Refer to [verification](../../verification.md) for actual results and scope limits.
