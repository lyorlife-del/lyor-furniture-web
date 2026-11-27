"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { storeQuote } from "@/lib/hooks";
import { browserStorage } from "@/lib/browser-storage";
import { useRouter } from "next/navigation";
import type { components } from "@lyor/api-contracts/fastapi";
import type { Cart, Line, Quote, Session } from "@/lib/types";

type CartState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; cart: Cart | null };

type Store = {
  cart: Cart | null;
  cartState: CartState;
  pin: string;
  deliveryCity: string;
  catalogueLocation: boolean;
  cataloguePin: string;
  setDeliveryLocation: (pin: string, city: string) => Promise<void>;
  session: Session;
  message: string;
  setPin: (pin: string) => void;
  saveLines: (lines: Line[]) => Promise<Cart>;
  refreshCart: () => Promise<void>;
  requestQuote: (pin: string, signal: AbortSignal) => Promise<Quote>;
  signIn: (identity: string) => Promise<void>;
  signOut: () => Promise<void>;
  notify: (message: string) => void;
};

const Context = createContext<Store | null>(null);
const storeStorage = browserStorage("localStorage");
const pinKey = "lyor-pin-v1";
const cityKey = "lyor-delivery-city-v1";
const guestCartKey = "lyor-cart-v1";
const authEventKey = "lyor-identity-change";
const cartKey = (session: Session) =>
  session ? guestCartKey + ":" + session.id : guestCartKey;

