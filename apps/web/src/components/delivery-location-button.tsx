"use client";

import { useStore } from "./store-provider";

export function DeliveryLocationButton({ className }: { className?: string }) {
  const { pin: legacyPin, deliveryCity, catalogueLocation, cataloguePin } = useStore();
  const pin = catalogueLocation ? cataloguePin : legacyPin;
  return (
    <button
      type="button"
      className={className}
      onClick={() => document.getElementById("editorial-location")?.click()}
    >
      <span>
        {deliveryCity}
        {pin ? ` · ${pin}` : ""}
      </span>
      <span>Change</span>
    </button>
  );
}
