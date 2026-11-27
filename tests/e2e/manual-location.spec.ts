import { expect, test } from "@playwright/test";

test.skip(
  process.env.LOC01_E2E !== "true",
  "Requires explicitly configured isolated FastAPI location preview",
);

test("device lookup runs on click and the approximate PIN can be corrected", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 1, longitude: 2, accuracy: 2500 });
  const lookups: string[] = [];
  page.on("request", req => {
    if (req.url().includes("resolve-location")) lookups.push(req.method());
  });
  await page.goto("/");
  await page.locator("#editorial-location").click();
  expect(lookups).toEqual([]);
  await page.getByRole("button", { name: "Use Current Location" }).click();
  await expect(page.getByText("Approximate PIN 122002.", { exact: false })).toBeVisible();
  await expect(page.getByText("Simulated location lookup")).toBeVisible();
  expect(lookups).toEqual(["POST"]);
  expect(await page.evaluate(() => localStorage.getItem("lyor-pin-v1"))).toBeFalsy();
  await page.getByLabel("Delivery PIN").fill("110024");
  await expect(page.getByRole("button", { name: "Use this PIN" })).toHaveCount(0);
  await page.getByRole("button", { name: "Check delivery", exact: true }).click();
  await page.getByRole("button", { name: "Use this PIN" }).click();
  await expect(page.locator("#editorial-location")).toContainText("110024");
});

for (const [code, message] of [[1, "permission was denied"], [2, "could not find"], [3, "timed out"]] as const) {
  test(`device failure ${code} leaves manual lookup available`, async ({ page }) => {
    await page.addInitScript(code => {
      Object.defineProperty(navigator, "geolocation", { value: {
        getCurrentPosition: (_: unknown, reject: (err: { code: number }) => void) => reject({ code }),
      } });
    }, code);
    let requests = 0;
    page.on("request", req => { if (req.url().includes("resolve-location")) requests++; });
    await page.goto("/");
    await page.locator("#editorial-location").click();
    await page.getByRole("button", { name: "Use Current Location" }).click();
    await expect(page.getByRole("alert")).toContainText(message);
    expect(requests).toBe(0);
    await page.getByLabel("Delivery PIN").fill("122002");
    await page.getByRole("button", { name: "Check delivery", exact: true }).click();
    await expect(page.getByRole("button", { name: "Use this PIN" })).toBeVisible();
  });
}

test("editing during a device lookup discards the late callback", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", { value: {
      getCurrentPosition: (resolve: PositionCallback) => window.addEventListener("release-position", () => {
        resolve({ coords: { latitude: 1, longitude: 2, accuracy: 10 } } as GeolocationPosition);
      }, { once: true }),
    } });
  });
  let requests = 0;
  page.on("request", req => { if (req.url().includes("resolve-location")) requests++; });
  await page.goto("/");
  await page.locator("#editorial-location").click();
  await page.getByRole("button", { name: "Use Current Location" }).click();
  await expect(page.getByText("Finding your approximate PIN…")).toBeVisible();
  await page.getByLabel("Delivery PIN").fill("400001");
  await page.evaluate(() => window.dispatchEvent(new Event("release-position")));
  await expect(page.getByLabel("Delivery PIN")).toHaveValue("400001");
  expect(requests).toBe(0);
});

