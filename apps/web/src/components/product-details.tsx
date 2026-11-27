"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ShoppingBag, CheckCircle2 } from "lucide-react";
import { Button } from "@lyor/ui";
import { money, rentalPrice, type Product } from "@/lib/types";
import { errorMessage } from "@/lib/api";
import { useStore } from "./store-provider";
import { WishlistButton } from "./wishlist";
import { DeliveryLocationButton } from "./delivery-location-button";
export function ProductDetails({
  product,
  initialMode,
  initialTenure = 6,
  selectedPin = "",
}: {
  product: Product;
  initialMode: "rent" | "buy";
  initialTenure?: 3 | 6 | 12;
  selectedPin?: string;
}) {
  const { cart, cartState, saveLines, notify, refreshCart, catalogueLocation, cataloguePin } = useStore();
  const refreshing = catalogueLocation && cataloguePin !== selectedPin;
  const pilot = product.id.startsWith("pilot-");
  const canBuy = product.purchasePaise > 0;
  const photos = [
    ...new Set([product.image, ...product.images].filter(Boolean)),
  ];
  const [photoIndex, setPhotoIndex] = useState(0);
  const photo = photos[photoIndex];
  const [mode, setMode] = useState(canBuy ? initialMode : "rent"),
    [tenure, setTenure] = useState(initialTenure),
    [quantity, setQuantity] = useState(1),
    [variant, setVariant] = useState(product.variants[0]?.id ?? "standard"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function add() {
    setBusy(true);
    setError("");
    try {
      const lines = [...(cart?.lines ?? [])],
        index = lines.findIndex(
          (line) => line.productId === product.id && line.mode === mode,
        );
      const line = {
        productId: product.id,
        mode,
        quantity,
        variantId: variant,
        tenure,
      };
      if (index >= 0) {
        lines[index] = {
          ...line,
          quantity: Math.min(10, lines[index].quantity + quantity),
        };
      } else lines.push(line);
      await saveLines(lines);
      notify(product.name + " added to your cart");
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="section-wrap page-space">
      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href={"/noida/" + mode}>{mode === "rent" ? "Rent" : "Buy"}</Link>
        <span>/</span>
        <span>{product.name}</span>
      </div>
      <div className="product-detail">
        <div>
          <div className="detail-photo">
            {photo ? (
              <Image
                src={photo}
                alt={product.name}
                fill
                priority
                sizes="(max-width:800px) 100vw,55vw"
              />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-sm text-neutral-600">
                Photo pending
              </span>
            )}
          </div>
          {photos.length > 1 ? (
            <div
              className="detail-thumbs"
              role="group"
              aria-label="Product photos"
            >
              {photos.map((image, index) => (
                <button
                  type="button"
                  key={image}
                  aria-pressed={index === photoIndex}
                  aria-label={`Show product photo ${index + 1}`}
                  onClick={() => setPhotoIndex(index)}
                >
                  <Image src={image} alt="" fill sizes="76px" />
                </button>
              ))}
            </div>
          ) : null}
          {photo ? (
            <p className="small-note">
              Reference photography · Product details are synthetic demo data
            </p>
          ) : null}
          <div className="detail-editorial-note">
            <h2>Make room for your everyday.</h2>
            <p>
              Choose your finish and rental term, then check your delivery area
              before requesting a quote.
            </p>
          </div>
        </div>
        <div className="detail-content">
          <p className="eyebrow">
            {product.category === "bundles"
              ? "THE COMPLETE ROOM"
              : "THE EVERYDAY COLLECTION"}
          </p>
          <h1>{product.name}</h1>
          <p className="description">{product.description}</p>
          <p className="stock-label">
            {refreshing ? "Checking availability for your PIN…" : selectedPin ? (
              product.available ? "Available in the demo catalogue for " + selectedPin : "Unavailable for PIN " + selectedPin
            ) : product.available
              ? "Available in the demo catalog"
              : pilot
                ? "Availability pending"
                : "Currently unavailable"}
          </p>
          {canBuy ? (
            <div
              className="mode-switch"
              role="group"
              aria-label="Transaction mode"
            >
              <button
                className={mode === "rent" ? "active" : ""}
                aria-pressed={mode === "rent"}
                onClick={() => setMode("rent")}
              >
                Rent this piece
              </button>
              <button
                className={mode === "buy" ? "active" : ""}
                aria-pressed={mode === "buy"}
                onClick={() => setMode("buy")}
              >
                Make it yours
              </button>
            </div>
          ) : null}
          <div className="detail-price-card">
            <p className="detail-price">
              {money(
                mode === "rent"
                  ? pilot
                    ? product.monthlyPaise
                    : rentalPrice({ monthlyPaise: product.monthlyPaise + (product.variants.find(v => v.id === variant)?.monthlyDeltaPaise ?? 0) }, tenure)
                  : product.purchasePaise,
              )}
              {mode === "rent" ? <small> / month</small> : null}
            </p>
          </div>
          {mode === "rent" ? (
            <div className="detail-deposit">
              <span>Indicative refundable deposit</span>
              <strong>{money(product.depositPaise)}</strong>
            </div>
          ) : null}
          <p className="product-meta">
            {pilot
              ? "Pilot monthly rate before GST and logistics."
              : "Indicative demo price. Final charges come from a server quote in your cart."}
          </p>
          {pilot && !product.available ? (
            <p className="notice mt-4">
              Rental availability is pending.{" "}
              <Link href="/business" className="text-link">
                Send an enquiry
              </Link>
            </p>
          ) : (
            <>
              <div className="field-row">
                <div>
                  <label htmlFor="variant">Finish / variant</label>
                  <select
                    id="variant"
                    value={variant}
                    onChange={(e) => setVariant(e.target.value)}
                  >
                    {product.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="quantity">Quantity</label>
                  <select
                    id="quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
              {mode === "rent" ? (
                <>
                  <label htmlFor="tenure">Rental plan</label>
                  <select
                    id="tenure"
                    value={tenure}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (value === 3 || value === 6 || value === 12)
                        setTenure(value);
                    }}
                  >
                    <option value={3}>3 months · a little flexibility</option>
                    <option value={6}>6 months · settle in</option>
                    <option value={12}>12 months · stay a while</option>
                  </select>
                </>
              ) : null}
              <div className="detail-location">
                <span>Check delivery availability</span>
                <DeliveryLocationButton className="catalog-delivery" />
              </div>
              <div className="detail-actions">
                <Button
                  className="w-full"
                  disabled={
                    busy || refreshing || !product.available || cartState.status !== "ready"
                  }
                  onClick={add}
                >
                  <ShoppingBag size={18} />
                  {busy
                    ? "Adding…"
                    : !product.available
                      ? "Currently unavailable"
                      : cartState.status === "loading"
                        ? "Loading cart…"
                        : "Add to your space"}
                </Button>
                <WishlistButton
                  href={`/noida/product/${product.slug}?mode=${mode}`}
                  name={product.name}
                />
              </div>
              {product.available && cartState.status === "error" ? (
                <div className="mt-4">
                  <p role="alert">{cartState.message}</p>
                  <Button variant="outline" onClick={() => void refreshCart()}>
                    Retry cart
                  </Button>
                </div>
              ) : null}
              {error ? (
                <p role="alert" className="notice error-notice mt-4">
                  {error}
                </p>
              ) : null}
              <Link href="/cart" className="small-note text-link">
                View your cart and request a quote
              </Link>
              <p className="small-note">
                <CheckCircle2 size={16} /> Demo only · no payment collected
              </p>
              <div className="detail-specs">
                {product.components.length ? (
                  <details open>
                    <summary>What’s included</summary>
                    <ul>
                      {product.components.map((part) => (
                        <li key={part.productId}>
                          <Link
                            href={"/noida/product/" + part.productId}
                            className="text-link"
                          >
                            {part.productId.replaceAll("-", " ")} ×{" "}
                            {part.quantity}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <p>
                      Every required piece must be available before this bundle
                      can be quoted.
                    </p>
                  </details>
                ) : null}
                <details open>
                  <summary>Details & dimensions</summary>
                  <dl>
                    <dt>Material</dt>
                    <dd>{product.material || "Pending"}</dd>
                    <dt>Dimensions</dt>
                    <dd>{product.dimensions || "Pending"}</dd>
                    <dt>Finish</dt>
                    <dd>{product.color || "Pending"}</dd>
                  </dl>
                </details>
                <details>
                  <summary>Delivery, care & returns</summary>
                  <p>
                    Demo delivery eligibility and fees are checked at quotation.
                    Real delivery, maintenance, return and cancellation policies
                    are not enabled.
                  </p>
                  <Link href="/policies" className="text-link">
                    Read the demo policy
                  </Link>
                </details>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
