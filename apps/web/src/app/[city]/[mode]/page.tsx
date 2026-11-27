import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { Button } from "@lyor/ui";
import { ProductCard } from "@/components/product-card";
import { ProductGridLoading } from "@/components/product-grid-loading";
import { CatalogNavigation } from "@/components/catalog-navigation";
import { DeliveryLocationButton } from "@/components/delivery-location-button";
import { serverApi } from "@/lib/api";
import { readCatalogLocation, validCatalogueCity } from "@/lib/catalog-location";
import {
  categories,
  rentalTenure,
  rentalTenures,
  type Product,
  type RentalTenure,
} from "@/lib/types";
export const dynamic = "force-dynamic";
const categoryTiles = [
  ["All rentals", "", "room-living"],
  ["Sofas", "living", "category-sofas"],
  ["Beds", "bedroom", "category-beds"],
  ["Wardrobes", "storage", "category-wardrobes"],
  ["Dining sets", "dining", "category-dining"],
  ["Appliances", "appliances", "category-appliances"],
];
type Props = {
  params: Promise<{ city: string; mode: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mode } = await params;
  const selection = await readCatalogLocation().catch(() => null);
  return {
    title:
      (mode === "buy" ? "Buy" : "Rent") + " furniture in " + (selection?.zone?.city ?? "Noida"),
  };
}
export default async function Catalog({ params, searchParams }: Props) {
  const [{ city, mode }, search] = await Promise.all([params, searchParams]);
  if (mode !== "rent" && mode !== "buy") notFound();
  let location, valid;
  try {
    [location, valid] = await Promise.all([readCatalogLocation(), validCatalogueCity(city)]);
  } catch {
    return <section className="section-wrap page-space" role="alert">Delivery-area listings are temporarily unavailable. <a href="">Retry catalogue</a></section>;
  }
  if (!valid) notFound();
  if (city !== "noida" && location?.zone?.cityId !== city) return (
    <section className="section-wrap page-space"><h1>Choose a delivery PIN for this city</h1><DeliveryLocationButton /></section>
  );
  const value = (key: string) =>
    typeof search[key] === "string" ? (search[key] as string) : "";
  const category = value("category"),
    q = value("q"),
    sort = value("sort") || "featured",
    page = Math.min(1000, Math.max(1, Math.trunc(Number(value("page"))) || 1));
  const tenure = rentalTenure(value("tenure"));
  const query = new URLSearchParams({ city: "noida", mode, sort, page: String(page) });
  if (category) query.set("category", category);
  if (q) query.set("q", q);
  const apiParams = new URLSearchParams(query);
  if (location) apiParams.set("deliveryPin", location.pincode);
  const apiQuery = apiParams.toString();
  if (mode === "rent" && tenure !== 6) query.set("tenure", String(tenure));
  const catalogueQuery = query.toString();
  return (
    <section className="section-wrap page-space market-catalog">
      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <span>{location?.zone?.city ?? location?.geography?.city ?? "Noida"}</span>
        <span>/</span>
        <span>{mode === "rent" ? "Rent" : "Buy"}</span>
      </div>
      <div className="catalog-title">
        <div>
          <p className="eyebrow">FIND YOUR EVERYDAY FAVOURITES</p>
          <h1>
            {mode === "rent"
              ? "Furniture & appliances on rent"
              : "Find a piece to call yours."}
          </h1>
          <p>
            {location ? `Demo catalogue for PIN ${location.pincode}. ${location.deliverable ? "Prices are indicative." : location.message}`
              : "Thoughtful furniture, at your pace. Explore our synthetic Noida collection."}
          </p>
        </div>
      </div>
      <CatalogNavigation>
        <form
          className="catalog-toolbar"
          action={"/noida/" + mode}
          key={mode + ":" + q + ":" + sort + ":" + tenure}
        >
          <label className="sr-only" htmlFor="catalog-search">
            Search furniture
          </label>
          <input
            id="catalog-search"
            name="q"
            placeholder="Search sofas, beds, wardrobes, appliances…"
            defaultValue={q}
            autoFocus={value("focus") === "search"}
          />
          {category ? (
            <input type="hidden" name="category" value={category} />
          ) : null}
          {mode === "rent" && tenure !== 6 ? (
            <input type="hidden" name="tenure" value={tenure} />
          ) : null}
          <label className="sr-only" htmlFor="sort">
            Sort furniture
          </label>
          <select id="sort" name="sort" defaultValue={sort}>
            <option value="featured">Recommended</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="newest">Newest</option>
          </select>
          <Button type="submit" variant="outline">
            Apply
          </Button>
          <DeliveryLocationButton className="catalog-delivery" />
        </form>
        <p className="eyebrow">Explore categories</p>
        <nav
          className="catalog-category-tiles"
          aria-label="Featured categories"
        >
          {categoryTiles.map(([name, id, image]) => (
            <Link
              key={image}
              data-catalog-link
              href={catalogLink(mode, catalogueQuery, {
                category: id,
                page: "1",
              })}
              aria-current={category === id ? "true" : undefined}
            >
              <span className={`category-visual${id ? "" : " is-all"}`}>
                <Image
                  src={`/images/home/${image}.png`}
                  alt=""
                  fill
                  sizes="(max-width: 850px) 30vw, 16vw"
                />
              </span>
              <span>{!id && mode === "buy" ? "All furniture" : name}</span>
            </Link>
          ))}
        </nav>
        <div className="catalog-layout">
          <details className="catalog-sidebar" open>
            <summary>Filters</summary>
            {q || category || sort !== "featured" || tenure !== 6 ? (
              <Link
                data-catalog-link
                href={"/noida/" + mode}
                className="text-link"
              >
                Clear filters
              </Link>
            ) : null}
            <nav className="category-pills" aria-label="Furniture categories">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  data-catalog-link
                  href={catalogLink(mode, catalogueQuery, {
                    category: c.id === "all" ? "" : c.id,
                    page: "1",
                  })}
                  aria-current={
                    category === (c.id === "all" ? "" : c.id)
                      ? "true"
                      : undefined
                  }
                  className={
                    category === (c.id === "all" ? "" : c.id) ? "selected" : ""
                  }
                >
                  {c.name}
                </Link>
              ))}
            </nav>
            <div className="catalog-side-help">
              <strong>Need help?</strong>
              <p>Tell us what you’re furnishing.</p>
              <Link href="/business" className="text-link">
                Contact us
              </Link>
            </div>
          </details>
          <div>
            <div className="catalog-controls-heading">
              <h2>
                {categories.find((item) => item.id === category)?.name ??
                  (mode === "rent" ? "All rentals" : "All furniture")}
              </h2>
              {mode === "rent" ? (
                <nav className="tenure-pills" aria-label="Rental tenure">
                  {rentalTenures.map((months) => (
                    <Link
                      key={months}
                      data-catalog-link
                      href={catalogLink(mode, catalogueQuery, {
                        tenure: months === 6 ? "" : String(months),
                      })}
                      aria-current={months === tenure ? "true" : undefined}
                    >
                      {months} months
                    </Link>
                  ))}
                </nav>
              ) : null}
            </div>
            <Suspense
              fallback={
                <div className="catalog-results">
                  <ProductGridLoading
                    count={8}
                    label="Loading the collection…"
                  />
                </div>
              }
            >
              <CatalogResults
                query={catalogueQuery}
                apiQuery={apiQuery}
                mode={mode}
                page={page}
                q={q}
                tenure={tenure}
              />
            </Suspense>
          </div>
        </div>
      </CatalogNavigation>
    </section>
  );
}

