"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@lyor/ui";
import { api, errorMessage } from "@/lib/api";
import { useStore } from "./store-provider";
import { HomeWishlist } from "./wishlist";
import { HomeNavigation } from "./home-navigation";
import { ManualLocationSelector } from "./manual-location-selector";
export function Header({
  databaseServiceability = false,
  currentLocation = false,
}: {
  databaseServiceability?: boolean;
  currentLocation?: boolean;
}) {
  const { cart, cartState, pin, setPin, session, notify } = useStore(),
    pathname = usePathname();
  const [open, setOpen] = useState(false),
    [input, setInput] = useState(""),
    [result, setResult] = useState<{
      deliverable: boolean;
      message: string;
    } | null>(null),
    [busy, setBusy] = useState(false);
  const locationRequest = useRef<AbortController | null>(null);
  const cartCount =
    cart?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
  useEffect(() => () => locationRequest.current?.abort(), []);
  function changeLocationOpen(next: boolean) {
    if (!next) {
      locationRequest.current?.abort();
      locationRequest.current = null;
      setBusy(false);
      setResult(null);
    } else {
      setInput(pin);
    }
    setOpen(next);
  }
  async function check(event: React.FormEvent) {
    event.preventDefault();
    if (locationRequest.current) return;
    const controller = new AbortController();
    locationRequest.current = controller;
    setBusy(true);
    try {
      const data = await api<{ deliverable: boolean; message: string }>(
        "serviceability?pin=" + encodeURIComponent(input),
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      setResult(data);
      if (data.deliverable) {
        setPin(input);
        notify("Noida demo delivery area selected. Review any existing quote.");
        changeLocationOpen(false);
      }
    } catch (error) {
      if (!controller.signal.aborted)
        setResult({ deliverable: false, message: errorMessage(error) });
    } finally {
      if (locationRequest.current === controller) {
        locationRequest.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <div className="editorial-header-shell">
      <div className="editorial-announcement">
        A little comfort, delivered. Explore furniture rentals in Noida.
      </div>
      <header className="editorial-header editorial-wrap">
        <Link href="/" aria-label="LYOR home" className="editorial-brand">
          <strong>LYOR</strong>
          <span>Home, at your pace</span>
        </Link>
        {databaseServiceability ? (
          <ManualLocationSelector currentLocation={currentLocation} />
        ) : (
          <Dialog.Root open={open} onOpenChange={changeLocationOpen}>
            <Dialog.Trigger asChild>
              <button id="editorial-location" className="editorial-location">
                <span>
                  <small>Deliver to</small>
                  <strong>Noida</strong>
                  <span className="location-pin">{` · ${pin || "Enter pincode"}`}</span>
                </span>
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="dialog-overlay" />
              <Dialog.Content className="dialog-content">
                <Dialog.Title>Delivery location</Dialog.Title>
                <Dialog.Description>
                  Check availability for your address in the Noida demo area.
                </Dialog.Description>
                <Dialog.Close
                  className="dialog-close"
                  aria-label="Close location selector"
                >
                  <X size={20} />
                </Dialog.Close>
                <div className="delivery-city">
                  <small>City</small>
                  <strong>Noida</strong>
                </div>
                <form onSubmit={check}>
                  <label htmlFor="delivery-pin">Delivery PIN</label>
                  <input
                    id="delivery-pin"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="Try 201304"
                    value={input}
                    disabled={busy}
                    onChange={(e) => {
                      setInput(e.target.value);
                      setResult(null);
                    }}
                    required
                  />
                  <Button disabled={busy} className="mt-4 w-full">
                    {busy ? "Checking…" : "Check availability"}
                  </Button>
                </form>
                {result && !result.deliverable ? (
                  <div className="notice mt-4" role="alert">
                    {result.message}
                    <Link
                      href="/business"
                      onClick={() => changeLocationOpen(false)}
                    >
                      Send an enquiry
                    </Link>
                  </div>
                ) : null}
                <p className="small-note">
                  Availability is checked for your delivery PIN.
                </p>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
        <form
          action={pathname === "/noida/buy" ? "/noida/buy" : "/noida/rent"}
          className="editorial-search"
          role="search"
        >
          <button type="submit" aria-label="Search furniture">
            <Image
              src="/images/home/nav-search.svg"
              width={22}
              height={22}
              alt=""
              unoptimized
            />
          </button>
          <input
            name="q"
            aria-label="Search furniture, appliances and more"
            placeholder="Search furniture, appliances & more"
          />
        </form>
        <div className="editorial-header-actions">
          <HomeWishlist />
          <Link
            href="/cart"
            className="editorial-header-icon"
            aria-label={
              cartState.status === "ready" ? `Cart, ${cartCount} items` : "Cart"
            }
          >
            <span className="editorial-cart-image">
              <Image
                src="/images/home/nav-cart.svg"
                width={22}
                height={22}
                alt=""
                unoptimized
              />
              <small>{cartCount}</small>
            </span>
            <span>Cart</span>
          </Link>
          {session ? (
            <AccountMenu key={session.id} name={session.name} />
          ) : (
            <Link
              href="/account/orders"
              className="editorial-account"
              aria-label="Select demo identity"
            >
              <Image
                src="/images/home/nav-user.svg"
                width={22}
                height={22}
                alt=""
                unoptimized
              />
              <span>Login / My Account</span>
            </Link>
          )}
        </div>
      </header>
      <HomeNavigation key={pathname} showBuy={pathname !== "/"} />
    </div>
  );
}

function AccountMenu({ name }: { name: string }) {
  const { signOut } = useStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function leaveDemo() {
    setError("");
    setBusy(true);
    try {
      await signOut();
    } catch (error) {
      setError(errorMessage(error));
      setBusy(false);
    }
  }
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="editorial-account" aria-label="Your account">
        <Image
          src="/images/home/nav-user.svg"
          width={22}
          height={22}
          alt=""
          unoptimized
        />
        <span>My Account</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title>Your LYOR account</Dialog.Title>
          <Dialog.Description>{name}</Dialog.Description>
          <Dialog.Close className="dialog-close" aria-label="Close account">
            <X size={20} />
          </Dialog.Close>
          <div className="mt-5 grid gap-3">
            <Button asChild>
              <Link href="/account/orders" onClick={() => setOpen(false)}>
                Your orders
              </Link>
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void leaveDemo()}
            >
              {busy ? "Signing out…" : "Sign out of demo"}
            </Button>
          </div>
          {error ? (
            <p className="notice error-notice mt-4" role="alert">
              {error}
            </p>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
