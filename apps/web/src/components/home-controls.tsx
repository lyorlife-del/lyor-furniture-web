"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { money, rentalPrice } from "@/lib/types";
import { useStore } from "./store-provider";
import { WishlistButton } from "./wishlist";

const media = "/images/home/";
const slides = ["living", "bedroom", "dining"];
export function HomeHero() {
  const [active, setActive] = useState(0);
  const touchStart = useRef<number | null>(null);
  function step(offset: number) {
    setActive((current) => (current + offset + slides.length) % slides.length);
  }
  return (
    <section
      className="editorial-hero editorial-wrap"
      aria-label="The slow living collection"
    >
      <div
        className="editorial-hero-inner"
        onTouchStart={(event) => {
          touchStart.current = event.touches[0].clientX;
        }}
        onTouchEnd={(event) => {
          if (touchStart.current === null) return;
          const difference =
            touchStart.current - event.changedTouches[0].clientX;
          touchStart.current = null;
          if (Math.abs(difference) > 45) step(difference > 0 ? 1 : -1);
        }}
      >
        <Image
          key={active}
          src={media + `hero-${slides[active]}.png`}
          alt=""
          fill
          sizes="(max-width: 600px) 100vw, 94vw"
          priority={active === 0}
        />
        <div className="editorial-hero-copy">
          <p className="editorial-kicker">The slow living collection</p>
          <h1>
            A softer kind
            <br />
            of everyday.
          </h1>
          <p className="editorial-hero-description">
            Thoughtful pieces for the little rituals
            <br className="editorial-desktop-break" /> that make a house feel
            like home.
          </p>
          <Link
            className="editorial-button editorial-primary"
            href="/noida/rent"
          >
            Rent Now{" "}
            <Image
              src={media + "hero-arrow.svg"}
              width={20}
              height={20}
              alt=""
              unoptimized
            />
          </Link>
        </div>
        <p className="editorial-hero-detail">
          Natural textures. Lasting comfort.
        </p>
        <div className="editorial-hero-caption">
          <strong>Make room for the everyday.</strong>
          <span>Discover the art of a slower home</span>
        </div>
        <div className="editorial-carousel" aria-label="Lifestyle photos">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous photograph"
          >
            ←
          </button>
          {slides.map((slide, index) => (
            <button
              type="button"
              key={slide}
              onClick={() => setActive(index)}
              aria-label={`Show ${slide} photograph`}
              aria-pressed={index === active}
            >
              0{index + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next photograph"
          >
            →
          </button>
        </div>
        <p className="editorial-carousel-hint">
          Swipe or use the arrows to explore
        </p>
      </div>
    </section>
  );
}

export type HomeRental = {
  name: string;
  subtitle: string;
  photo: string;
  href: string;
  monthlyPaise?: number;
};

export function HomeRentals({
  furniture,
  appliances,
  children,
}: {
  furniture: HomeRental[];
  appliances: HomeRental[];
  children: React.ReactNode;
}) {
  const [tenure, setTenure] = useState<3 | 6 | 12>(6);
  const { pin } = useStore();
  return (
    <>
      <section className="editorial-wrap editorial-trending" id="furniture">
        <div className="editorial-title-row">
          <div>
            <p className="editorial-kicker">Your next favorites</p>
            <h2>Trending furniture on rent</h2>
          </div>
          <Link className="editorial-arrow-link" href="/noida/rent">
            Browse all rentals{" "}
            <Image
              src={media + "trend-arrow.svg"}
              width={20}
              height={20}
              alt=""
              unoptimized
            />
          </Link>
        </div>
        <div className="editorial-preferences">
          <div>
            <p>Delivery location</p>
            <button
              type="button"
              onClick={() =>
                document.getElementById("editorial-location")?.click()
              }
            >
              <span>Noida{pin ? ` · ${pin}` : ""}</span>
              <span>Change</span>
            </button>
          </div>
          <div>
            <p id="home-tenure">Rental tenure</p>
            <div role="group" aria-labelledby="home-tenure">
              {([3, 6, 12] as const).map((months) => (
                <button
                  key={months}
                  type="button"
                  aria-pressed={months === tenure}
                  onClick={() => setTenure(months)}
                >
                  {months} months
                </button>
              ))}
            </div>
          </div>
          <div className="editorial-preferences-note">
            <strong>A home for now. Comfort that lasts.</strong>
            <span>Monthly pricing · Security deposit shown in your quote</span>
          </div>
        </div>
        <RentalCards items={furniture} tenure={tenure} />
        <p className="editorial-availability">
          Confirm availability for your address before placing an order.
        </p>
      </section>
      {children}
      <section className="editorial-wrap editorial-appliances" id="appliances">
        <p className="editorial-kicker">Everyday, made easier</p>
        <h2>Appliances on rent</h2>
        <p className="editorial-intro">
          The essentials that keep your home running, without buying them
          outright.
        </p>
        <RentalCards items={appliances} tenure={tenure} appliance />
      </section>
    </>
  );
}

function RentalCards({
  items,
  tenure,
  appliance = false,
}: {
  items: HomeRental[];
  tenure: 3 | 6 | 12;
  appliance?: boolean;
}) {
  return (
    <div
      className={`editorial-rental-grid${appliance ? " is-appliances" : ""}`}
    >
      {items.map(({ name, subtitle, photo, href, monthlyPaise }) => {
        const listing = href.includes("/product/");
        const target = listing ? `${href}&tenure=${tenure}` : href;
        return (
          <article className="editorial-rental-card" key={photo}>
            <div className="editorial-product-image">
              <Link href={target} aria-label={name}>
                <Image
                  src={photo}
                  alt=""
                  fill
                  sizes={
                    appliance
                      ? "(max-width: 650px) 92vw, 32vw"
                      : "(max-width: 650px) 45vw, 24vw"
                  }
                />
              </Link>
              {listing ? <WishlistButton href={href} name={name} /> : null}
            </div>
            <h3>
              <Link href={target}>{name}</Link>
            </h3>
            <p>{subtitle}</p>
            <Link className="editorial-card-price" href={target}>
              {typeof monthlyPaise === "number"
                ? `${money(rentalPrice({ monthlyPaise }, tenure))} / month`
                : "View monthly rent"}
            </Link>
            <p className="editorial-card-availability">
              <span>Availability</span>
              <span>Check for Noida</span>
            </p>
            <Link
              className={`editorial-button ${appliance ? "editorial-primary" : "editorial-outline"}`}
              href={target}
            >
              {listing ? "Check availability & rent" : "Explore this category"}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
