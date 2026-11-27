# LYOR storefront design system

The approved homepage is the visual baseline. The Figma file also provides a rental listing frame, nine product detail examples, a delivery location dialog, and a combined rental checkout and account frame. The rent and buy catalogues, product details, and the checkout and account surfaces use those patterns. Bundles, cart, business enquiries, policies and staff screens extend the same design system through existing routes. [Figma homepage](https://www.figma.com/design/2mfiEaAJw2Xjy6e9jtIGrc/Untitled?node-id=4-2) · [Catalogue](https://www.figma.com/design/2mfiEaAJw2Xjy6e9jtIGrc/Untitled?node-id=17-306) · [Product detail](https://www.figma.com/design/2mfiEaAJw2Xjy6e9jtIGrc/Untitled?node-id=48-4) · [Checkout and account](https://www.figma.com/design/2mfiEaAJw2Xjy6e9jtIGrc/Untitled?node-id=17-20)

## Tokens and composition

| Area | Shared choices |
| --- | --- |
| Brand and actions | Terracotta `#a93632`, deep red `#8f2d2b`, olive `#5b6248`, dark green `#32392c` |
| Surfaces and text | Paper `#fbf8f2`, cards `#fffdfa`, soft surface `#efeee4`, border `#dedace`, ink `#3d3a30`, muted text `#716b5f` |
| Feedback | Olive success, amber pending and warning, terracotta error. Pair color with a text label |
| Type | Local Lora for editorial headings and Inter for UI and body text. Scale page headings from 32 to 54 px |
| Spacing | Content up to 1440 px, gutters from 14 to 48 px, fluid gaps from 16 to 32 px, shared 12 px panel corners |
| Responsive | Keep the approved home breakpoints. Switch catalogue sidebar and grids at 850 px, use the existing single-column product and checkout patterns at 800 px, and tighten controls at 470 px |

`editorial-home.css` owns the approved visual primitives and fonts. `marketplace.css` applies those tokens to existing forms, dialogs, status feedback, cards and route layouts. The existing Tailwind and Radix-based button and dialog code remains the shared component foundation. The shared header and footer now serve the entire marketplace. The same device-local wishlist works on the homepage, catalogue and product pages. Exact matches between all six Figma catalogue tile images and approved homepage assets were verified by SHA-256. Product and checkout images come from the current catalogue.

## Implemented route coverage

| Route | Experience and data |
| --- | --- |
| `/` | Approved homepage image carousel, categories, search, wishlist, tenure link, API-fed featured products and appliance search fallback |
| `/noida/rent`, `/noida/buy` | Category imagery, supported filters and sorting, card grid, saved items, pagination, and distinct loading, empty and error states |
| `/noida/product/[slug]` | Gallery uses available product photos. Variant, quantity, supported tenure, indicative deposit, delivery PIN, details, cart and related listings use current data |
| `/bundles` | Fixed packages with included items, existing quantity and variant options, and distinct empty and service-error states |
| `/cart`, `/checkout` | Cart tenure edits invalidate the previous quote through the existing cart flow. Checkout shows quote totals, line summaries, address validation and request submission |
| `/account/orders` | Owner-scoped history and counts, request receipt by reference, independent payment, stock and delivery statuses |
| `/business`, `/policies`, `/admin` | Shared forms, panels and typography. Staff publication and audited replay retain the existing role boundaries |

## Contract boundaries

The preview's material, color and budget facets require server-side catalogue support before they can filter across paginated results. The current rental options remain 3, 6 and 12 months. The existing fixed bundle API supplies its components and the current cart accepts the supported variant and quantity. Configurable bundles need an approved composition and quoting contract.

Checkout uses the existing signed quote, address and consent contract. Delivery-slot booking, production login and OTP, payment methods and verification, and live rental subscriptions require their own approved backend contracts. The receipt names the submitted request and shows backend statuses. A local worker outcome never implies that an order was paid. [Frontend API matrix](../implementation/api-compatibility.md)
