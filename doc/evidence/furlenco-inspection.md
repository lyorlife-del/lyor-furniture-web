# Furlenco benchmark evidence

Inspected through REA on 2026-11-23 in the preceding task. Public observation only. No OTP, order, payment or enquiry was submitted. Actions touched only temporary anonymous browser carts.

| Reference | Parent evidence ID | Finding / limitation |
|---|---|---|
| Rental home, Noida | ev_ab5e2283b2a15620ebb6b26fada67c8b50617d555054fc9527f9790d8be2ad26 | City selection and Rent/Buy/UNLMTD/B2B navigation observed |
| Rental variant | ev_d48713ffc9ece5d5740b5ebb747f033a7d1acf49c89495e88edbcb4ea2a09418 | Mattress selection changed product URL and monthly price |
| Cart / login gate | ev_321eeb886df561f974d7c3b29a80367611a4b626ae3d523e0a246d3fe99ba991 | Addition, quantity increase and phone gate observed; decrement still loading |
| Search | ev_c5651cec786d00e9619f38e12aad5fd5aff5750d31530278e2fb353be20fcf03 | Search term and mode in URL; result page observed |
| Bundles | ev_bc7d61be6494b81f06233e1d6ccc3083edf99b8654e1a2a65bfc34347a06cba8 | BHK and room/appliance combo categories observed |
| Buy PDP | ev_221698a533ce76142105b48c83fa0316b71c897f3cf5129905f65f822d8754f8 | One-time prices, configuration and condition observed |
| B2B | ev_c7fa02ccdd93a0b3175c3ef29a739f31b9a2af962a125b97d05c175334c91ae0 | Public form observed, not submitted; no multi-site UI observed |
| Subscription | ev_8b22c4632a874ab52b471da7aaee4cd4fe0a046d64ccdb68a7d3b035d0c9c38d | Public subscription tiers observed |

Policy articles describe renewal, return, pickup, installation, damage, maintenance, deposit and payment options. These are claims, not executed workflows. Internal ERP, staff, stock reservation, finance, webhooks and post-login journeys remain unknown.

Sources: https://www.furlenco.com/rent ; https://www.furlenco.com/buy ; https://www.furlenco.com/unlmtd ; https://business.furlenco.com/ ; https://help.furlenco.com/

Original full export was saved outside the repository in the operator's temporary directory as `lyor-furlenco-rea-2026-11-23.json`. Evidence IDs document provenance; they are not stable public URLs. The small factual register here avoids vendoring competitor DOM/assets into the project.

The follow-up Bengaluru inspection observed the public account menu and login entry in REA evidence `ev_5494eada87f5427811de93ff70fc8d17e2b35cc6f44c37d7fb9e7110ff9ed585`. The signed-in Furlenco journey remains unverified. The signed-in replay in the [storefront readiness record](storefront-readiness.md) uses a local LYOR demo identity.
