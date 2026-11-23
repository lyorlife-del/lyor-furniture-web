import { chromium } from "@playwright/test";

const base = process.env.PREVIEW_URL ?? "http://127.0.0.1:3000";
const signedIn = process.env.SIGNED_IN === "true";
const routes = [
  ["home", "/", [".featured .product-card", ".featured .notice"]],
  ["catalog", "/noida/rent", [".catalog-meta"]],
  ["pilot", "/noida/product/pilot-b07", [".product-detail h1"]],
  [
    "cart",
    "/cart",
    [
      ".cart-line",
      "a[href='/noida/rent']:has-text('Explore the collection')",
      "main [role='alert']",
    ],
  ],
  [
    "account",
    "/account/orders",
    signedIn
      ? [".order-card", ".notice:has-text('No demo orders')"]
      : ["button:has-text('Aarav')"],
  ],
];
const samples = Number(process.env.SAMPLES ?? 5);
const selectedRoutes = process.env.ROUTE
  ? routes.filter(([name]) => name === process.env.ROUTE)
  : routes;
if (!selectedRoutes.length || !Number.isInteger(samples) || samples < 1)
  throw new Error("Choose a valid ROUTE and a positive SAMPLES count.");
const pilotQuery = encodeURIComponent(
  process.env.PILOT_QUERY ?? "Bed - Single",
);
for (const path of [
  "/policies",
  ...routes.map(([, path]) => path),
  "/noida/rent?q=" + pilotQuery,
]) {
  await (await fetch(base + path)).text();
}
const browser = await chromium.launch({ channel: "chrome" });
try {
  for (const [device, viewport] of Object.entries({
    desktop: { width: 1440, height: 900 },
    mobile: { width: 390, height: 844 },
  })) {
    for (const mode of ["cold", "client"]) {
      for (const [route, path, selectors] of selectedRoutes) {
        const values = [];
        for (let index = 0; index < samples; index++) {
          const context = await browser.newContext({
            viewport,
            isMobile: device === "mobile",
          });
          try {
            if (signedIn) {
              const login = await context.request.post(base + "/api/session", {
                headers: { Origin: base },
                data: { identity: "demo-customer-a" },
              });
              if (!login.ok()) throw new Error("Local demo sign-in failed");
            }
            await context.addInitScript(() => {
              const metrics = { cls: 0, lcp: null };
              window.storefrontMetrics = metrics;
              for (const type of ["largest-contentful-paint", "layout-shift"]) {
                new PerformanceObserver((list) => {
                  for (const entry of list.getEntries()) {
                    if (type === "largest-contentful-paint")
                      metrics.lcp = entry.startTime;
                    else if (!entry.hadRecentInput) metrics.cls += entry.value;
                  }
                }).observe({ type, buffered: true });
              }
            });
            const page = await context.newPage();
            const destination = base + path;
            if (mode === "client") {
              const origin =
                route === "home"
                  ? "/policies"
                  : route === "pilot"
                    ? "/noida/rent?q=" + pilotQuery
                    : "/";
              await page.goto(base + origin, {
                waitUntil: "load",
              });
              let target =
                route === "pilot"
                  ? page
                      .locator('a[href*="/noida/product/pilot-b07"]')
                      .filter({ visible: true })
                      .first()
                  : page
                      .locator('a[href="' + path + '"]')
                      .filter({ visible: true })
                      .first();
              if (route === "account" && signedIn) {
                const trigger = page.getByRole("button", {
                  name: "Your account",
                });
                const previousHeaderLink = page.getByRole("link", {
                  name: "Your account",
                  exact: true,
                });
                await trigger.or(previousHeaderLink).first().waitFor();
                if (await trigger.count()) {
                  await trigger.click();
                  target = page
                    .getByRole("dialog")
                    .getByRole("link", { name: "Your orders" });
                } else {
                  target = previousHeaderLink;
                }
              }
              await target.waitFor();
              await page.evaluate(() => {
                window.storefrontMetrics.cls = 0;
                window.storefrontStart = performance.now();
              });
              await target.click({ timeout: 12000 });
            } else {
              await page.goto(destination, { waitUntil: "commit" });
            }
            await page
              .locator(selectors.join(", "))
              .first()
              .waitFor({ timeout: 12000 });
            const ready = await page.evaluate((mode) => {
              if (mode === "client" && window.storefrontStart === undefined)
                throw new Error(
                  "Expected client navigation, but the document reloaded",
                );
              return performance.now() - (window.storefrontStart ?? 0);
            }, mode);
            await page.waitForTimeout(650);
            values.push(
              await page.evaluate(
                ({ ready, mode }) => {
                  const navigation =
                    performance.getEntriesByType("navigation")[0];
                  const fcp = performance.getEntriesByName(
                    "first-contentful-paint",
                  )[0]?.startTime;
                  const { lcp, cls } = window.storefrontMetrics;
                  return mode === "cold"
                    ? [navigation.responseStart, fcp ?? null, lcp, cls, ready]
                    : [null, null, null, cls, ready];
                },
                { ready, mode },
              ),
            );
          } catch (error) {
            console.error(device, mode, route, error.message.split("\n")[0]);
            break;
          } finally {
            await context.close();
          }
        }
        const median = (index) => {
          const sorted = values
            .map((value) => value[index])
            .filter((value) => value !== null)
            .sort((a, b) => a - b);
          if (!sorted.length) return null;
          const middle = Math.floor(sorted.length / 2);
          return Number(
            (sorted.length % 2
              ? sorted[middle]
              : (sorted[middle - 1] + sorted[middle]) / 2
            ).toFixed(index === 3 ? 3 : 0),
          );
        };
        console.log(
          JSON.stringify({
            device,
            mode,
            route,
            samples: values.length,
            ttfb: median(0),
            fcp: median(1),
            lcp: median(2),
            cls: median(3),
            ready: median(4),
          }),
        );
        if (values.length !== samples) process.exitCode = 1;
      }
    }
  }
} finally {
  await browser.close();
}