export function StoreProvider({
  children,
  initialSession,
  catalogueLocation = false,
  initialPreference = null,
}: {
  children: React.ReactNode;
  initialSession: Session;
  catalogueLocation?: boolean;
  initialPreference?: components["schemas"]["Preference"] | null;
}) {
  const initialPin = initialPreference?.selection?.pincode ?? "";
  const initialCity = initialPreference?.selection?.zone?.city ?? initialPreference?.selection?.geography?.city ?? "Noida";
  const router = useRouter();
  const locationRead = useRef<AbortController | null>(null);
  const eligibilityVersion = useRef(initialPreference?.selection ? [
    initialPreference.selection.configurationVersion, initialPreference.selection.reasonCode, initialCity,
  ].join("/") : "");
  const preferenceRevision = useRef<number | null>(initialPreference?.revision ?? null);
  const [cartState, setCartState] = useState<CartState>({ status: "loading" });
  const [pin, setPinState] = useState(initialPin);
  const [cataloguePin, setCataloguePin] = useState(initialPin);
  const [deliveryCity, setDeliveryCity] = useState(initialCity);
  const [session, setSession] = useState(initialSession);
  const [message, setMessage] = useState("");
  const current = useRef({
    session: initialSession,
    cart: null as Cart | null,
    pin: initialPin,
    locationVersion: 0,
    version: 0,
    ready: false,
  });
  const read = useRef<AbortController | null>(null);
  const mutation = useRef<AbortController | null>(null);
  const notify = useCallback((text: string) => setMessage(text), []);

  const applyPreference = useCallback((pref: components["schemas"]["Preference"]) => {
    const value = pref.selection?.pincode ?? "";
    const city = pref.selection?.zone?.city ?? pref.selection?.geography?.city ?? "Choose area";
    const eligibility = pref.selection ? [pref.selection.configurationVersion, pref.selection.reasonCode, city].join("/") : "";
    const changed = eligibility !== eligibilityVersion.current || (value !== "" && value !== current.current.pin) ||
      (preferenceRevision.current !== null && preferenceRevision.current !== pref.revision);
    eligibilityVersion.current = eligibility;
    preferenceRevision.current = pref.revision ?? 0;
    if (value || changed) {
      current.current.pin = value;
      setPinState(value);
    }
    setCataloguePin(value);
    setDeliveryCity(city);
    if (changed) {
      current.current.locationVersion++;
      storeQuote(null);
      router.refresh();
    }
  }, [router]);

  const syncPreference = useCallback(async () => {
    if (!catalogueLocation) return;
    locationRead.current?.abort();
    const controller = new AbortController();
    locationRead.current = controller;
    const load = async () => {
      const pref = await api<components["schemas"]["Preference"]>("location-preference", { signal: controller.signal });
      if (!controller.signal.aborted) applyPreference(pref);
    };
    try {
      if (navigator.locks) await navigator.locks.request("lyor-location-session", load);
      else await load();
    } catch {
      if (!controller.signal.aborted) {
        preferenceRevision.current = null;
        notify("Saved location is unavailable. Reopen the selector to retry.");
      }
    }
  }, [applyPreference, catalogueLocation, notify]);

  const updateCart = useCallback((state: CartState) => {
    current.current.ready = state.status === "ready";
    if (state.status === "ready") current.current.cart = state.cart;
    setCartState(state);
  }, []);

  const refreshCart = useCallback(async () => {
    read.current?.abort();
    const controller = new AbortController();
    read.current = controller;
    const { session, version } = current.current;
    const key = cartKey(session);
    const source = storeStorage.getItem(key) || !session ? key : guestCartKey;
    const id = storeStorage.getItem(source);
    const active = () =>
      !controller.signal.aborted && current.current.version === version;
    if (!id) {
      updateCart({ status: "ready", cart: null });
      return;
    }
    updateCart({ status: "loading" });
    try {
      const value = await api<Cart>("cart/" + encodeURIComponent(id), {
        signal: controller.signal,
      });
      if (active()) {
        if (
          session &&
          source === guestCartKey &&
          value.ownerId === session.id
        ) {
          storeStorage.setItem(key, value.id);
          if (storeStorage.getItem(source) === id)
            storeStorage.removeItem(source);
        }
        updateCart({ status: "ready", cart: value });
      }
    } catch (error) {
      if (!active()) return;
      if (error instanceof ApiError && [400, 404].includes(error.status)) {
        if (storeStorage.getItem(source) === id)
          storeStorage.removeItem(source);
        storeQuote(null);
        updateCart({ status: "ready", cart: null });
      } else {
        updateCart({ status: "error", message: errorMessage(error) });
      }
    }
  }, [updateCart]);

  const replaceIdentity = useCallback(
    (next: Session) => {
      const state = current.current;
      read.current?.abort();
      state.version++;
      state.session = next;
      if (catalogueLocation) {
        preferenceRevision.current = null;
        state.pin = "";
        setPinState("");
        setCataloguePin("");
        setDeliveryCity("Choose area");
        router.refresh();
        void syncPreference();
      }
      state.cart = null;
      storeQuote(null);
      setSession(next);
      void refreshCart();
    },
    [refreshCart, catalogueLocation, router, syncPreference],
  );

  useEffect(() => {
    const lifecycle = new AbortController();
    queueMicrotask(() => {
      if (lifecycle.signal.aborted) return;
      if (catalogueLocation) {
        if (!current.current.pin) {
          const previousPin = storeStorage.getItem(pinKey) ?? "";
          current.current.pin = previousPin;
          setPinState(previousPin);
        }
        void syncPreference();
      }
      else {
        const value = storeStorage.getItem(pinKey) ?? "";
        current.current.pin = value;
        setPinState(value);
        setDeliveryCity(storeStorage.getItem(cityKey) || "Noida");
      }
      void refreshCart();
    });
    async function syncSession() {
      if (mutation.current) return;
      const version = current.current.version;
      try {
        const next = await api<Session>("session", {
          signal: lifecycle.signal,
        });
        if (
          !lifecycle.signal.aborted &&
          !mutation.current &&
          current.current.version === version &&
          next?.id !== current.current.session?.id
        ) {
          replaceIdentity(next);
        }
      } catch {
        // Keep the last confirmed session while the service is unreachable.
      }
    }
    function syncStorage(event: StorageEvent) {
      if (event.key === authEventKey) void syncSession();
      if (event.key === "lyor-location-change") void syncPreference();
    }
    window.addEventListener("focus", syncSession);
    window.addEventListener("focus", syncPreference);
    window.addEventListener("storage", syncStorage);
    return () => {
      lifecycle.abort();
      locationRead.current?.abort();
      read.current?.abort();
      mutation.current?.abort();
      window.removeEventListener("focus", syncSession);
      window.removeEventListener("focus", syncPreference);
      window.removeEventListener("storage", syncStorage);
    };
  }, [refreshCart, replaceIdentity, syncPreference, catalogueLocation]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 5500);
    return () => clearTimeout(timer);
  }, [message]);

  function setPin(value: string) {
    if (current.current.pin === value) return;
    storeStorage.setItem(pinKey, value);
    current.current.pin = value;
    setPinState(value);
    storeStorage.removeItem(cityKey);
    setDeliveryCity("Noida");
    storeQuote(null);
  }

  async function setDeliveryLocation(value: string, city: string) {
    if (catalogueLocation) {
      if (preferenceRevision.current === null) await syncPreference();
      if (preferenceRevision.current === null) throw new Error("Your saved location could not be checked. Try again.");
      const version = current.current.version;
      try {
        const pref = await api<components["schemas"]["Preference"]>("location-preference", {
          method: "PUT", body: JSON.stringify({ pincode: value, expectedRevision: preferenceRevision.current }),
        });
        if (version !== current.current.version) throw new Error("Your session changed. Check the location again.");
        locationRead.current?.abort();
        applyPreference(pref);
        storeStorage.setItem("lyor-location-change", crypto.randomUUID());
      } catch (error) {
        await syncPreference();
        throw error;
      }
      return;
    }
    setPin(value);
    storeStorage.setItem(cityKey, city);
    setDeliveryCity(city);
    storeQuote(null);
  }

  function beginMutation() {
    if (mutation.current)
      throw new Error("Please wait for the current update to finish.");
    const controller = new AbortController();
    mutation.current = controller;
    return controller;
  }

  async function saveLines(lines: Line[]) {
    const state = current.current;
    if (!state.ready)
      throw new Error("Wait for your cart to load before updating it.");
    const controller = beginMutation();
    read.current?.abort();
    const { cart, session, version } = state;
    try {
      const updated = await api<Cart>("cart", {
        method: "PUT",
        signal: controller.signal,
        body: JSON.stringify({
          cartId: cart?.id ?? crypto.randomUUID(),
          city: cart?.city ?? "noida",
          revision: cart?.revision ?? 0,
          lines,
        }),
      });
      controller.signal.throwIfAborted();
      if (state.version !== version)
        throw new Error("Your demo identity changed. Try again.");
      const key = cartKey(session);
      storeStorage.setItem(key, updated.id);
      if (session && storeStorage.getItem(guestCartKey) === updated.id)
        storeStorage.removeItem(guestCartKey);
      storeQuote(null);
      updateCart({ status: "ready", cart: updated });
      return updated;
    } catch (error) {
      if (
        !controller.signal.aborted &&
        state.version === version &&
        error instanceof ApiError &&
        [404, 409].includes(error.status)
      ) {
        storeQuote(null);
        await refreshCart();
      }
      throw error;
    } finally {
      if (mutation.current === controller) mutation.current = null;
    }
  }

  async function requestQuote(value: string, signal: AbortSignal) {
    const state = current.current;
    const { cart, session, version, locationVersion, pin: previousPin } = state;
    if (cataloguePin && cataloguePin !== value)
      throw new Error("Confirm the new delivery PIN in the location selector before requesting a quote.");
    if (!state.ready || !cart?.lines.length)
      throw new Error("Add a piece to request a quote.");
    const quotedCart =
      session && !cart.ownerId ? await saveLines(cart.lines) : cart;
    signal.throwIfAborted();
    const quote = await api<Quote>("quotes", {
      method: "POST",
      signal,
      body: JSON.stringify({ cartId: quotedCart.id, pin: value }),
    });
    signal.throwIfAborted();
    if (
      state.version !== version ||
      state.locationVersion !== locationVersion ||
      state.cart?.id !== quotedCart.id ||
      state.cart.revision !== quotedCart.revision ||
      state.pin !== previousPin
    ) {
      throw new Error(
        "Your cart or delivery PIN changed. Request a fresh quote.",
      );
    }
    if (!cataloguePin) setPin(value);
    storeQuote(quote);
    return quote;
  }

  async function changeSession(identity?: string) {
    const controller = beginMutation();
    try {
      const next = identity
        ? await api<Session>("session", {
            method: "POST",
            signal: controller.signal,
            body: JSON.stringify({ identity }),
          })
        : await api("session", {
            method: "DELETE",
            signal: controller.signal,
          }).then(() => null);
      controller.signal.throwIfAborted();
      replaceIdentity(next);
      storeStorage.setItem(authEventKey, crypto.randomUUID());
      if (next) notify("Local demo identity selected");
    } finally {
      if (mutation.current === controller) mutation.current = null;
    }
  }

  return (
    <Context.Provider
      value={{
        cart: cartState.status === "ready" ? cartState.cart : null,
        cartState,
        pin,
        deliveryCity,
        catalogueLocation,
        cataloguePin,
        setDeliveryLocation,
        session,
        message,
        setPin,
        saveLines,
        refreshCart,
        requestQuote,
        signIn: changeSession,
        signOut: () => changeSession(),
        notify,
      }}
    >
      {children}
      <div className="toast" role="status" aria-live="polite">
        {message}
      </div>
    </Context.Provider>
  );
}

export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error("StoreProvider is required");
  return store;
}
