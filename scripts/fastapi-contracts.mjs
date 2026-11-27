import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const python = resolve(
  "apps/api/.venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
execFileSync(python, ["-m", "app.core.export_openapi"], {
  cwd: resolve("apps/api"),
  stdio: "inherit",
  windowsHide: true,
});
execFileSync(
  process.execPath,
  [
    resolve("node_modules/openapi-typescript/bin/cli.js"),
    "packages/api-contracts/fastapi-openapi.json",
    "-o",
    "packages/api-contracts/src/fastapi-schema.d.ts",
  ],
  { stdio: "inherit", windowsHide: true },
);
