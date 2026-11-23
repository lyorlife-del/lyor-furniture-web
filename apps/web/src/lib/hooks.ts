"use client";
import { useMemo, useSyncExternalStore, useCallback } from "react";
import type { Cart, Quote, Session } from "./types";

const quoteKey = "lyor-quote-v1";
const quoteEvent = "lyor-quote-change";

export function storeQuote(quote: Quote | null) {
  if (quote) sessionStorage.setItem(quoteKey, JSON.stringify(quote));
  else sessionStorage.removeItem(quoteKey);
  window.dispatchEvent(new Event(quoteEvent));
}

function subscribeQuote(callback: () => void) {
  window.addEventListener(quoteEvent, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(quoteEvent, callback);
    window.removeEventListener("storage", callback);
  };
}

function snapshot() {
  return sessionStorage.getItem(quoteKey);
}

const serverQuote = () => null;

function useStoredQuote() {
  const raw = useSyncExternalStore(subscribeQuote, snapshot, serverQuote);
  return useMemo(() => {
    try {
      if (!raw) return null;
      const value = JSON.parse(raw);
      if (
        typeof value.id !== "string" ||
        typeof value.cartId !== "string" ||
        typeof value.signature !== "string" ||
        typeof value.pin !== "string" ||
        typeof value.cartRevision !== "number" ||
        !Number.isFinite(Date.parse(value.expiresAt)) ||
        !Array.isArray(value.lines) ||
        typeof value.breakdown?.totalPaise !== "number"
      )
        return null;
      return value as Quote;
    } catch {
      return null;
    }
  }, [raw]);
}

const serverExpired = () => true;

export function useCurrentQuote(
  cart: Cart | null,
  session: Session,
  pin: string,
) {
  const quote = useStoredQuote();
  const expires = quote ? Date.parse(quote.expiresAt) : 0;
  const subscribe = useCallback(
    (callback: () => void) => {
      if (!expires) return () => {};
      const raw = snapshot();
      const timer = setTimeout(
        () => {
          if (raw && raw === snapshot()) storeQuote(null);
          callback();
        },
        Math.max(0, expires - Date.now()),
      );
      return () => clearTimeout(timer);
    },
    [expires],
  );
  const expired = useSyncExternalStore(
    subscribe,
    () => Date.now() >= expires,
    serverExpired,
  );
  return !expired &&
    quote &&
    quote.cartId === cart?.id &&
    quote.cartRevision === cart.revision &&
    quote.ownerId === (session?.id ?? null) &&
    quote.pin === pin
    ? quote
    : null;
}