for (const [name, width, height] of [
  ["desktop", 1440, 1000],
  ["tablet", 768, 1024],
  ["mobile", 390, 844],
] as const) {
  test(`database PIN check and explicit confirmation persist on ${name}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const trigger = page.getByRole("button", {
      name: /Deliver to Choose area/,
    });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Delivery PIN").fill(" 122002 ");
    await dialog
      .getByRole("button", { name: "Check delivery", exact: true })
      .click();
    await expect(dialog).toContainText("Great! LYOR delivers to your area.");
    await expect(dialog).toContainText("Demo result");
    await expect(page.locator("#editorial-location")).not.toContainText(
      "122002",
    );
    await dialog.getByRole("button", { name: "Use this PIN" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator("#editorial-location")).toContainText("Gurugram");
    await expect(page.locator("#editorial-location")).toContainText("122002");
    await expect(page.locator("#editorial-location")).toBeFocused();
    await page.reload();
    await expect(page.locator("#editorial-location")).toContainText("122002");
    const overflow = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      elements: [...document.querySelectorAll("body *")]
        .flatMap((element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.width &&
            (bounds.right > innerWidth + 1 || bounds.left < -1)
            ? [
                {
                  tag: element.tagName,
                  className: element.getAttribute("class"),
                  left: bounds.left,
                  right: bounds.right,
                },
              ]
            : [];
        })
        .slice(0, 15),
    }));
    expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(
      overflow.width,
    );
  });
}

test("unknown, malformed and valid outside-area PINs give distinct recoverable results", async ({
  page,
  request,
}) => {
  expect(
    (await request.get("/api/serviceability/pincode/122002")).status(),
  ).toBe(200);
  expect(
    (await request.get("/api/serviceability/pincode/000000")).status(),
  ).toBe(400);
  await page.goto("/");
  await page.locator("#editorial-location").click();
  const dialog = page.getByRole("dialog");
  const input = dialog.getByLabel("Delivery PIN");
  await input.fill("12200x");
  await dialog
    .getByRole("button", { name: "Check delivery", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("six-digit");
  await input.fill("999999");
  await dialog
    .getByRole("button", { name: "Check delivery", exact: true })
    .click();
  await expect(dialog).toContainText(
    "not found in the current postal reference",
  );
  await input.fill("400001");
  await dialog
    .getByRole("button", { name: "Check delivery", exact: true })
    .click();
  await expect(dialog).toContainText(
    "Delivery is not available in this area yet.",
  );
  await expect(
    dialog.getByRole("button", { name: "Use this PIN" }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "Change PIN" }).click();
  await expect(input).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#editorial-location")).toBeFocused();
});

test("editing a pending PIN rejects stale results and API failures never fall back to demo success", async ({
  page,
}) => {
  await page.goto("/noida/product/mira-sofa?tenure=12");
  await page.getByRole("button", { name: "Add to your space" }).click();
  await expect(page.getByRole("status")).toContainText("added to your cart");
  const cartId = await page.evaluate(() =>
    localStorage.getItem("lyor-cart-v1"),
  );
  await page.locator("#editorial-location").click();
  const dialog = page.getByRole("dialog");
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "**/api/serviceability/pincode/122002",
    async (route) => {
      await pending;
      await route.continue().catch(() => {});
    },
    { times: 1 },
  );
  await dialog.getByLabel("Delivery PIN").fill("122002");
  await dialog
    .getByRole("button", { name: "Check delivery", exact: true })
    .click();
  await expect(dialog).toContainText("Checking your PIN code");
  await dialog.getByLabel("Delivery PIN").fill("400001");
  release();
  await dialog
    .getByRole("button", { name: "Check delivery", exact: true })
    .click();
  await expect(dialog).toContainText("Delivery is not available");
  await expect(
    dialog.getByRole("button", { name: "Use this PIN" }),
  ).toHaveCount(0);
  await page.route(
    "**/api/serviceability/pincode/122002",
    (route) =>
      route.fulfill({
        status: 503,
        json: { message: "Postal reference needs verification" },
      }),
    { times: 1 },
  );
  await dialog.getByLabel("Delivery PIN").fill("122002");
  await dialog
    .getByRole("button", { name: "Check delivery", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Postal reference needs verification",
  );
  await expect(
    dialog.getByRole("button", { name: "Use this PIN" }),
  ).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Check delivery", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Use this PIN" }),
  ).toBeVisible();
  await page.evaluate(() =>
    sessionStorage.setItem("lyor-quote-v1", "stale quote marker"),
  );
  await dialog.getByRole("button", { name: "Use this PIN" }).click();
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("lyor-cart-v1"))).toBe(
    cartId,
  );
  expect(
    await page.evaluate(() => sessionStorage.getItem("lyor-quote-v1")),
  ).toBeNull();
  expect(page.url()).toContain("tenure=12");
  await page.getByRole("link", { name: /^Cart/ }).click();
  await expect(page.getByLabel("Rental tenure")).toHaveValue("12");
  await expect(page.getByText(/Your items are saved/)).toContainText("Mira");
});

test("a confirmed PIN refreshes catalogue and detail across tabs without losing options", async ({ page, context }) => {
  const withoutSession = await page.request.put("/api/location-preference", {
    headers: { origin: new URL(process.env.PREVIEW_URL!).origin },
    data: { pincode: "122002", expectedRevision: 0 },
  });
  expect(withoutSession.status()).toBe(409);
  await page.goto("/noida/rent?q=mira&sort=price-asc&tenure=12");
  const detail = await context.newPage();
  await detail.goto("/noida/product/mira-sofa?tenure=12");
  await detail.getByLabel("Finish / variant").selectOption({ index: 1 });
  const finish = await detail.getByLabel("Finish / variant").inputValue();
  const confirm = async (pin: string) => {
    await page.locator("#editorial-location").click();
    await page.getByLabel("Delivery PIN").fill(pin);
    await page.getByRole("button", { name: "Check delivery", exact: true }).click();
    await page.getByRole("button", { name: "Use this PIN" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  };
  await confirm("122002");
  await expect(page.getByText("No pieces found just yet.")).toBeVisible();
  const eligible = await page.request.get("/api/catalog?deliveryPin=122002");
  expect(eligible.ok()).toBe(true);
  expect((await eligible.json()).items.map((item: { id: string }) => item.id)).toEqual(["arbor-bed"]);
  await expect(detail.locator(".stock-label")).toContainText("Unavailable for PIN 122002");
  await expect(detail.getByLabel("Rental plan")).toHaveValue("12");
  await expect(detail.getByLabel("Finish / variant")).toHaveValue(finish);
  await confirm("201304");
  await expect(page.locator(".product-card").first()).toBeVisible();
  await expect(detail.locator(".stock-label")).toContainText("Available in the demo catalogue for 201304");
  await expect(detail.getByLabel("Finish / variant")).toHaveValue(finish);
  await expect(page).toHaveURL(/q=mira&sort=price-asc&tenure=12/);
  await page.reload();
  await expect(page.locator(".catalog-title")).toContainText("201304");
});
