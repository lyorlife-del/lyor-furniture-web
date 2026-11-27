"use client";
import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@lyor/ui";
import { IdentityPicker } from "@/components/identity-picker";
import { useStore } from "@/components/store-provider";
import { api, errorMessage } from "@/lib/api";
import { money, type Order } from "@/lib/types";
export default function Orders({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { session } = useStore();
  const selectedOrder = use(searchParams).order;
  return (
    <section className="section-wrap page-space">
      <div className="page-heading">
        <p className="eyebrow">YOUR LYOR SPACE</p>
        <h1>Every next chapter, in one place.</h1>
        <p className="muted">
          Local demo requests and their separate status tracks.
        </p>
      </div>
      <IdentityPicker />
      {session ? (
        <OrderHistory
          key={session.id}
          ownerId={session.id}
          selectedOrder={selectedOrder}
        />
      ) : null}
    </section>
  );
}

function OrderHistory({
  ownerId,
  selectedOrder,
}: {
  ownerId: string;
  selectedOrder?: string;
}) {
  const [orders, setOrders] = useState<Order[] | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true);
  const request = useRef<AbortController | null>(null);
  const history = orders?.filter((order) => order.ownerId === ownerId);
  const receipt = history?.find((order) => order.id === selectedOrder);
  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    try {
      const data = await api<Order[]>("me/orders", {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) setOrders(data);
    } catch (e) {
      if (!controller.signal.aborted) setError(errorMessage(e));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }, []);
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) void load();
    });
    return () => {
      mounted = false;
      request.current?.abort();
    };
  }, [load]);
  return (
    <div className="mt-8" aria-busy={busy}>
      {receipt ? (
        <div className="notice" role="status">
          <strong>Demo request received</strong>
          <p>
            Reference {receipt.id}. See the latest order, stock, payment and
            delivery statuses below.
          </p>
        </div>
      ) : null}
      {history && !error ? (
        <section
          className="dashboard-overview"
          aria-labelledby="account-overview"
        >
          <p className="eyebrow">Your account</p>
          <h2 id="account-overview">Rental dashboard</h2>
          <dl className="dashboard-metrics">
            <div>
              <dt>Rental requests</dt>
              <dd>
                {
                  history.filter((order) =>
                    order.lines.some((line) => line.mode === "rent"),
                  ).length
                }
              </dd>
            </div>
            <div>
              <dt>Requests pending</dt>
              <dd>
                {
                  history.filter((order) => order.orderState === "pending")
                    .length
                }
              </dd>
            </div>
            <div>
              <dt>Payments</dt>
              <dd>Demo · no charges</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/noida/rent">Browse rentals</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/cart">View cart</Link>
            </Button>
          </div>
        </section>
      ) : null}
      <div className="section-heading">
        <h2>Your demo orders.</h2>
        <Button variant="outline" disabled={busy} onClick={() => void load()}>
          {busy ? "Refreshing…" : error ? "Retry orders" : "Refresh status"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="notice error-notice">
          {error}
        </p>
      ) : null}
      {busy && !orders ? (
        <p role="status" className="notice">
          Loading your demo orders…
        </p>
      ) : null}
      {history?.length === 0 && !error ? (
        <div className="notice">
          No demo orders for this identity yet. Explore a piece, request a
          quote, and try checkout.
        </div>
      ) : null}
      {history?.map((order) => (
        <article
          className={
            order.id === receipt?.id
              ? "order-card order-highlight"
              : "order-card"
          }
          key={order.id}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3>Demo request {order.id.slice(0, 8).toUpperCase()}</h3>
            <span
              className="status-pill"
              data-tone={
                order.orderState === "failed"
                  ? "error"
                  : order.orderState === "pending"
                    ? "pending"
                    : "neutral"
              }
            >
              {order.orderState === "confirmed_demo"
                ? "Processed in demo"
                : order.orderState.replaceAll("_", " ")}
            </span>
          </div>
          {order.lines.map((line) => (
            <p className="small-note" key={line.productId + line.mode}>
              {line.name} × {line.quantity} · {line.mode}
            </p>
          ))}
          <div className="status-grid">
            {[
              ["Order", order.orderState],
              ["Payment", order.paymentState],
              ["Stock", order.stockState],
              ["Delivery", order.deliveryState],
            ].map(([name, state]) => (
              <div key={name}>
                <small>{name}</small>
                <span>{state.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>
          <p>
            {money(order.breakdown.totalPaise)}{" "}
            <span className="small-note inline">· quoted demo total</span>
          </p>
          {order.externalId ? (
            <p className="small-note">
              Local mock ERP reference: {order.externalId}
            </p>
          ) : (
            <p className="small-note">
              Awaiting the separate demo worker. No external booking has
              occurred.
            </p>
          )}
          {order.failureReason ? (
            <p role="alert" className="notice error-notice">
              {order.failureReason}. Staff can inspect the integration
              exception.
            </p>
          ) : null}
          <p className="small-note">No money has been collected.</p>
        </article>
      ))}
    </div>
  );
}
