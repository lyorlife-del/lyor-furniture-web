import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import {
  HomeHero,
  HomeRentals,
  type HomeRental,
} from "@/components/home-controls";
import { ProductGridLoading } from "@/components/product-grid-loading";
import { serverApi } from "@/lib/api";
import { catalogPath, readCatalogLocation } from "@/lib/catalog-location";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

const images = "/images/home/";
const categoryCards = [
  ["Sofas", "living", "category-sofas"],
  ["Beds", "bedroom", "category-beds"],
  ["Wardrobes", "storage", "category-wardrobes"],
  ["Dining sets", "dining", "category-dining"],
  ["Appliances", "appliances", "category-appliances"],
];
const rooms = [
  ["Living room", "A little room to unwind.", "living", "room-living"],
  ["Bedroom", "Your everyday retreat.", "bedroom", "hero-bedroom"],
  ["Dining room", "For meals and moments.", "dining", "hero-dining"],
];
const furniture = [
  [
    "Lounge sofas",
    "Sofas · Living room",
    "category-sofas",
    "living",
    "mira-sofa",
  ],
  ["Queen beds", "Beds · Bedroom", "category-beds", "bedroom", "arbor-bed"],
  [
    "Two-door wardrobes",
    "Wardrobes · Storage",
    "category-wardrobes",
    "storage",
    "haven-wardrobe",
  ],
  [
    "Dining sets",
    "Dining sets · Dining room",
    "category-dining",
    "dining",
    "gather-dining",
  ],
];
const appliances = [
  [
    "Front-load washers",
    "Laundry · Washing machines",
    "category-appliances",
    "appliances",
    "",
    "washing",
  ],
  [
    "Refrigerators",
    "Kitchen · Refrigerators",
    "appliance-fridge",
    "appliances",
    "everyday-fridge",
    "refrigerator",
  ],
  [
    "Split air conditioners",
    "Cooling · Air conditioners",
    "appliance-ac",
    "appliances",
    "",
    "air conditioner",
  ],
];
const steps = [
  [
    "Find your kind of home",
    "Explore furniture and appliances. Choose the pieces that fit your space.",
  ],
  [
    "Make it yours, monthly",
    "Select your rental tenure and check availability for your address.",
  ],
  [
    "Settle into everyday",
    "Review the delivery details and see your rental requests in your account.",
  ],
];
const benefits = [
  [
    "Your timeline",
    "Flexible tenures",
    "Choose from 3, 6 or 12 months to suit your next chapter.",
  ],
  [
    "No guesswork",
    "Monthly clarity",
    "Review your monthly rental and charges before you check out.",
  ],
  [
    "A little reassurance",
    "Deposit details",
    "Check the security deposit amount in your quote before you continue.",
  ],
  [
    "Your everyday",
    "One simple account",
    "See the status of your rental requests in your account.",
  ],
];
const quotes = [
  "A sofa that made our new place feel like home.",
  "The bedroom came together, one thoughtful piece at a time.",
  "Renting made room for the way we live right now.",
];
const questions = [
  [
    "How do I start renting?",
    "Choose your furniture or appliance, select a tenure and check availability for your address.",
  ],
  [
    "Which rental tenures can I choose?",
    "Choose from 3, 6 or 12 months. Review the monthly amount before checkout.",
  ],
  [
    "Is there a security deposit?",
    "Your quote shows any applicable security deposit and charges before you continue.",
  ],
  [
    "How is delivery scheduled?",
    "Check the delivery area using your PIN. Review the delivery information in your quote.",
  ],
];
function categoryHref(id: string, q?: string) {
  return (
    "/noida/rent?" +
    new URLSearchParams(q ? { category: id, q } : { category: id })
  );
}

