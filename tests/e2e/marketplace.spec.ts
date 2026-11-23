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
test("original home and mobile layout load without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /A little more home/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mira three-seat sofa" }),
  ).toBeVisible();
  await mkdir(".data/screenshots", { recursive: true });
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
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Rent", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: ".data/screenshots/home-mobile.png",
    fullPage: true,
  });
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
  await page.getByRole("button", { name: /Delivery location/ }).click();
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
  await page.getByLabel("Delivery PIN", { exact: true }).fill("201304");
  await page.getByRole("button", { name: "Get a server quote" }).click();
  await expect(
    page.getByRole("link", { name: "Review demo checkout" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Review demo checkout" }).click();
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
    page.getByText("pending", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("not collected", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("unreserved", { exact: true }).first(),
  ).toBeVisible();
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
