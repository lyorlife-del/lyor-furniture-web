import { BadRequestException, ConflictException } from "@nestjs/common";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { LineDto } from "../../common/dto";
export type PricedProduct = {
  id: string;
  name: string;
  active: boolean;
  published: boolean;
  stock: number;
  monthlyPaise: number;
  purchasePaise: number;
  depositPaise: number;
  variants: unknown;
  components: unknown;
  cities: string[];
};
export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map(
        (key) =>
          JSON.stringify(key) +
          ":" +
          canonical((value as Record<string, unknown>)[key]),
      )
      .join(",") +
    "}"
  );
}
export function hash(value: unknown) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}
export function sign(value: unknown) {
  return createHmac("sha256", process.env.QUOTE_SECRET!)
    .update(canonical(value))
    .digest("hex");
}
export function validSignature(value: unknown, signature: string) {
  const expected = sign(value);
  return (
    /^[a-f0-9]{64}$/.test(signature) &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  );
}
export function demandFor(
  lines: LineDto[],
  products: PricedProduct[],
  city: string,
) {
  const demand = new Map<string, number>();
  for (const line of lines) {
    const product = products.find((p) => p.id === line.productId);
    if (
      !product ||
      !product.active ||
      !product.published ||
      !product.cities.includes(city)
    )
      throw new ConflictException(
        "A listing is no longer available in this city",
      );
    const variants = product.variants as {
      id: string;
      monthlyDeltaPaise: number;
    }[];
    if (line.mode === "buy" && product.purchasePaise <= 0)
      throw new ConflictException(
        "This product is available for rental pricing only",
      );
    if (!variants.some((v) => v.id === line.variantId))
      throw new BadRequestException("Choose a valid product variant");
    const components = product.components as {
      productId: string;
      quantity: number;
    }[];
    for (const part of components.length
      ? components
      : [{ productId: product.id, quantity: 1 }]) {
      if (
        (
          products.find((p) => p.id === part.productId)?.components as
            unknown[] | undefined
        )?.length
      )
        throw new BadRequestException("Nested bundles are not supported");
      demand.set(
        part.productId,
        (demand.get(part.productId) ?? 0) + part.quantity * line.quantity,
      );
    }
  }
  for (const [id, quantity] of demand) {
    const item = products.find((p) => p.id === id);
    if (
      !item ||
      !item.active ||
      !item.published ||
      !item.cities.includes(city) ||
      item.stock < quantity
    )
      throw new ConflictException(
        "An item or required bundle component is unavailable",
      );
  }
  return demand;
}
export function priceLines(
  lines: LineDto[],
  products: PricedProduct[],
  city: string,
) {
  if (!lines.length) throw new BadRequestException("Your cart is empty");
  demandFor(lines, products, city);
  const priced = lines.map((line) => {
    const product = products.find((p) => p.id === line.productId)!;
    const variant = (
      product.variants as { id: string; monthlyDeltaPaise: number }[]
    ).find((v) => v.id === line.variantId)!;
    const factor: Record<number, number> = { 3: 110, 6: 100, 12: 90 };
    if (
      !factor[line.tenure] ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 10 ||
      !["rent", "buy"].includes(line.mode)
    )
      throw new BadRequestException("Invalid item configuration");
    const unitPaise =
      line.mode === "buy"
        ? product.purchasePaise
        : Math.round(
            ((product.monthlyPaise + variant.monthlyDeltaPaise) *
              factor[line.tenure]) /
              100,
          );
    return {
      ...line,
      name: product.name,
      unitPaise,
      totalPaise: unitPaise * line.quantity,
      depositPaise:
        line.mode === "rent" ? product.depositPaise * line.quantity : 0,
    };
  });
  const subtotalPaise = priced.reduce((s, line) => s + line.totalPaise, 0),
    depositPaise = priced.reduce((s, line) => s + line.depositPaise, 0);
  const deliveryPaise = 19900,
    gstPaise = Math.round(((subtotalPaise + deliveryPaise) * 18) / 100);
  return {
    lines: priced,
    breakdown: {
      subtotalPaise,
      depositPaise,
      deliveryPaise,
      gstPaise,
      totalPaise: subtotalPaise + depositPaise + deliveryPaise + gstPaise,
      currency: "INR",
      taxLabel: "Synthetic demo GST (18%)",
    },
    policyVersion: "demo-noida-v1",
  };
}
export function quotePayload(quote: {
  id: string;
  cartId: string;
  cartRevision: number;
  ownerId: string | null;
  city: string;
  pin: string;
  lines: unknown;
  breakdown: unknown;
  policyVersion: string;
  expiresAt: Date | string;
}) {
  return {
    id: quote.id,
    cartId: quote.cartId,
    cartRevision: quote.cartRevision,
    ownerId: quote.ownerId,
    city: quote.city,
    pin: quote.pin,
    lines: quote.lines,
    breakdown: quote.breakdown,
    policyVersion: quote.policyVersion,
    expiresAt: new Date(quote.expiresAt).toISOString(),
  };
}
