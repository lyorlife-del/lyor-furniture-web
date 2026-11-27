import { serverApi } from "@/lib/api";
import { catalogPath } from "@/lib/catalog-location";
import { ProductCard } from "@/components/product-card";
import Link from "next/link";
import type { Product } from "@/lib/types";
export const dynamic = "force-dynamic";
export const metadata = { title: "Room bundles" };
export default async function Bundles() {
  let items: Product[] | null = null;
  try {
    items = (await serverApi<{ items: Product[] }>(await catalogPath("bundles"))).items;
  } catch {}
  return (
    <section className="section-wrap page-space">
      <div className="page-heading">
        <p className="eyebrow">BETTER TOGETHER</p>
        <h1>A room, already considered.</h1>
        <p className="muted">
          Fixed combinations of everyday essentials. See every included piece
          before you choose.
        </p>
      </div>
      {items?.length ? (
        <div className="product-grid">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : items ? (
        <div className="notice">
          <h2>No room bundles available</h2>
          <p>Explore individual pieces for your space.</p>
          <Link href="/noida/rent">Browse rentals</Link>
        </div>
      ) : (
        <div className="notice" role="alert">
          The bundle collection is unavailable. Please try again shortly.
          <Link href="/bundles?retry=1">Try again</Link>
        </div>
      )}
    </section>
  );
}
