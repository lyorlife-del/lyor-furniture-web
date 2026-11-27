import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { demoCookie, demoIdentity } from "./demo-session";
import { serverApi } from "./api";
import type { components } from "@lyor/api-contracts/fastapi";

export const locationCatalogueEnabled = () =>
  process.env.LOCATION_SERVICEABILITY_ENABLED === "true" && process.env.LOCATION_CATALOGUE_ENABLED === "true";

export const readCatalogPreference = cache(async () => {
  if (!locationCatalogueEnabled()) return null;
  const jar = await cookies();
  const identity = jar.get(demoCookie)?.value;
  const guest = jar.get("lyor-location-guest")?.value;
  const headers: Record<string, string> = {};
  if (demoIdentity(identity)) headers.authorization = "Bearer " + identity;
  else if (guest) headers.cookie = "lyor-location-guest=" + encodeURIComponent(guest);
  else return null;
  return serverApi<components["schemas"]["Preference"]>("location-preference", headers);
});

export async function readCatalogLocation() {
  return (await readCatalogPreference())?.selection ?? null;
}

export async function catalogPath(path: string) {
  const selection = await readCatalogLocation();
  if (!selection) return path;
  if (path === "bundles") path = "catalog?category=bundles";
  return path + (path.includes("?") ? "&" : "?") + "deliveryPin=" + encodeURIComponent(selection.pincode);
}

export async function validCatalogueCity(city: string) {
  if (city === "noida") return true;
  if (!locationCatalogueEnabled()) return false;
  const cities = await serverApi<{ id: string }[]>("serviceability/cities");
  return cities.some(candidate => candidate.id === city);
}
