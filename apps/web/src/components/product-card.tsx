import Link from "next/link";
import Image from "next/image";
import { Button } from "@lyor/ui";
import {
  money,
  rentalPrice,
  type Product,
  type RentalTenure,
} from "@/lib/types";
import { WishlistButton } from "./wishlist";
export function ProductCard({
  product,
  mode = "rent",
  tenure = 6,
}: {
  product: Product;
  mode?: "rent" | "buy";
  tenure?: RentalTenure;
}) {
  const pilot = product.id.startsWith("pilot-");
  const href = `/noida/product/${product.slug}?mode=${mode}`;
  const target =
    mode === "rent" && tenure !== 6 ? `${href}&tenure=${tenure}` : href;
  const price =
    mode === "buy"
      ? product.purchasePaise
      : pilot
        ? product.monthlyPaise
        : rentalPrice(product, tenure);
  return (
    <article className="product-card">
      <div className="product-card-media">
        <Link href={target} className="product-image" aria-label={product.name}>
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 85vw, (max-width: 1000px) 45vw, 25vw"
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-sm text-neutral-600">
              Photo pending
            </span>
          )}
          <span className="product-badge">
            {!product.available
              ? pilot
                ? "Availability pending"
                : "Currently unavailable"
              : product.category === "bundles"
                ? "Better together"
                : product.featured
                  ? "A considered favourite"
                  : "Made for everyday"}
          </span>
        </Link>
        <WishlistButton href={href} name={product.name} />
      </div>
      <div className="product-info">
        <p className="eyebrow">
          {product.category === "bundles"
            ? "Room bundle"
            : product.material.split(" · ")[0] || product.category}
        </p>
        <Link href={target}>
          <h3>{product.name}</h3>
        </Link>
        <p className="product-price">
          {money(price)}
          {mode === "rent" ? <span> / month</span> : null}
        </p>
        <p className="product-meta">
          {mode === "rent"
            ? pilot
              ? "Pilot rate · before GST and logistics"
              : `Sample rate · ${tenure}-month plan`
            : "Sample purchase price"}
        </p>
        <Button asChild className="product-card-cta">
          <Link href={target}>
            {product.available && mode === "rent"
              ? "Check availability"
              : "View details"}{" "}
            <span aria-hidden="true">→</span>
          </Link>
        </Button>
      </div>
    </article>
  );
}
