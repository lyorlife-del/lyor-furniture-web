"use client";

import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@lyor/ui";
import { api, errorMessage } from "@/lib/api";
import type { components } from "@lyor/api-contracts/fastapi";
import { useStore } from "./store-provider";

type PinResult = components["schemas"]["PinCheckResponse"];

export function ManualLocationSelector({ currentLocation }: { currentLocation: boolean }) {
  const { pin: legacyPin, deliveryCity, setDeliveryLocation, notify, catalogueLocation, cataloguePin } = useStore();
  const pin = catalogueLocation ? cataloguePin : legacyPin;
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<PinResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [source, setSource] = useState<"mock" | "google" | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  function cancel() {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setDetecting(false);
    setSource(null);
  }
  function changeOpen(next: boolean) {
    if (saving) return;
    cancel();
    setResult(null);
    setError("");
    if (next) setInput(pin || legacyPin);
    setOpen(next);
  }
  async function check(event: React.FormEvent) {
    event.preventDefault();
    cancel();
    const value = input.trim();
    setResult(null);
    setError("");
    if (!/^[1-9][0-9]{5}$/.test(value)) {
      setError("Enter a valid six-digit Indian PIN code.");
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      const data = await api<PinResult>(
        "serviceability/pincode/" + encodeURIComponent(value),
        { signal: controller.signal },
      );
      if (!controller.signal.aborted && request.current === controller) {
        setInput(data.pincode);
        setResult(data);
      }
    } catch (cause) {
      if (!controller.signal.aborted && request.current === controller)
        setError(errorMessage(cause));
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }
  async function confirm() {
    if (!result?.deliverable || !result.zone || result.pincode !== input.trim())
      return;
    setSaving(true);
    try {
      await setDeliveryLocation(result.pincode, result.zone.city);
    } catch (cause) {
      setError(errorMessage(cause));
      setResult(null);
      return;
    } finally {
      setSaving(false);
    }
    notify(
      "Delivery PIN saved. Your cart is retained; request a fresh quote before checkout.",
    );
    changeOpen(false);
  }

  async function detect() {
    cancel();
    setResult(null);
    setError("");
    if (!window.isSecureContext || !navigator.geolocation) {
      setError("Current location is unavailable in this browser. Please enter your PIN manually.");
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setDetecting(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, maximumAge: 0, timeout: 8000,
        }),
      );
      if (controller.signal.aborted) return;
      const { latitude, longitude, accuracy } = position.coords;
      const data = await api<components["schemas"]["ResolvedLocation"]>("serviceability/resolve-location", {
        method: "POST", body: JSON.stringify({ latitude, longitude, accuracy }), signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setInput(data.serviceability.pincode);
      setSource(data.provider);
      setResult(data.serviceability);
    } catch (cause) {
      if (controller.signal.aborted) return;
      const deviceError = typeof cause === "object" && cause !== null && "code" in cause;
      const reason = deviceError
        ? ({ 1: "Location permission was denied.", 2: "Your device could not find its location.",
             3: "Your device timed out locating you." }[Number(cause.code)] ?? "Device location is unavailable.")
        : errorMessage(cause);
      setError(/manually/i.test(reason) ? reason : reason + " Please enter your PIN manually.");
    } finally {
      if (request.current === controller) {
        request.current = null;
        setDetecting(false);
      }
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild>
        <button id="editorial-location" className="editorial-location">
          <span>
            <small>Deliver to</small>
            <strong>{pin ? deliveryCity : "Choose area"}</strong>
            <span className="location-selected-pin">
              {pin ? ` · ${pin}` : " · Enter PIN"}
            </span>
          </span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title>Delivery location</Dialog.Title>
          <Dialog.Description>
            Enter your PIN code to check delivery, then confirm your selection.
          </Dialog.Description>
          <Dialog.Close
            className="dialog-close"
            aria-label="Close location selector"
          >
            <X size={20} />
          </Dialog.Close>
          <form onSubmit={check} noValidate aria-busy={busy}>
            <label htmlFor="delivery-pin">Delivery PIN</label>
            <input
              id="delivery-pin"
              disabled={saving}
              inputMode="numeric"
              autoComplete="postal-code"
              value={input}
              maxLength={12}
              aria-invalid={Boolean(error)}
              aria-describedby="pin-check-guidance"
              onChange={(event) => {
                cancel();
                setInput(event.target.value);
                setResult(null);
                setError("");
              }}
            />
            <Button disabled={busy || saving} className="mt-4 w-full">
              {busy ? "Checking delivery…" : "Check delivery"}
            </Button>
          </form>
          {currentLocation && (
            <div className="mt-4">
              <button type="button" className="text-link" disabled={detecting || saving} onClick={detect}>
                Use Current Location
              </button>
              <p className="small-note">
                Allow a one-time location check to suggest a PIN. Live lookups send your location to Google Maps.
              </p>
            </div>
          )}
          <div role="status" aria-live="polite" aria-atomic="true">
            {detecting && <p className="small-note">Finding your approximate PIN…</p>}
            {busy ? (
              <p className="small-note">Checking your PIN code…</p>
            ) : null}
            {result ? (
              <div className="notice mt-4">
                {source && <p>Approximate PIN {result.pincode}. Check or edit it before confirming.</p>}
                {source === "google" && <span translate="no" className="google-maps-attribution">Google Maps</span>}
                {source === "mock" && <p>Simulated location lookup</p>}
                {result.demo ? (
                  <p>
                    <strong>Demo result · synthetic postal data</strong>
                  </p>
                ) : null}
                <p>{result.message}</p>
                {result.geography ? (
                  <p>
                    {[
                      result.geography.city,
                      result.geography.state,
                      result.pincode,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          {error ? (
            <p className="notice error-notice mt-4" role="alert">
              {error}
            </p>
          ) : null}
          {result?.deliverable ? (
            <Button className="mt-4 w-full" onClick={confirm} disabled={saving}>
              {saving ? "Saving PIN…" : "Use this PIN"}
            </Button>
          ) : null}
          {result && !result.deliverable ? (
            <div className="mt-4 flex gap-4">
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  cancel();
                  setResult(null);
                  setError("");
                  document.getElementById("delivery-pin")?.focus();
                }}
              >
                Change PIN
              </button>
              <Link href="/business" onClick={() => changeOpen(false)}>
                Send an enquiry
              </Link>
            </div>
          ) : null}
          <p id="pin-check-guidance" className="small-note">
            Checking a PIN does not reserve stock or a delivery slot. {catalogueLocation
              ? "Your selection updates the catalogue. Checkout uses the Noida demo."
              : "The catalogue and checkout currently remain the Noida demo."}
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