function catalogLink(
  mode: string,
  query: string,
  changes: Record<string, string>,
) {
  const next = new URLSearchParams(query);
  next.delete("city");
  next.delete("mode");
  for (const [key, value] of Object.entries(changes)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  return "/noida/" + mode + "?" + next.toString();
}

async function CatalogResults({
  mode,
  query,
  apiQuery,
  page,
  q,
  tenure,
}: {
  mode: "rent" | "buy";
  query: string;
  apiQuery: string;
  page: number;
  q: string;
  tenure: RentalTenure;
}) {
  let result: { items: Product[]; total: number; pageSize: number } | null =
    null;
  try {
    result = await serverApi("catalog?" + apiQuery);
  } catch {
    // Keep a distinct recovery state for transport and service failures.
  }
  return (
    <div className="catalog-results">
      {!result ? (
        <div className="notice error-notice" role="alert">
          <h3>The catalog is temporarily unavailable.</h3>
          <p>
            We couldn’t reach the marketplace service. Please try again shortly.
          </p>
          <a href={catalogLink(mode, query, {})}>Try again</a>
        </div>
      ) : (
        <>
          <div className="catalog-meta">
            <span role="status">
              {result.total} considered pieces {q ? "matching “" + q + "”" : ""}
            </span>
            <span>
              {mode === "rent"
                ? "Monthly rental rates"
                : "Sample purchase prices"}
            </span>
          </div>
          {result.items.length ? (
            <div className="product-grid">
              {result.items.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  mode={mode}
                  tenure={tenure}
                />
              ))}
            </div>
          ) : (
            <div className="notice">
              <h3>No pieces found just yet.</h3>
              <p>{apiQuery.includes("deliveryPin=") ? "Try another delivery PIN or clear your filters." : "Try a different search or clear your filters."}</p>
              <Link data-catalog-link href={"/noida/" + mode}>
                See all furniture
              </Link>
            </div>
          )}
          <nav className="pagination" aria-label="Catalog pages">
            {page > 1 ? (
              <Link
                data-catalog-link
                href={catalogLink(mode, query, { page: String(page - 1) })}
                className="text-link"
              >
                Previous
              </Link>
            ) : null}
            <span>Page {page}</span>
            {page * result.pageSize < result.total ? (
              <Link
                data-catalog-link
                href={catalogLink(mode, query, { page: String(page + 1) })}
                className="text-link"
              >
                Next
              </Link>
            ) : null}
          </nav>
        </>
      )}
    </div>
  );
}
