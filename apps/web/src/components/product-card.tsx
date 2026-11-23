import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { money, type Product } from "@/lib/types";
export function ProductCard({
  product,
  mode = "rent",
}: {
  product: Product;
  mode?: "rent" | "buy";
}) {
  const pilot = product.id.startsWith("pilot-");
  return (
    <article className="product-card">
      <Link
        href={"/noida/product/" + product.slug + "?mode=" + mode}
        className="product-image"
      >
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
        <span className="product-add" aria-hidden="true">
          <Plus size={20} />
        </span>
      </Link>
      <div className="product-info">
        <p className="eyebrow">
          {product.category === "bundles"
            ? "Room bundle"
            : product.material.split(" · ")[0] || product.category}
        </p>
        <Link href={"/noida/product/" + product.slug + "?mode=" + mode}>
          <h3>{product.name}</h3>
        </Link>
        <p className="product-price">
          {money(mode === "buy" ? product.purchasePaise : product.monthlyPaise)}
          {mode === "rent" ? <span> / month</span> : null}
        </p>
        <p className="product-meta">
          {mode === "rent"
            ? pilot
              ? "Pilot rate · before GST and logistics"
              : "Sample rate · 6-month plan"
            : "Sample purchase price"}
        </p>
      </div>
    </article>
  );
}