export default function Home() {
  return (
    <div className="editorial-home">
      <HomeHero />
      <section className="editorial-wrap editorial-categories" id="categories">
        <p className="editorial-kicker">Find your everyday</p>
        <h2>Shop by category</h2>
        <p className="editorial-intro">
          Furniture and appliances for every corner of your home.
        </p>
        <div className="editorial-category-grid">
          {categoryCards.map(([name, id, photo]) => (
            <Link
              key={id}
              href={categoryHref(id)}
              className="editorial-category"
            >
              <div className="editorial-category-image">
                <Image
                  src={images + photo + ".png"}
                  alt=""
                  fill
                  sizes="(max-width: 650px) 45vw, 19vw"
                />
              </div>
              <span>
                {name}
                <span aria-hidden="true">↗</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <Suspense
        fallback={
          <div className="editorial-wrap">
            <ProductGridLoading count={4} label="Loading featured furniture…" />
          </div>
        }
      >
        <RentalCollections />
      </Suspense>
      <section className="editorial-value">
        <div className="editorial-wrap">
          <p className="editorial-kicker">The LYOR way</p>
          <h2>Good things. Less commitment.</h2>
          <p className="editorial-intro">
            A thoughtful way to make a place your own.
          </p>
          <div className="editorial-benefits">
            {benefits.map(([kicker, title, description]) => (
              <div key={title}>
                <p className="editorial-kicker">{kicker}</p>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section
        className="editorial-wrap editorial-stories"
        aria-labelledby="customer-stories"
      >
        <p className="editorial-kicker">People, places & everyday living</p>
        <h2 id="customer-stories">At home with LYOR</h2>
        <p className="editorial-intro">
          Illustrative reviews from the design preview.
        </p>
        <div className="editorial-review-grid">
          {quotes.map((quote) => (
            <figure key={quote}>
              <figcaption>Sample review</figcaption>
              <blockquote>“{quote}”</blockquote>
            </figure>
          ))}
        </div>
        <div className="editorial-faq">
          <div>
            <h2>
              A little clarity,
              <br />
              before you rent.
            </h2>
            <p className="editorial-intro">Your questions, answered.</p>
            <Link href="/business" className="editorial-arrow-link">
              Contact us <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div>
            {questions.map(([question, answer]) => (
              <details key={question} open>
                <summary>
                  {question}
                  <span aria-hidden="true"></span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

async function rentalCard([
  name,
  subtitle,
  photo,
  category,
  slug,
  query,
]: string[]): Promise<HomeRental> {
  const fallback = {
    name,
    subtitle,
    photo: images + photo + ".png",
    href: categoryHref(category, query),
  };
  if (!slug) return fallback;
  try {
    const product = await serverApi<Product>(await catalogPath("products/" + slug));
    if (!product.available && await readCatalogLocation()) return fallback;
    return {
      ...fallback,
      name: product.name,
      href: `/noida/product/${product.slug}?mode=rent`,
      monthlyPaise: product.monthlyPaise,
    };
  } catch {
    return fallback;
  }
}

async function RentalCollections() {
  const [furnitureCards, applianceCards] = await Promise.all([
    Promise.all(furniture.map(rentalCard)),
    Promise.all(appliances.map(rentalCard)),
  ]);
  return (
    <HomeRentals furniture={furnitureCards} appliances={applianceCards}>
      <section className="editorial-how" id="how-renting-works">
        <div className="editorial-wrap">
          <p className="editorial-kicker">Less effort. More living.</p>
          <h2>How renting works</h2>
          <p className="editorial-intro">
            From finding your favorites to making yourself at home.
          </p>
          <ol className="editorial-steps">
            {steps.map(([name, description], index) => (
              <li key={name}>
                <span aria-hidden="true">0{index + 1}</span>
                <div>
                  <h3>{name}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="editorial-wrap editorial-rooms" id="rooms">
        <p className="editorial-kicker">Spaces with a sense of you</p>
        <h2>Shop by room</h2>
        <p className="editorial-intro">
          A considered edit for living, resting and coming together.
        </p>
        <div className="editorial-room-grid">
          {rooms.map(([name, description, id, photo]) => (
            <Link key={id} href={categoryHref(id)} className="editorial-room">
              <div className="editorial-room-image">
                <Image
                  src={images + photo + ".png"}
                  alt=""
                  fill
                  sizes="(max-width: 650px) 92vw, 32vw"
                />
              </div>
              <h3>
                {name}
                <span aria-hidden="true">↗</span>
              </h3>
              <p>{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </HomeRentals>
  );
}
