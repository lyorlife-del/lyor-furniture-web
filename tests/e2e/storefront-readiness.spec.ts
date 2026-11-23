import { expect, test } from "@playwright/test";

test("signed-in mobile header and orders recover without a guest or empty flash", async ({
  page,
  request,
  baseURL,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const identity = await request.post("/api/session", {
    headers: { Origin: baseURL! },
    data: { identity: "demo-customer-b" },
  });
  expect(identity.ok()).toBeTruthy();
  // Set the cookie before loading the document to exercise SSR.
  const cookie = identity.headers()["set-cookie"].split(";")[0].split("=");
  await page
    .context()
    .addCookies([{ name: cookie[0], value: cookie[1], url: baseURL! }]);
  let finish!: () => void;
  const blocked = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route(
    "**/api/me/orders",
    async (route) => {
      await blocked;
      await route.fulfill({
        status: 503,
        json: { message: "Orders temporarily unavailable" },
      });
    },
    { times: 1 },
  );
  const html = await page.request.get("/account/orders");
  expect(await html.text()).toContain('aria-label="Your account"');
  await page.goto("/");
  await page.getByRole("button", { name: "Your account" }).click();
  await expect(page.getByRole("dialog")).toContainText("Ananya");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Your account" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Your account" }).click();
  await page.getByRole("link", { name: "Your orders" }).click();
  await expect(page.getByText("Loading your demo orders…")).toBeVisible();
  await expect(page.getByText(/No demo orders/)).toHaveCount(0);
  finish();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Orders temporarily unavailable",
  );
  await page.getByRole("button", { name: "Retry orders" }).click();
  await expect(page.getByText(/No demo orders/)).toBeVisible();
  await page.getByRole("link", { name: /^Cart/ }).click();
  await expect(page.getByText(/Your cart is empty/)).toBeVisible();
  await page.getByRole("button", { name: "Your account" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Sign out of demo" })
    .click();
  await expect(
    page.getByRole("link", { name: "Select demo identity" }),
  ).toBeVisible();
});

test("saved cart keeps its ID and PIN through an outage and retries", async ({
  page,
}) => {
  await page.goto("/noida/product/mira-sofa");
  await page.getByRole("button", { name: "Add to your space" }).click();
  await expect(
    page.getByText("Mira three-seat sofa added to your cart"),
  ).toBeVisible();
  await page.evaluate(() => localStorage.setItem("lyor-pin-v1", "201304"));
  let finish!: () => void;
  const blocked = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route(
    "**/api/cart/*",
    async (route) => {
      await blocked;
      await route.fulfill({
        status: 503,
        json: { message: "Cart service unavailable" },
      });
    },
    { times: 1 },
  );
  await page.goto("/cart");
  await expect(page.getByText("Loading your cart…")).toBeVisible();
  await expect(page.getByText(/Your cart is empty/)).toHaveCount(0);
  finish();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Cart service unavailable",
  );
  const response = page.waitForResponse(
    (result) => /\/api\/cart\//.test(result.url()) && result.ok(),
  );
  await page.getByRole("button", { name: "Retry cart" }).click();
  const cart = await (await response).json();
  expect(cart.products).toEqual([
    expect.objectContaining({
      name: "Mira three-seat sofa",
      slug: "mira-sofa",
    }),
  ]);
  expect(cart.products[0]).not.toHaveProperty("stock");
  await expect(
    page.getByRole("heading", { name: "Mira three-seat sofa" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Delivery PIN", { exact: true }),
  ).toHaveAttribute("placeholder", "201304");
});

test("a missing product and changed product options render the correct state", async ({
  page,
}) => {
  await page.goto("/noida/product/unknown-listing");
  await expect(
    page.getByRole("heading", { name: "We couldn’t find this piece." }),
  ).toBeVisible();
  await page.goto("/noida/product/mira-sofa");
  await page.getByLabel("Quantity").selectOption("3");
  await page.getByRole("link", { name: "Buy", exact: true }).click();
  await page
    .locator('a[href="/noida/product/mira-sofa?mode=buy"]')
    .filter({
      has: page.getByRole("heading", { name: "Mira three-seat sofa" }),
    })
    .click();
  await expect(page).toHaveURL(/mira-sofa\?mode=buy/);
  await expect(page.getByLabel("Quantity")).toHaveValue("1");
  await expect(page.getByLabel("Rental plan")).toHaveCount(0);
});

test("a pending category change keeps the previous results visible", async ({
  page,
}) => {
  let finish!: () => void;
  const blocked = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route(/\/noida\/rent\?.*category=bedroom/, async (route) => {
    if (route.request().headers()["rsc"]) await blocked;
    await route.continue();
  });
  await page.goto("/noida/rent");
  const sofa = page.getByRole("heading", { name: "Mira three-seat sofa" });
  await expect(sofa).toBeVisible();
  await page
    .getByRole("navigation", { name: "Furniture categories" })
    .getByRole("link", { name: "Bedroom" })
    .click();
  try {
    await expect(page.getByText("Updating the collection…")).toBeVisible();
    await expect(sofa).toBeVisible();
  } finally {
    finish();
  }
  await expect(page).toHaveURL(/category=bedroom/);
  await expect(sofa).toHaveCount(0);
});

test("quote expires while checkout is still open", async ({ page }) => {
  await page.clock.install();
  await page.goto("/noida/product/mira-sofa");
  await page.getByRole("button", { name: "Add to your space" }).click();
  await expect(
    page.getByText("Mira three-seat sofa added to your cart"),
  ).toBeVisible();
  await page.getByRole("link", { name: /^Cart/ }).click();
  await page.getByRole("button", { name: /Aarav Demo customer A/ }).click();
  await page.getByLabel("Delivery PIN", { exact: true }).fill("201304");
  await page.getByRole("button", { name: "Get a server quote" }).click();
  await page.getByRole("link", { name: "Review demo checkout" }).click();
  await expect(
    page.getByRole("button", { name: "Submit demo order request" }),
  ).toBeVisible();
  await page.clock.fastForward(16 * 60 * 1000);
  await expect(
    page.getByRole("link", { name: "Return to your cart for a fresh quote" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Return to your cart for a fresh quote" })
    .click();
  await expect(
    page.getByRole("link", { name: "Review demo checkout" }),
  ).toHaveCount(0);
});
