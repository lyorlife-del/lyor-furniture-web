"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const categories = [
  [
    "Bedroom",
    "bedroom",
    "hero-bedroom",
    ["Beds", "Mattresses", "Bedside tables"],
  ],
  [
    "Living room",
    "living",
    "room-living",
    ["Sofas", "Chairs", "Coffee tables"],
  ],
  ["Dining", "dining", "hero-dining", ["Dining sets", "Tables", "Chairs"]],
  [
    "Storage",
    "storage",
    "category-wardrobes",
    ["Wardrobes", "Cabinets", "Shelves"],
  ],
  [
    "Appliances",
    "appliances",
    "category-appliances",
    ["Refrigerators", "Washers", "Air conditioners"],
  ],
  [
    "Study & office",
    "study",
    "room-living",
    ["Desks", "Study chairs", "Work from home"],
  ],
  ["Rental combos", "bundles", "hero-living", ["Room bundles"]],
  ["Home décor", "accessories", "hero-living", ["Accessories"]],
] as const;
const nav = [
  ["Shop by Category", 0],
  ["Furniture", 1],
  ["Appliances", 4],
  ["Home Décor", 7],
  ["Rental Packages", 6],
] as const;
const icons = [
  "bedroom",
  "living-room",
  "dining",
  "storage",
  "appliances",
  "study-office",
  "rental-combos",
  "home-decor",
];

function browse(category: string, query?: string) {
  if (category === "bundles") return "/bundles";
  return (
    "/noida/rent?" +
    new URLSearchParams(query ? { category, q: query } : { category })
  );
}

export function HomeNavigation({ showBuy = false }: { showBuy?: boolean }) {
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [active, setActive] = useState<number>(0);
  const [name, category, photo, groups] = categories[active];
  return (
    <nav
      aria-label="Main navigation"
      className="editorial-nav"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          const trigger = event.currentTarget.querySelector<HTMLButtonElement>(
            "[aria-expanded=true]",
          );
          setOpenMenu(null);
          trigger?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setOpenMenu(null);
      }}
    >
      <div className="editorial-wrap editorial-nav-row">
        <Link href="/noida/rent" className="editorial-nav-rent">
          Rent <span aria-hidden="true">⌄</span>
        </Link>
        {showBuy ? <Link href="/noida/buy">Buy</Link> : null}
        {nav.map(([label, index]) => (
          <button
            key={label}
            type="button"
            aria-controls="editorial-category-menu"
            aria-expanded={openMenu === index}
            onClick={() => {
              setOpenMenu(openMenu === index ? null : index);
              setActive(index);
            }}
          >
            {label} <span aria-hidden="true">⌄</span>
          </button>
        ))}
        <Link href="/noida/rent" className="editorial-all">
          Browse all rentals <span aria-hidden="true">↗</span>
        </Link>
      </div>
      {openMenu !== null ? (
        <div
          className="editorial-wrap editorial-mega"
          id="editorial-category-menu"
        >
          <div className="editorial-mega-categories">
            <p className="editorial-kicker">Shop by category</p>
            {categories.map(([label], index) => (
              <button
                type="button"
                key={label}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onClick={() => setActive(index)}
                aria-pressed={active === index}
              >
                <Image
                  src={`/images/home/menu-${icons[index]}-icon.svg`}
                  width={20}
                  height={20}
                  alt=""
                  unoptimized
                />
                <span>{label}</span>
                <span aria-hidden="true">›</span>
              </button>
            ))}
          </div>
          <div className="editorial-mega-links">
            <p className="editorial-kicker">Home, at your pace</p>
            <h2>{name}</h2>
            <Link
              className="editorial-arrow-link"
              href={browse(category)}
              onClick={() => setOpenMenu(null)}
            >
              View all {name.toLowerCase()} ↗
            </Link>
            <ul>
              {groups.map((group) => (
                <li key={group}>
                  <Link
                    href={browse(category, group)}
                    onClick={() => setOpenMenu(null)}
                  >
                    {group} <span aria-hidden="true">↗</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="editorial-mega-secondary">
              <Link href="/noida/buy" onClick={() => setOpenMenu(null)}>
                Buy furniture
              </Link>
              <Link href="/business" onClick={() => setOpenMenu(null)}>
                For business
              </Link>
            </div>
          </div>
          <Link
            className="editorial-mega-photo"
            href={browse(category)}
            onClick={() => setOpenMenu(null)}
            aria-label={`Browse ${name}`}
          >
            <Image src={`/images/home/${photo}.png`} fill sizes="28vw" alt="" />
          </Link>
        </div>
      ) : null}
    </nav>
  );
}
