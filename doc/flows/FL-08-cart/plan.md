# FL-08 — Cart management

Audience: guest/customer.

Goal: Cart revisions reject stale writes; sign-in claims the guest capability cart and a fresh owned quote is required.

Implementation areas: CartModule, StoreProvider, cart page.

## Ordered steps

| Step | Outcome | Phase |
|---|---|---|
| [ST-01](steps/ST-01.md) | Create an anonymous persistent cart | PH-03 |
| [ST-02](steps/ST-02.md) | Add update and remove cart lines | PH-03 |
| [ST-03](steps/ST-03.md) | Revalidate configurations and quote revisions | PH-03 |
| [ST-04](steps/ST-04.md) | Claim the cart on demo sign-in | PH-03 |
| [ST-05](steps/ST-05.md) | Recover from expiry location changes and conflicts | PH-03 |

## Reference evidence

Guest cart, addition, quantity increase, cost breakdown and login gate observed. Decrement settlement and account merge unverified. See the [REA register](../../evidence/furlenco-inspection.md). These observations guide an original design, not competitor backend assumptions.

The [storefront readiness verification](../../evidence/storefront-readiness.md) records the browser checks for the updated steps below.

## Acceptance

Cart revisions reject stale writes; sign-in claims the guest capability cart and a fresh owned quote is required. Evidence must cover failure/recovery and owner/role denial, not only a happy path. Refer to [verification](../../verification.md) for actual results and scope limits.
