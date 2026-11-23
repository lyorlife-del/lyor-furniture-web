import { demoProducts } from "../src/modules/catalog/fixtures";
import {
  canonical,
  demandFor,
  priceLines,
  sign,
  validSignature,
} from "../src/modules/pricing/domain";
const line = {
  productId: "mira-sofa",
  mode: "rent" as const,
  variantId: "standard",
  quantity: 1,
  tenure: 6,
};
describe("server pricing invariants", () => {
  beforeAll(() => {
    process.env.QUOTE_SECRET = "unit-test-only-secret-at-least-32-characters";
  });
  it("calculates money in integer paise with tax excluding deposits", () => {
    const result = priceLines([line], demoProducts, "noida");
    expect(result.breakdown).toMatchObject({
      subtotalPaise: 89900,
      deliveryPaise: 19900,
      gstPaise: 19764,
      depositPaise: 0,
      totalPaise: 129564,
    });
  });
  it("combines bundle and individual demand before checking scarce units", () => {
    const products = demoProducts.map((p) => ({
      ...p,
      stock: p.id === "arbor-bed" ? 1 : p.stock,
    }));
    expect(() =>
      demandFor(
        [
          { ...line, productId: "room-to-begin" },
          { ...line, productId: "arbor-bed" },
        ],
        products,
        "noida",
      ),
    ).toThrow("unavailable");
  });
  it("rejects unavailable required bundle components", () => {
    const products = demoProducts.map((p) => ({
      ...p,
      stock: p.id === "luna-mattress" ? 0 : p.stock,
    }));
    expect(() =>
      priceLines([{ ...line, productId: "room-to-begin" }], products, "noida"),
    ).toThrow("unavailable");
  });
  it("rejects forged variants and unsupported plans", () => {
    expect(() =>
      priceLines([{ ...line, variantId: "forged" }], demoProducts, "noida"),
    ).toThrow("variant");
    expect(() =>
      priceLines([{ ...line, tenure: 0 }], demoProducts, "noida"),
    ).toThrow("configuration");
  });
  it("canonical signatures survive JSONB object key ordering and detect tampering", () => {
    expect(canonical({ z: 1, a: { y: 2, x: 3 } })).toEqual(
      canonical({ a: { x: 3, y: 2 }, z: 1 }),
    );
    const signature = sign({ totalPaise: 100, city: "noida" });
    expect(validSignature({ city: "noida", totalPaise: 100 }, signature)).toBe(
      true,
    );
    expect(validSignature({ city: "noida", totalPaise: 1 }, signature)).toBe(
      false,
    );
  });
});
