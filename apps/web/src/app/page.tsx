import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import {
  Armchair,
  BedDouble,
  LampDesk,
  UtensilsCrossed,
  Refrigerator,
  PackageOpen,
  CalendarDays,
  Truck,
  Leaf,
  Check,
} from "lucide-react";
import { Button } from "@lyor/ui";
import { ProductCard } from "@/components/product-card";
import { ProductGridLoading } from "@/components/product-grid-loading";
import { serverApi } from "@/lib/api";
import type { Product } from "@/lib/types";
export const dynamic = "force-dynamic";
export default function Home() {
  const categories = [
    { name: "Living room", id: "living", Icon: Armchair },
    { name: "Bedroom", id: "bedroom", Icon: BedDouble },
    { name: "Work from home", id: "study", Icon: LampDesk },
    { name: "Dining", id: "dining", Icon: UtensilsCrossed },
    { name: "Appliances", id: "appliances", Icon: Refrigerator },
    { name: "Room bundles", id: "bundles", Icon: PackageOpen },
  ];
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="short-line" /> YOUR SPACE. YOUR NEXT CHAPTER.
          </p>
          <h1>
            A little more home.
            <br />A lot less
            <br />
            <em>commitment.</em>
          </h1>
          <p className="hero-description">
            For first apartments, fresh starts, and everything in between. Find
            furniture that fits your life. Rent it, love it, make it yours.
          </p>
          <div className="hero-cta">
            <Button asChild>
              <Link href="/noida/rent">Find your furniture</Link>
            </Button>
            <Link href="/bundles" className="text-link">
              Explore room bundles
            </Link>
          </div>
          <div className="hero-trust">
            <span>
              <Check size={15} /> Flexible demo plans
            </span>
            <span>
              <Check size={15} /> Clear price breakdowns
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <Image
            src="/images/slow-sunday.jpg"
            alt="A considered living room with comfortable seating and natural light"
            fill
            priority
            sizes="(max-width: 800px) 100vw, 55vw"
          />
          <div className="hero-caption">
            <span>Spaces to settle into.</span>
            <small>Living room edit · Discover your style</small>
          </div>
          <div className="hero-stamp">
            ROOM FOR
            <br />
            <strong>your life.</strong>
          </div>
        </div>
      </section>
      <section className="categories-section section-wrap">
        <div className="section-heading compact">
          <h2>What feels like home?</h2>
          <p>Start with a room. Make it your own.</p>
        </div>
        <div className="category-strip">
          {categories.map(({ name, id, Icon }) => (
            <Link
              key={id}
              href={
                id === "bundles" ? "/bundles" : "/noida/rent?category=" + id
              }
            >
              <span>
                <Icon size={31} strokeWidth={1.3} />
              </span>
              <strong>{name}</strong>
            </Link>
          ))}
        </div>
      </section>
      <section className="section-wrap featured">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE EVERYDAY EDIT</p>
            <h2>Good pieces. Great beginnings.</h2>
          </div>
          <Link href="/noida/rent" className="text-link">
            Explore all furniture
          </Link>
        </div>
        <Suspense
          fallback={
            <ProductGridLoading count={4} label="Loading featured furniture…" />
          }
        >
          <FeaturedFurniture />
        </Suspense>
      </section>
      <section className="bundle-feature section-wrap">
        <div className="bundle-image">
          <Image
            src="/images/room-to-begin.jpg"
            alt="A welcoming furnished room with warm wood and natural textures"
            fill
            sizes="(max-width: 800px) 100vw, 50vw"
          />
        </div>
        <div className="bundle-copy">
          <p className="eyebrow">BETTER TOGETHER</p>
          <h2>
            One room.
            <br />A whole new feeling.
          </h2>
          <p>
            Skip the mix-and-match guesswork. Explore considered bundles that
            bring your essentials together.
          </p>
          <Button asChild variant="outline">
            <Link href="/bundles">Meet the bundles</Link>
          </Button>
          <span className="small-note">
            Fixed combinations · Clearly listed inclusions
          </span>
        </div>
      </section>
      <section className="section-wrap how-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">LESS FUSS. MORE LIVING.</p>
            <h2>Make yourself at home.</h2>
          </div>
          <p>A simple way to try your next chapter.</p>
        </div>
        <div className="benefit-grid">
          <div>
            <CalendarDays size={27} />
            <h3>Choose your rhythm</h3>
            <p>
              Explore 3, 6 and 12-month demo rental plans, or find a piece to
              buy.
            </p>
          </div>
          <div>
            <Truck size={29} />
            <h3>Know what to expect</h3>
            <p>
              Check your demo delivery area and see the complete quote before
              continuing.
            </p>
          </div>
          <div>
            <Leaf size={28} />
            <h3>Make room for change</h3>
            <p>
              Discover versatile furniture for the home you have and the life
              you’re building.
            </p>
          </div>
        </div>
      </section>
      <section className="business-band">
        <div>
          <p className="eyebrow">A BIGGER SPACE IN MIND?</p>
          <h2>Your project. Our next conversation.</h2>
          <p>
            Furnishing a workspace, co-living property, or several homes? Tell
            us what you need.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/business">Let’s talk business</Link>
        </Button>
      </section>
    </>
  );
}

async function FeaturedFurniture() {
  let products: Product[];
  try {
    products = (
      await serverApi<{ items: Product[] }>("catalog?city=noida&sort=featured")
    ).items
      .filter((p) => p.category !== "bundles")
      .slice(0, 4);
  } catch {
    return (
      <div className="notice" role="status">
        <h3>The collection is taking a moment.</h3>
        <p>Our catalog service is unavailable. Please try again shortly.</p>
        <Link href="/noida/rent">Try the collection again</Link>
      </div>
    );
  }
  if (!products.length) {
    return (
      <p className="notice">
        There are no featured pieces right now.{" "}
        <Link href="/noida/rent">Browse the collection</Link>
      </p>
    );
  }
  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
