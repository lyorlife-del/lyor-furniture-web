"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@lyor/ui";
import { useStore } from "@/components/store-provider";
import { IdentityPicker } from "@/components/identity-picker";
import { PriceSummary } from "@/components/price-summary";
import { api, errorMessage } from "@/lib/api";
import { storeQuote, useCurrentQuote } from "@/lib/hooks";
import type { Order } from "@/lib/types";
export default function Checkout() {
  const { session, pin, cart, cartState, refreshCart } = useStore(),
    router = useRouter();
  const quote = useCurrentQuote(cart, session, pin);
  const items = new Map(cart?.products.map((product) => [product.id, product]));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), [session?.id, quote?.id]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quote || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    let key = sessionStorage.getItem("lyor-order-key-" + quote.id);
    if (!key) {
      key = crypto.randomUUID();
      sessionStorage.setItem("lyor-order-key-" + quote.id, key);
    }
    try {
      const order = await api<Order>("orders", {
        method: "POST",
        signal: controller.signal,
        headers: { "Idempotency-Key": key },
        body: JSON.stringify({
          quoteId: quote.id,
          signature: quote.signature,
          address: {
            name: String(form.get("name")),
            phone: String(form.get("phone")),
            street: String(form.get("street")),
            pin: String(form.get("pin")),
          },
          consent: form.get("consent") === "on",
        }),
      });
      if (controller.signal.aborted) return;
      storeQuote(null);
      router.push("/account/orders?order=" + order.id);
    } catch (e) {
      if (!controller.signal.aborted) setError(errorMessage(e));
    } finally {
      request.current = null;
      setBusy(false);
    }
  }
  return (
    <section className="section-wrap page-space">
      <div className="page-heading">
        <p className="eyebrow">YOUR NEXT CHAPTER</p>
        <h1>Let’s make it feel like home.</h1>
        <ol className="checkout-stages" aria-label="Checkout progress">
          <li>
            <Link href="/cart">01 Rental details</Link>
          </li>
          <li aria-current="step">02 Delivery details</li>
          <li>03 Demo order request</li>
        </ol>
      </div>
      <div className="demo-callout">
        Use fictional contact details only. This stores a local demo order
        request; it does not charge money or contact delivery services.
      </div>
      {!session ? (
        <IdentityPicker customersOnly />
      ) : cartState.status === "loading" ? (
        <div className="panel" role="status">
          Loading your checkout…
        </div>
      ) : cartState.status === "error" ? (
        <div className="panel">
          <p role="alert">{cartState.message}</p>
          <Button variant="outline" onClick={() => void refreshCart()}>
            Retry cart
          </Button>
        </div>
      ) : !quote ? (
        <div className="notice" role="alert">
          Your quote is missing, expired or belongs to a different demo
          identity.
          <Link href="/cart">Return to your cart for a fresh quote</Link>
        </div>
      ) : (
        <div className="two-column">
          <form className="panel" onSubmit={submit}>
            <h2>Delivery to Noida</h2>
            <label htmlFor="name">Name · fictional demo details</label>
            <input
              id="name"
              name="name"
              minLength={2}
              maxLength={80}
              placeholder="Demo customer"
              required
            />
            <label htmlFor="phone">Phone · fictional demo details</label>
            <input
              id="phone"
              name="phone"
              inputMode="tel"
              pattern="[6-9][0-9]{9}"
              maxLength={10}
              placeholder="10 digits"
              required
            />
            <label htmlFor="street">
              Delivery address · fictional demo details
            </label>
            <textarea
              id="street"
              name="street"
              minLength={8}
              maxLength={300}
              placeholder="Demo apartment, Demo Street, Noida"
              required
            />
            <label htmlFor="pin">PIN from your quote</label>
            <input id="pin" name="pin" value={quote.pin} readOnly />
            <label className="mt-6">
              <input type="checkbox" name="consent" required />
              <span>
                I understand this is a synthetic demo and accept the{" "}
                <Link href="/policies" className="text-link">
                  demo terms
                </Link>
                . No payment or real booking will be made.
              </span>
            </label>
            {error ? (
              <p className="notice error-notice" role="alert">
                {error}
                <Link href="/cart">Review cart and quote</Link>
              </p>
            ) : null}
            <Button variant="secondary" className="mt-5 w-full" disabled={busy}>
              {busy ? "Saving your request…" : "Submit demo order request"}
            </Button>
          </form>
          <aside className="panel sticky-summary">
            <h2>Rental summary</h2>
            <ul className="checkout-items">
              {quote.lines.map((line) => {
                const image = items.get(line.productId)?.image;
                return (
                  <li
                    className="checkout-item"
                    key={line.productId + line.mode}
                  >
                    <span className="cart-photo">
                      {image ? (
                        <Image src={image} alt="" fill sizes="56px" />
                      ) : null}
                    </span>
                    <span>
                      <strong>{line.name}</strong>
                      <span className="small-note">
                        {line.quantity} ×{" "}
                        {line.mode === "rent"
                          ? `${line.tenure} month rental`
                          : "purchase"}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6">
              <PriceSummary breakdown={quote.breakdown} />
            </div>
            <p className="small-note">
              Submission creates a pending request. The separate demo worker
              processes it; pending does not mean reserved or paid.
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
