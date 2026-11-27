"use client";

import Image from "next/image";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { useSyncExternalStore } from "react";
import { useStore } from "./store-provider";

const media = "/images/home/";
type Favorite = { href: string; name: string };
const wishlistKey = "lyor-home-wishlist-v1";
const wishlistEvent = "lyor-home-wishlist";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(wishlistEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(wishlistEvent, callback);
  };
}

function wishlistSnapshot() {
  try {
    return localStorage.getItem(wishlistKey) ?? "[]";
  } catch {
    return "[]";
  }
}

function useWishlist(): Favorite[] {
  const snapshot = useSyncExternalStore(
    subscribe,
    wishlistSnapshot,
    () => "[]",
  );
  try {
    const parsed: unknown = JSON.parse(snapshot);
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is Favorite =>
            typeof item?.href === "string" &&
            item.href.startsWith("/noida/") &&
            typeof item.name === "string",
        )
      : [];
  } catch {
    return [];
  }
}

export function WishlistButton({ href, name }: Favorite) {
  const items = useWishlist();
  const { notify } = useStore();
  const saved = items.some((item) => item.href === href);
  function toggle() {
    const updated = saved
      ? items.filter((item) => item.href !== href)
      : [...items, { href, name }];
    try {
      localStorage.setItem(wishlistKey, JSON.stringify(updated));
      window.dispatchEvent(new Event(wishlistEvent));
    } catch {
      notify("Your browser could not save the wishlist.");
    }
  }
  return (
    <button
      type="button"
      className="editorial-save"
      aria-label={saved ? `Remove ${name} from wishlist` : `Save ${name}`}
      aria-pressed={saved}
      onClick={toggle}
    >
      <Image
        src={media + "nav-heart.svg"}
        width={18}
        height={18}
        alt=""
        unoptimized
      />
    </button>
  );
}

export function HomeWishlist() {
  const items = useWishlist();
  return (
    <Dialog.Root>
      <Dialog.Trigger className="editorial-header-icon">
        <Image
          src={media + "nav-heart.svg"}
          width={20}
          height={20}
          alt=""
          unoptimized
        />
        <span>Wishlist</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title>Your wishlist</Dialog.Title>
          <Dialog.Description>Saved on this device.</Dialog.Description>
          <Dialog.Close className="dialog-close" aria-label="Close wishlist">
            ×
          </Dialog.Close>
          {items.length ? (
            <ul className="mt-5 grid gap-2">
              {items.map((item) => (
                <li key={item.href}>
                  <Dialog.Close asChild>
                    <Link className="text-link" href={item.href}>
                      {item.name}
                    </Link>
                  </Dialog.Close>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5">Save a favorite to find it here.</p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
