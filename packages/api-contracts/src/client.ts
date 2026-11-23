import createClient from "openapi-fetch";
import type { paths } from "./schema";
export function createMarketplaceClient(baseUrl: string) {
  return createClient<paths>({ baseUrl });
}
