import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError, serverApi } from "@/lib/api";
import type { Product } from "@/lib/types";
import { ProductDetails } from "@/components/product-details";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ city: string; slug: string }>;
  searchParams: Promise<{ mode?: string }>;
};
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: slug.replaceAll("-", " ") };
}
export default async function ProductPage({ params, searchParams }: Props) {
  const [{ city, slug }, search] = await Promise.all([params, searchParams]);
  if (city !== "noida") notFound();
  const mode = search.mode === "buy" ? "buy" : "rent";
  let product: Product;
  try {
    product = await serverApi("products/" + encodeURIComponent(slug));
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
  return (
    <ProductDetails
      product={product}
      key={slug + ":" + mode}
      initialMode={mode}
    />
  );
}
