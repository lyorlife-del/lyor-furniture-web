import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const destination = ".data/phase03/browser";
mkdirSync(destination, { recursive: true });
const preview = {
  legacy: "http://127.0.0.1:3120",
  candidate: "http://127.0.0.1:3120",
};
const cases = [
  ["home", "/", ".featured .product-card:first-child"],
  ["rent", "/noida/rent", ".catalog-meta"],
  ["buy", "/noida/buy", ".catalog-meta"],
  ["product", "/noida/product/mira-sofa", ".product-detail h1"],
  ["bundles", "/bundles", "main h1"],
  ["business", "/business", "main h1"],
  ["policies", "/policies", "main h1"],
  ["orders", "/account/orders", ".notice:has-text('No demo orders')"],
  ["cart", "/cart", "main a:has-text('Explore the collection')"],
  [
    "checkout",
    "/checkout",
    "a:has-text('Return to your cart for a fresh quote')",
  ],
  ["admin", "/admin", "tbody tr:first-child"],
];
const screen = [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
];
const browser = await chromium.launch({ channel: "chrome" });
const pairs = [];
try {
  for (const [device, viewport] of screen) {
    const captures = {};
    for (const [label, baseURL] of Object.entries(preview)) {
      writeFileSync(".data/phase03/preview-backend.txt", label);
      captures[label] = {};
      const ctx = await browser.newContext({
        baseURL,
        viewport,
        isMobile: device === "mobile",
        hasTouch: device === "mobile",
        reducedMotion: "reduce",
      });
      try {
        const page = await ctx.newPage();
        for (const [id, path, selector] of cases) {
          if (id === "orders" || id === "admin") {
            const r = await ctx.request.post("/api/session", {
              headers: { Origin: baseURL },
              data: {
                identity: id === "admin" ? "demo-admin" : "demo-customer-a",
              },
            });
            assert.equal(r.status(), 200);
          }
          const response = await page.goto(path);
          assert.equal(response.status(), 200, label + " " + path);
          await page.locator(selector).first().waitFor({ state: "visible" });
          await page
            .getByRole("link", { name: "Cart, 0 items", exact: true })
            .waitFor({ state: "visible" });
          if (id === "product")
            await page
              .getByRole("button", { name: "Add to your space", exact: true })
              .waitFor({ state: "visible" });
          await page.evaluate(async () => {
            const images = [...document.images];
            for (const img of images) img.loading = "eager";
            await Promise.all(
              images.map((img) => img.decode().catch(() => {})),
            );
            await document.fonts.ready;
            await new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            );
          });
          const png =
            destination + "/" + device + "-" + id + "-" + label + ".png";
          await page.screenshot({
            path: png,
            fullPage: true,
            animations: "disabled",
            style: "nextjs-portal {display:none !important}",
          });
          captures[label][id] = await sharp(png)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
        }
      } finally {
        await ctx.close();
      }
    }
    for (const [id, path] of cases) {
      const a = captures.legacy[id],
        b = captures.candidate[id];
      if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
        pairs.push({
          device,
          id,
          path,
          legacy: a.info,
          candidate: b.info,
          differentPixels: -1,
        });
        continue;
      }
      let different = 0;
      for (let i = 0; i < a.data.length; i += 4) {
        if (
          a.data[i] !== b.data[i] ||
          a.data[i + 1] !== b.data[i + 1] ||
          a.data[i + 2] !== b.data[i + 2] ||
          a.data[i + 3] !== b.data[i + 3]
        )
          different++;
      }
      pairs.push({
        device,
        id,
        path,
        width: a.info.width,
        height: a.info.height,
        differentPixels: different,
      });
    }
  }
  writeFileSync(
    destination + "/comparison.json",
    JSON.stringify(pairs, null, 2),
  );
  const mismatches = pairs.filter((row) => row.differentPixels);
  console.log(
    "Compared " + pairs.length + " screenshot pairs",
    JSON.stringify(mismatches),
  );
  assert.equal(mismatches.length, 0);
} finally {
  await browser.close();
}
