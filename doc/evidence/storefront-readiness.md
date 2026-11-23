# Storefront readiness verification

## Browser reference

| Target | REA parent evidence | Observed behavior |
| --- | --- | --- |
| Furlenco Bengaluru, public | `ev_5494eada87f5427811de93ff70fc8d17e2b35cc6f44c37d7fb9e7110ff9ed585` | Public account menu and login entry. Signed-in Furlenco behavior remains unverified. |
| LYOR desktop, updated | `ev_b230b2cb6898a8afa9c9eceb8ab7ec3b0dbb15acc11d5f6565b8e6a7c909d8c6` | Featured home cards loaded, then the catalog and sofa detail opened in sequence. |
| LYOR pilot, updated | `ev_a243f820913585f522b7052f5382930204d4fc9c6ef2bad8e0e395fad8de72d5` | The pilot B07 listing reached its detail and pricing region in the isolated preview. |
| LYOR mobile, updated | `ev_8f6333601dc87a91672b6d5ab68bdad19672c80f266259815153013d1257f1e1` | Selected a local demo identity, opened the account dialog, followed Your orders, visited the cart, and reopened the dialog. |

## Readiness checks

| Surface | Ready when | Recovery or change behavior |
| --- | --- | --- |
| Home | Hero is actionable and the featured section resolves | Featured cards stream independently. An unavailable catalog shows a recovery link. |
| Catalog | The results count and current results render | Changing filters keeps the previous results in view and announces the update. Empty and unavailable results have distinct messages. |
| Product | The listing heading and product content render | Missing listings have their own route state. A service failure offers retry. Changing listing or URL mode resets the product options. |
| Cart | Saved lines or the confirmed empty state render | A temporary failure keeps the saved reference and offers retry. An unavailable listing can still be removed. |
| Checkout | The signed-in identity, saved cart, PIN, and unexpired quote match | Displays loading and retry states while resolving the cart. Changes to the cart, PIN, identity, or expiry require a fresh quote. |
| Account | Signed-in header appears in the initial response and the order list or confirmed empty state renders | Orders have retry and ignore cancelled requests after an identity change. The menu closes with Escape. |

## Timing method

Five samples per combination used fresh Chromium browser contexts at 1440 × 900 and 390 × 844. Both builds used warmed local Next.js development servers and the same isolated Fastify and PostgreSQL fixture, with a local demo identity signed in. The cart was empty for the timing run. The pilot B07 listing used a synthetic fixture carrying the pilot rate. The timings describe this local lab scenario.

Cold samples started at document navigation. Client samples started immediately before clicking the storefront link. TTFB, FCP, and LCP are document metrics, so the client-navigation table reports readiness and observed layout shift. Readiness ends when the route-specific locator becomes visible. Layout shift sums the observed layout-shift entries without recent input through 650 ms after readiness. The values are medians in milliseconds except layout shift.

Run the measurement script against the local preview with `node scripts/storefront-readiness.mjs`. Set `PREVIEW_URL` to select the preview, `SIGNED_IN=true` to use a demo identity, and `PILOT_QUERY` if the pilot fixture uses a different searchable name. `SAMPLES` defaults to five and `ROUTE` selects one route.

## Cold document navigation

| Route | Viewport | TTFB | FCP | LCP | Layout shift | Ready |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Home | desktop | 41 → 75 | 184 → 192 | 420 → 192 | 0.174 → 0 | 397 → 261 |
| Home | mobile | 30 → 84 | 168 → 212 | 420 → 212 | 0 → 0 | 429 → 272 |
| Catalog | desktop | 45 → 67 | 192 → 212 | 472 → 460 | 0.113 → 0 | 444 → 529 |
| Catalog | mobile | 37 → 68 | 168 → 208 | 404 → 208 | 0 → 0 | 386 → 514 |
| Pilot B07 | desktop | 53 → 52 | 144 → 144 | 144 → 156 | 0 → 0 | 241 → 255 |
| Pilot B07 | mobile | 39 → 51 | 144 → 140 | 144 → 156 | 0 → 0 | 249 → 240 |
| Cart | desktop | 33 → 32 | 112 → 124 | 112 → 124 | 0 → 0.014 | 198 → 287 |
| Cart | mobile | 29 → 33 | 112 → 120 | 112 → 120 | 0 → 0 | 190 → 301 |
| Account | desktop | 32 → 40 | 128 → 148 | 128 → 148 | 0.008 → 0 | 310 → 416 |
| Account | mobile | 29 → 36 | 112 → 136 | 112 → 136 | 0 → 0 | 300 → 403 |

## Client navigation

| Route | Viewport | Layout shift | Ready |
| --- | --- | ---: | ---: |
| Home | desktop | 0 → 0 | 864 → 162 |
| Home | mobile | 0 → 0 | 839 → 164 |
| Catalog | desktop | 0.174 → 0 | 901 → 173 |
| Catalog | mobile | 0 → 0 | 906 → 170 |
| Pilot B07 | desktop | 0 → 0 | 151 → 145 |
| Pilot B07 | mobile | 0 → 0 | 255 → 135 |
| Cart | desktop | 0.174 → 0 | 112 → 158 |
| Cart | mobile | 0 → 0 | 129 → 160 |
| Account | desktop | 0 → 0 | 128 → 133 |
| Account | mobile | 0 → 0 | 124 → 134 |

Home reached featured readiness sooner on both viewports. The largest improvement was client navigation to home and catalog. Desktop home and catalog recorded zero layout shift in the updated samples. Cold catalog, empty cart, and orders reached final readiness later in this run. Checkout readiness is covered by the signed-quote and expiry browser scenarios.

## Verification results

- 11 Playwright journeys passed against the isolated preview, including cart and order-history retry, keyboard dismissal, preserved catalog results during a filter change, product option reset, and quote expiry during checkout.
- 15 API tests passed, including seven against isolated PostgreSQL. Both frontend component tests passed.
- The production build, TypeScript, lint, and documentation link checks passed.

