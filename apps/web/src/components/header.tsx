"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  MapPin,
  Search,
  ShoppingBag,
  UserRound,
  X,
  Menu,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@lyor/ui";
import { api, errorMessage } from "@/lib/api";
import { useStore } from "./store-provider";
export function Header() {
  const { cart, cartState, pin, setPin, session, notify } = useStore(),
    pathname = usePathname(),
    router = useRouter();
  const [open, setOpen] = useState(false),
    [input, setInput] = useState(""),
    [result, setResult] = useState<{
      deliverable: boolean;
      message: string;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false);
  const locationRequest = useRef<AbortController | null>(null);
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
    <>
      <div className="announcement">
        <span>Make room for a life you love.</span>
        <Link href="/noida/rent">Explore furniture rentals</Link>
        <span className="demo-tag">LOCAL DEMO · SAMPLE PRICES & STOCK</span>
      </div>
      <header className="site-header">
        <Link href="/" aria-label="LYOR home" className="brand">
          <Image
            src="/images/lyor-logo.svg"
            alt="LYOR"
            width={91}
            height={36}
            priority
          />
          <span>furniture</span>
        </Link>
        <Dialog.Root open={open} onOpenChange={changeLocationOpen}>
          <Dialog.Trigger asChild>
            <button className="location-button">
              <MapPin size={18} />
              <span>
                <small>Delivery location</small>
                <strong>Noida</strong>
                <span className="location-pin">{pin}</span>
              </span>
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay" />
            <Dialog.Content className="dialog-content">
              <Dialog.Title>Let’s find your neighbourhood.</Dialog.Title>
              <Dialog.Description>
                Check a PIN in our synthetic Noida delivery zone. This is demo
                coverage, not a delivery promise.
              </Dialog.Description>
              <Dialog.Close
                className="dialog-close"
                aria-label="Close location selector"
              >
                <X size={20} />
              </Dialog.Close>
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
                <CheckCircle2 size={16} /> Noida · demo city
              </p>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        <nav
          aria-label="Main navigation"
          className={mobile ? "main-nav is-open" : "main-nav"}
        >
          {[
            ["Rent", "/noida/rent"],
            ["Buy", "/noida/buy"],
            ["Bundles", "/bundles"],
            ["For business", "/business"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={pathname === href ? "active" : ""}
              onClick={() => setMobile(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button
            aria-label="Search furniture"
            onClick={() => {
              router.push("/noida/rent?focus=search");
            }}
          >
            <Search size={21} />
          </button>
          {session ? (
            <AccountMenu key={session.id} name={session.name} />
          ) : (
            <Link href="/account/orders" aria-label="Select demo identity">
              <UserRound size={21} />
            </Link>
          )}
          <Link
            href="/cart"
            aria-label={
              cartState.status !== "ready"
                ? "Cart"
                : "Cart, " +
                  (cart?.lines.reduce((sum, line) => sum + line.quantity, 0) ??
                    0) +
                  " items"
            }
            className="cart-icon"
          >
            <ShoppingBag size={22} />
            {cart?.lines.length ? (
              <span>
                {cart.lines.reduce((sum, line) => sum + line.quantity, 0)}
              </span>
            ) : null}
          </Link>
          <button
            className="menu-toggle"
            aria-label="Toggle navigation"
            aria-expanded={mobile}
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>
    </>
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
      <Dialog.Trigger className="account-trigger" aria-label="Your account">
        <UserRound size={21} />
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
