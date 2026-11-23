import { serverApi } from "@/lib/api";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/types";
export const dynamic = "force-dynamic";
export const metadata = { title: "Room bundles" };
export default async function Bundles() {
  let items: Product[] | null = null;
  try {
    items = (await serverApi<{ items: Product[] }>("bundles")).items;
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
      {items ? (
        <div className="product-grid">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="notice" role="alert">
          The bundle collection is unavailable. Please try again shortly.
        </div>
      )}
    </section>
  );
}
