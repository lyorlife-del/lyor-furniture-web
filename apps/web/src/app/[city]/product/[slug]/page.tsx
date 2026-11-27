import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError, serverApi } from "@/lib/api";
import { rentalTenure, type Product, type RentalTenure } from "@/lib/types";
import { ProductDetails } from "@/components/product-details";
import { Suspense } from "react";
import { ProductCard } from "@/components/product-card";
import { readCatalogLocation, validCatalogueCity, catalogPath } from "@/lib/catalog-location";
import { DeliveryLocationButton } from "@/components/delivery-location-button";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ city: string; slug: string }>;
  searchParams: Promise<{ mode?: string; tenure?: string }>;
};
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: slug.replaceAll("-", " ") };
}
export default async function ProductPage({ params, searchParams }: Props) {
  const [{ city, slug }, search] = await Promise.all([params, searchParams]);
  const mode = search.mode === "buy" ? "buy" : "rent";
  const tenure = rentalTenure(search.tenure);
  let product: Product;
  let selectedPin = "";
  let selectedCity;
  let validCity = true;
  try {
    validCity = await validCatalogueCity(city);
    const selection = await readCatalogLocation();
    selectedPin = selection?.pincode ?? "";
    selectedCity = selection?.zone?.cityId;
    product = await serverApi(await catalogPath("products/" + encodeURIComponent(slug)));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <section className="section-wrap page-space">
        <h1>This piece is taking a moment.</h1>
        <p>The listing could not be loaded. Please try again shortly.</p>
        <a
          href={
            "/" +
            city +
            "/product/" +
            encodeURIComponent(slug) +
            "?mode=" +
            mode
          }
          className="text-link"
        >
          Retry listing
        </a>{" "}
        <Link href="/noida/rent" className="text-link">
          Return to the collection
        </Link>
      </section>
    );
  }
  if (!validCity) notFound();
  if (city !== "noida" && city !== selectedCity) return (
    <section className="section-wrap page-space"><h1>Choose a delivery PIN for this city</h1><DeliveryLocationButton /></section>
  );
  return (
    <>
      <ProductDetails
        product={product}
        selectedPin={selectedPin}
        key={slug + ":" + mode + ":" + tenure}
        initialMode={mode}
        initialTenure={tenure}
      />
      <Suspense fallback={null}>
        <RelatedProducts product={product} mode={mode} tenure={tenure} />
      </Suspense>
    </>
  );
}

async function RelatedProducts({
  product,
  mode,
  tenure,
}: {
  product: Product;
  mode: "rent" | "buy";
  tenure: RentalTenure;
}) {
  const query = new URLSearchParams({
    city: "noida",
    mode,
    category: product.category,
    sort: "featured",
  });
  let items: Product[];
  try {
    items = (await serverApi<{ items: Product[] }>(await catalogPath("catalog?" + query))).items
      .filter((candidate) => candidate.id !== product.id)
      .slice(0, 3);
  } catch {
    return null;
  }
  if (!items.length) return null;
  return (
    <section
      className="section-wrap page-space product-detail-related"
      aria-labelledby="related-products"
    >
      <div className="section-heading">
        <h2 id="related-products">
          Similar {mode === "rent" ? "rental " : ""}products
        </h2>
        <Link
          href={`/noida/${mode}?category=${encodeURIComponent(product.category)}`}
          className="text-link"
        >
          See the collection
        </Link>
      </div>
      <div className="product-grid">
        {items.map((item) => (
          <ProductCard
            key={item.id}
            product={item}
            mode={mode}
            tenure={tenure}
          />
        ))}
      </div>
    </section>
  );
}
