import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@lyor/ui";
import { ProductCard } from "@/components/product-card";
import { ProductGridLoading } from "@/components/product-grid-loading";
import { CatalogNavigation } from "@/components/catalog-navigation";
import { serverApi } from "@/lib/api";
import { categories, type Product } from "@/lib/types";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ city: string; mode: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mode } = await params;
  return {
    title:
      mode === "buy" ? "Buy furniture in Noida" : "Rent furniture in Noida",
  };
}
export default async function Catalog({ params, searchParams }: Props) {
  const [{ city, mode }, search] = await Promise.all([params, searchParams]);
  if (city !== "noida" || (mode !== "rent" && mode !== "buy")) notFound();
  const value = (key: string) =>
    typeof search[key] === "string" ? (search[key] as string) : "";
  const category = value("category"),
    q = value("q"),
    sort = value("sort") || "featured",
    page = Math.max(1, Number(value("page")) || 1);
  const query = new URLSearchParams({ city, mode, sort, page: String(page) });
  if (category) query.set("category", category);
  if (q) query.set("q", q);
  return (
    <section className="section-wrap page-space">
      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <span>Noida</span>
        <span>/</span>
        <span>{mode === "rent" ? "Rent" : "Buy"}</span>
      </div>
      <div className="catalog-title">
        <div>
          <p className="eyebrow">FIND YOUR EVERYDAY FAVOURITES</p>
          <h1>
            {mode === "rent"
              ? "Furniture for right now."
              : "Find a piece to call yours."}
          </h1>
          <p>
            Thoughtful furniture, at your pace. Explore our synthetic Noida
            collection.
          </p>
        </div>
      </div>
      <CatalogNavigation>
        <nav className="category-pills" aria-label="Furniture categories">
          {categories.map((c) => (
            <Link
              key={c.id}
              data-catalog-link
              href={catalogLink(mode, query.toString(), {
                category: c.id === "all" ? "" : c.id,
                page: "1",
              })}
              aria-current={
                category === (c.id === "all" ? "" : c.id) ? "true" : undefined
              }
              className={
                category === (c.id === "all" ? "" : c.id) ? "selected" : ""
              }
            >
              {c.name}
            </Link>
          ))}
        </nav>
        <form
          className="catalog-toolbar"
          action={"/noida/" + mode}
          key={mode + ":" + q + ":" + sort}
        >
          <label className="sr-only" htmlFor="catalog-search">
            Search furniture
          </label>
          <input
            id="catalog-search"
            name="q"
            placeholder="Search for your next favourite piece…"
            defaultValue={q}
            autoFocus={value("focus") === "search"}
          />
          {category ? (
            <input type="hidden" name="category" value={category} />
          ) : null}
          <label className="sr-only" htmlFor="sort">
            Sort furniture
          </label>
          <select id="sort" name="sort" defaultValue={sort}>
            <option value="featured">Featured pieces</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="newest">Newest</option>
          </select>
          <Button type="submit" variant="outline">
            Apply
          </Button>
          {q || category || sort !== "featured" ? (
            <Link
              data-catalog-link
              href={"/noida/" + mode}
              className="text-link"
            >
              Clear filters
            </Link>
          ) : null}
        </form>
        <Suspense
          fallback={
            <div className="catalog-results">
              <ProductGridLoading count={8} label="Loading the collection…" />
            </div>
          }
        >
          <CatalogResults
            query={query.toString()}
            mode={mode}
            page={page}
            q={q}
          />
        </Suspense>
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
  page,
  q,
}: {
  mode: "rent" | "buy";
  query: string;
  page: number;
  q: string;
}) {
  let result: { items: Product[]; total: number; pageSize: number } | null =
    null;
  try {
    result = await serverApi("catalog?" + query);
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
                <ProductCard key={product.id} product={product} mode={mode} />
              ))}
            </div>
          ) : (
            <div className="notice">
              <h3>No pieces found just yet.</h3>
              <p>Try a different search or clear your filters.</p>
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
