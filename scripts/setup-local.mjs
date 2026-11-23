import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (!existsSync(".env"))
  writeFileSync(
    ".env",
    readFileSync(".env.example", "utf8").replace(
      "local-demo-change-before-sharing-at-least-32-characters",
      randomBytes(32).toString("hex"),
    ),
  );
if (!existsSync("apps/web/.env.local"))
  writeFileSync(
    "apps/web/.env.local",
    "DEMO_MODE=true\nAPI_URL=http://127.0.0.1:4000/api/v1\n",
  );
console.log(
  "Local demo configuration is ready. Existing environment files were preserved.",
);
