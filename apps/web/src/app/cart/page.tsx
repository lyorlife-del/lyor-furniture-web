"use client";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@lyor/ui";
import { useStore } from "@/components/store-provider";
import { PriceSummary } from "@/components/price-summary";
import { IdentityPicker } from "@/components/identity-picker";
import { storeQuote, useCurrentQuote } from "@/lib/hooks";
import { api, errorMessage } from "@/lib/api";
import { DeliveryLocationButton } from "@/components/delivery-location-button";
import {
  money,
  rentalPrice,
  rentalTenure,
  rentalTenures,
  type Line,
} from "@/lib/types";
export default function CartPage() {
  const {
    cart,
    cartState,
    pin,
    cataloguePin,
    refreshCart,
    saveLines,
    session,
    notify,
    requestQuote,
  } = useStore();
  const [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const quoteRequest = useRef<AbortController | null>(null);
  const [warning, setWarning] = useState<{ pin: string; cart: typeof cart; message: string } | null>(null);
  useEffect(() => {
    if (!cataloguePin || !cart?.lines.length) return;
    const controller = new AbortController();
    api<{ unavailable: string[]; message: string | null }>("serviceability/cart-availability", {
      method: "POST", body: JSON.stringify({ pincode: cataloguePin, lines: cart.lines }), signal: controller.signal,
    }).then(result => {
      const names = cart.products.filter(p => result.unavailable.includes(p.id)).map(p => p.name);
      if (!controller.signal.aborted) setWarning({ pin: cataloguePin, cart, message: [result.message, names.join(", ")].filter(Boolean).join(" ") });
    }).catch(() => {
      if (!controller.signal.aborted) setWarning({ pin: cataloguePin, cart, message: "Availability could not be checked for this PIN." });
    });
    return () => controller.abort();
  }, [cart, cataloguePin]);
  const validQuote = useCurrentQuote(cart, session, pin);
  const products = new Map(
    cart?.products?.map((product) => [product.id, product]),
  );
  useEffect(() => {
    return () => quoteRequest.current?.abort();
  }, []);
  async function change(
    index: number,
    update: Partial<Pick<Line, "quantity" | "tenure">>,
  ) {
    if (!cart) return;
    setBusy(true);
    setError("");
    try {
      await saveLines(
        cart.lines.flatMap((line, i) =>
          i !== index
            ? [line]
            : update.quantity === 0
              ? []
              : [{ ...line, ...update }],
        ),
      );
      notify("Cart updated. Request a fresh quote.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function submitQuote(event: React.FormEvent) {
    event.preventDefault();
    if (!cart || quoteRequest.current) return;
    const controller = new AbortController();
    quoteRequest.current = controller;
    setBusy(true);
    setError("");
    storeQuote(null);
    try {
      await requestQuote(input || pin, controller.signal);
    } catch (e) {
      if (!controller.signal.aborted) setError(errorMessage(e));
    } finally {
      quoteRequest.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className="section-wrap page-space">
      <div className="page-heading">
        <p className="eyebrow">A LITTLE CLOSER TO HOME</p>
        <h1>Your space, taking shape.</h1>
      </div>
      <div className="demo-callout">
        Local demo · Prices, availability and taxes are synthetic. No real
        reservation or payment is made.
      </div>
      {cartState.status === "loading" ? (
        <div className="panel" role="status">
          Loading your cart…
        </div>
      ) : cartState.status === "error" ? (
        <div className="panel">
          <p role="alert">{cartState.message}</p>
          <Button variant="outline" onClick={() => void refreshCart()}>
            Retry cart
          </Button>
        </div>
      ) : !cart?.lines.length ? (
        <div className="panel text-center">
          <ShoppingBag className="mx-auto mb-4" size={38} />
          <h2>A little room for inspiration.</h2>
          <p>Your cart is empty. Find a piece that feels like you.</p>
          <Button asChild className="mt-4">
            <Link href="/noida/rent">Explore the collection</Link>
          </Button>
        </div>
      ) : (
        <div className="two-column">
          <div className="panel cart-lines">
            {warning && warning.cart === cart && warning.pin === cataloguePin && warning.message && (
              <div className="notice" role="status">{warning.message} Your items are saved. <DeliveryLocationButton /></div>
            )}
            {cart.lines.map((line, index) => {
              const product = products.get(line.productId);
              return (
                <article className="cart-line" key={line.productId + line.mode}>
                  <div className="cart-photo">
                    {product?.image ? (
                      <Image src={product.image} alt="" fill sizes="100px" />
                    ) : null}
                  </div>
                  <div>
                    <h3>
                      {product ? (
                        <Link
                          href={
                            "/noida/product/" +
                            product.slug +
                            "?mode=" +
                            line.mode +
                            (line.mode === "rent"
                              ? "&tenure=" + line.tenure
                              : "")
                          }
                        >
                          {product.name}
                        </Link>
                      ) : (
                        line.productId.replaceAll("-", " ")
                      )}
                    </h3>
                    <p>
                      {line.mode === "rent"
                        ? "Rent · " + line.tenure + " months"
                        : "Purchase"}{" "}
                      · {line.variantId}
                    </p>
                    {product ? (
                      <p>
                        {money(
                          line.mode === "rent"
                            ? product.id.startsWith("pilot-")
                              ? product.monthlyPaise
                              : rentalPrice(product, line.tenure)
                            : product.purchasePaise,
                        )}{" "}
                        {line.mode === "rent" ? " / month" : ""} · indicative
                      </p>
                    ) : (
                      <p>Listing unavailable. Remove it or try again.</p>
                    )}
                    {line.mode === "rent" ? (
                      <div className="cart-tenure">
                        <label htmlFor={`cart-tenure-${index}`}>
                          Rental tenure
                        </label>
                        <select
                          id={`cart-tenure-${index}`}
                          value={line.tenure}
                          disabled={busy}
                          onChange={(event) =>
                            void change(index, {
                              tenure: rentalTenure(event.target.value),
                            })
                          }
                        >
                          {rentalTenures.map((months) => (
                            <option value={months} key={months}>
                              {months} months
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    <button
                      className="remove-button"
                      disabled={busy}
                      onClick={() => change(index, { quantity: 0 })}
                    >
                      Remove item
                    </button>
                  </div>
                  <div className="quantity-block">
                    <div className="quantity">
                      <button
                        aria-label={"Decrease " + line.productId + " quantity"}
                        disabled={busy}
                        onClick={() =>
                          change(index, { quantity: line.quantity - 1 })
                        }
                      >
                        <Minus size={14} />
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        aria-label={"Increase " + line.productId + " quantity"}
                        disabled={busy || line.quantity >= 10}
                        onClick={() =>
                          change(index, { quantity: line.quantity + 1 })
                        }
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            <Link className="text-link inline-block mt-6" href="/noida/rent">
              Keep exploring
            </Link>
            {!session ? (
              <div className="mt-8">
                <IdentityPicker customersOnly />
              </div>
            ) : null}
          </div>
          <aside className="panel sticky-summary">
            <h2>The complete picture.</h2>
            <form onSubmit={submitQuote}>
              <label htmlFor="cart-pin">Delivery PIN</label>
              <input
                id="cart-pin"
                placeholder={pin || "Try 201304"}
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={input}
                disabled={busy}
                onChange={(e) => {
                  setInput(e.target.value);
                  storeQuote(null);
                }}
                required={!pin}
              />
              <Button className="quote-button" disabled={busy}>
                {busy ? "Checking your cart…" : "Get a server quote"}
              </Button>
            </form>
            {error ? (
              <p role="alert" className="notice error-notice mt-4">
                {error}
              </p>
            ) : null}
            {validQuote ? (
              <div className="mt-6">
                <PriceSummary breakdown={validQuote.breakdown} />
                <p className="small-note">
                  Quote expires at{" "}
                  {new Date(validQuote.expiresAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {session ? (
                  <Button asChild className="w-full mt-5">
                    <Link href="/checkout">Review demo checkout</Link>
                  </Button>
                ) : (
                  <p className="notice mt-4">
                    Select a demo identity, then request a new quote to
                    continue.
                  </p>
                )}
              </div>
            ) : (
              <p className="small-note">
                Your total will include demo delivery and tax. Quotes expire
                after 15 minutes and must be refreshed after cart changes.
              </p>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
