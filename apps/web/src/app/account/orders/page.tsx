"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@lyor/ui";
import { IdentityPicker } from "@/components/identity-picker";
import { useStore } from "@/components/store-provider";
import { api, errorMessage } from "@/lib/api";
import { money, type Order } from "@/lib/types";
export default function Orders() {
  const { session } = useStore();
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
      {session ? <OrderHistory key={session.id} ownerId={session.id} /> : null}
    </section>
  );
}

function OrderHistory({ ownerId }: { ownerId: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true);
  const request = useRef<AbortController | null>(null);
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
      {orders &&
      !orders.some((order) => order.ownerId === ownerId) &&
      !error ? (
        <div className="notice">
          No demo orders for this identity yet. Explore a piece, request a
          quote, and try checkout.
        </div>
      ) : null}
      {orders
        ?.filter((order) => order.ownerId === ownerId)
        .map((order) => (
          <article className="order-card" key={order.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3>Demo request {order.id.slice(0, 8).toUpperCase()}</h3>
              <span className="status-pill">
                {order.orderState.replaceAll("_", " ")}
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
