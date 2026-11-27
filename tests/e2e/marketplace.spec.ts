import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
test("session mutations reject foreign origins and unknown identity keys", async ({
  request,
  baseURL,
}) => {
  const foreign = await request.post("/api/session", {
    headers: { Origin: "https://example.invalid" },
    data: { identity: "demo-admin" },
  });
  expect(foreign.status()).toBe(403);
  const forged = await request.post("/api/session", {
    headers: { Origin: baseURL! },
    data: { identity: "__proto__" },
  });
  expect(forged.status()).toBe(400);
});
test("editorial home loads and connects carousel, wishlist and rental tenure", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /A softer kind/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mira three-seat sofa" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next photograph" }).click();
  await expect(
    page.getByRole("button", { name: "Show bedroom photograph" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Previous photograph" }).click();
  const images = page.locator(
    ".editorial-home img, .editorial-header-shell img",
  );
  await images.evaluateAll((elements) => {
    for (const image of elements) (image as HTMLImageElement).loading = "eager";
  });
  await expect
    .poll(() =>
      images.evaluateAll((elements) =>
        elements.every((element) => {
          const image = element as HTMLImageElement;
          return image.complete && image.naturalWidth > 0;
        }),
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Save Mira three-seat sofa" }).click();
  await page.getByRole("button", { name: "Wishlist", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("link", { name: "Mira three-seat sofa" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close wishlist" }).click();
  await mkdir(".data/screenshots", { recursive: true });
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: ".data/screenshots/home-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Rent", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Shop by Category" }).click();
  await expect(
    page.getByRole("link", { name: /View all bedroom/ }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Shop by Category" }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.screenshot({
    path: ".data/screenshots/home-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "12 months" }).click();
  await page
    .locator("#furniture article")
    .filter({ hasText: "Mira three-seat sofa" })
    .getByRole("link", { name: "Check availability & rent" })
    .click();
  await expect(page).toHaveURL(/tenure=12/);
  await expect(page.getByLabel("Rental plan")).toHaveValue("12");
  await page.goto("/");
  const search = page.getByRole("searchbox").or(
    page.getByRole("textbox", {
      name: "Search furniture, appliances and more",
    }),
  );
  await search.fill("sofa");
  await search.press("Enter");
  await expect(page).toHaveURL(/q=sofa/);
});
test("catalog search, sorting and URL state survive reload", async ({
  page,
}) => {
  await page.goto("/noida/rent");
  await page
    .getByRole("textbox", { name: "Search furniture", exact: true })
    .fill("sofa");
  await page.getByLabel("Sort furniture").selectOption("price-asc");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page).toHaveURL(/q=sofa/);
  await expect(
    page.getByRole("heading", { name: "Mira three-seat sofa" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Sort furniture")).toHaveValue("price-asc");
  await expect(
    page.getByRole("textbox", { name: "Search furniture", exact: true }),
  ).toHaveValue("sofa");
});
test("unsupported PIN offers enquiry without a delivery promise", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Deliver to Noida/ }).click();
  await page.getByLabel("Delivery PIN", { exact: true }).fill("000000");
  await page.getByRole("button", { name: "Check availability" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "outside our demo coverage",
  );
  await expect(
    page.getByRole("link", { name: "Send an enquiry" }),
  ).toBeVisible();
});
test("guest cart becomes an owned signed quote and pending demo order", async ({
  page,
}) => {
  await page.goto("/noida/product/mira-sofa");
  await page.getByRole("button", { name: "Add to your space" }).click();
  await expect(page.getByRole("status")).toContainText("added to your cart");
  await page
    .getByRole("link", { name: "View your cart and request a quote" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mira three-seat sofa" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Aarav Demo customer A/ }).click();
  await expect(
    page.getByText("Local demo identity selected", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Rental tenure").selectOption("12");
  await expect(
    page.getByText("Cart updated. Request a fresh quote."),
  ).toBeVisible();
  await page.getByLabel("Delivery PIN", { exact: true }).fill("201304");
  await page.getByRole("button", { name: "Get a server quote" }).click();
  await expect(
    page.getByRole("link", { name: "Review demo checkout" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Review demo checkout" }).click();
  await expect(
    page.getByRole("heading", { name: "Rental summary" }),
  ).toBeVisible();
  await expect(page.getByText("1 × 12 month rental")).toBeVisible();
  await page
    .getByLabel("Name · fictional demo details", { exact: true })
    .fill("Demo Test Customer");
  await page
    .getByLabel("Phone · fictional demo details", { exact: true })
    .fill("9999999999");
  await page
    .getByLabel("Delivery address · fictional demo details", { exact: true })
    .fill("Demo apartment, Demo street, Noida");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Submit demo order request" }).click();
  await expect(page).toHaveURL(/account\/orders\?order=/);
  await expect(
    page.getByText("Demo request received", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("pending", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("not collected", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("unreserved", { exact: true }).first(),
  ).toBeVisible();
});
test("catalogue tenure and wishlist carry through to product detail", async ({
  page,
}) => {
  await page.goto("/noida/rent?q=sofa");
  await page
    .getByRole("navigation", { name: "Rental tenure" })
    .getByRole("link", { name: "3 months" })
    .click();
  await expect(page).toHaveURL(/tenure=3/);
  const card = page
    .locator("article.product-card")
    .filter({ hasText: "Mira three-seat sofa" });
  await expect(card.getByText("Sample rate · 3-month plan")).toBeVisible();
  await card.getByRole("button", { name: "Save Mira three-seat sofa" }).click();
  await card.getByRole("link", { name: "Check availability" }).click();
  await expect(page.getByLabel("Rental plan")).toHaveValue("3");
  await page.getByRole("button", { name: "Wishlist", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("link", { name: "Mira three-seat sofa" }),
  ).toBeVisible();
});
test("catalogue staff can see listings and the admin can see exception state", async ({
  page,
}) => {
  await page.goto("/admin");
  await page
    .getByRole("button", { name: /Catalog manager Publication permissions/ })
    .click();
  await expect(
    page.getByRole("row", { name: /Mira three-seat sofa/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Integration exceptions" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Sign out of demo" }).click();
  await page
    .getByRole("button", {
      name: /Administrator Publication and replay permissions/,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Integration exceptions" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("multi-site business enquiry returns a local receipt", async ({
  page,
}) => {
  await page.goto("/business");
  await page
    .getByLabel("Your name", { exact: true })
    .fill("Demo Business User");
  await page.getByLabel("Business name").fill("Demo Spaces");
  await page.getByLabel("Work email").fill("demo@example.invalid");
  await page.getByLabel("Phone", { exact: true }).fill("9999999999");
  await page.getByRole("button", { name: "Add another site" }).click();
  const sites = page.locator("fieldset");
  for (const [index, site] of [sites.nth(0), sites.nth(1)].entries()) {
    await site.getByLabel("Site name").fill("Demo site " + index);
    await site.getByLabel("PIN", { exact: true }).fill("201304");
    await site.getByLabel("Estimated units").fill(String(index + 2));
  }
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Save demo enquiry" }).click();
  await expect(
    page.getByRole("heading", { name: "Your demo enquiry is saved." }),
  ).toBeVisible();
  await expect(
    page.getByText(/No sales team, CRM or property service has been contacted/),
  ).toBeVisible();
});
