import type { components } from "@lyor/api-contracts";
export type Product = components["schemas"]["ProductResponse"];
export type Line = components["schemas"]["LineDto"];
export type Cart = components["schemas"]["CartResponse"];
export type Breakdown = components["schemas"]["BreakdownResponse"];
export type Quote = components["schemas"]["QuoteResponse"];
export type Order = components["schemas"]["OrderResponse"];
export type Session = { id: string; role: string; name: string } | null;
export const categories = [
  { id: "all", name: "Everything" },
  { id: "living", name: "Living room" },
  { id: "bedroom", name: "Bedroom" },
  { id: "study", name: "Work from home" },
  { id: "dining", name: "Dining" },
  { id: "appliances", name: "Appliances" },
  { id: "accessories", name: "Accessories" },
  { id: "storage", name: "Storage" },
  { id: "bundles", name: "Room bundles" },
];
export function money(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % 100 ? 2 : 0,
  }).format(paise / 100);
}
export const rentalTenures = [3, 6, 12] as const;
export type RentalTenure = (typeof rentalTenures)[number];
export function rentalTenure(value: unknown): RentalTenure {
  return value === "3" ? 3 : value === "12" ? 12 : 6;
}
export function rentalPrice(
  product: Pick<Product, "monthlyPaise">,
  tenure: number,
) {
  return Math.round(
    (product.monthlyPaise * ({ 3: 110, 6: 100, 12: 90 }[tenure] ?? 100)) / 100,
  );
}
