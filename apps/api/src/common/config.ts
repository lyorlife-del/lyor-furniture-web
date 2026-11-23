import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), "../../.env") });
config();
export function validateEnvironment() {
  if (
    process.env.DEMO_MODE !== "true" ||
    !["development", "test"].includes(process.env.NODE_ENV ?? "")
  )
    throw new Error(
      "This build permits local/test demo mode only. Production identity and external adapters are not enabled.",
    );
  if (!process.env.DATABASE_URL?.startsWith("postgresql://"))
    throw new Error("DATABASE_URL must be a PostgreSQL URL");
  if ((process.env.QUOTE_SECRET?.length ?? 0) < 32)
    throw new Error("QUOTE_SECRET must contain at least 32 characters");
}
