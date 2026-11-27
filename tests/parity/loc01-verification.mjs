// Creates isolated localhost databases and leaves evidence under ignored .data/loc01.
import EmbeddedPostgres from "embedded-postgres";
import { Client } from "pg";
import { connect } from "node:net";
import { resolve } from "node:path";
import {
  existsSync,
  mkdirSync,
  openSync,
  closeSync,
  cpSync,
  writeFileSync,
} from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const root = process.cwd(),
  apiDir = resolve("apps/api"),
  evidence = resolve(".data/loc01");
mkdirSync(evidence, { recursive: true });
const suffix = Date.now();
const names = Object.fromEntries(
  ["baseline", "restored", "fresh", "tests", "phase02", "web"].map((key) => [
    key,
    `lyor_test_loc01_${suffix}_${key}`,
  ]),
);
names.odoo = `lyor_test_odoo_loc01_${suffix}`;
const dsn = (key) =>
  `postgresql://lyor_test:local_test_only@127.0.0.1:5433/${names[key]}`;
const python = resolve(
  "apps/api/.venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
const secret = "isolated-location-verification-secret-32-characters";
const pyEnv = (key) => ({
  ...process.env,
  LYOR_ENVIRONMENT: "test",
  LYOR_DEMO_MODE: "true",
  LYOR_DATABASE_URL: dsn(key),
  LYOR_QUOTE_SECRET: secret,
  LYOR_SERVICEABILITY_MODE: "demo",
  LYOR_GEOCODING_PROVIDER: "mock",
  LYOR_GEOCODING_LIVE_ENABLED: "false",
  LYOR_SERVICEABILITY_COMPANY_ID: "lyor-demo",
});
const pg = new EmbeddedPostgres({
  databaseDir: resolve(".data/test-postgres"),
  user: "lyor_test",
  password: "local_test_only",
  port: 5433,
  persistent: true,
  autoRehydrateSymlinks: true,
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: console.error,
});
const children = [],
  files = [];
const locationOnly = process.argv.includes("--location-only");
const backendOnly = process.argv.includes("--backend-only");
let started = false,
  admin;
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    env: pyEnv("tests"),
    cwd: apiDir,
    stdio: "inherit",
    windowsHide: true,
    ...options,
  });
  if (result.status !== 0)
    throw new Error(
      `Verification command failed (${result.status}): ${args.join(" ")}`,
    );
}
function launch(label, command, args, options) {
  const fd = openSync(resolve(evidence, label + ".log"), "w");
  files.push(fd);
  const child = spawn(command, args, {
    windowsHide: true,
    stdio: ["ignore", fd, fd],
    ...options,
  });
  children.push(child);
  child.on("error", (error) => console.error(label, error.message));
  return child;
}
async function ready(child, url) {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null)
      throw new Error("Preview exited; inspect ignored logs");
    if (
      (
        await fetch(url, { signal: AbortSignal.timeout(2000) }).catch(
          () => null,
        )
      )?.ok
    )
      return;
    await sleep(400);
  }
  throw new Error("Readiness timeout: " + url);
}
function available(port) {
  return new Promise((resolve) => {
    const socket = connect({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(true);
    });
  });
}
async function preview(enabled, port) {
  const directory = resolve(
    evidence,
    enabled ? "web-location" : "web-baseline",
  );
  mkdirSync(directory, { recursive: true });
  for (const entry of [
    "src",
    "public",
    "package.json",
    "tsconfig.json",
    "next.config.ts",
    "postcss.config.mjs",
  ])
    cpSync(resolve("apps/web", entry), resolve(directory, entry), {
      recursive: true,
    });
  const env = {
    ...process.env,
    NODE_ENV: "development",
    DEMO_MODE: "true",
    API_URL: "http://127.0.0.1:4161/api/v1",
    WEB_ORIGIN: `http://127.0.0.1:${port}`,
    LOCATION_SERVICEABILITY_ENABLED: String(enabled),
    LOCATION_DETECTION_ENABLED: String(enabled),
    LOCATION_CATALOGUE_ENABLED: String(enabled),
    NEXT_TELEMETRY_DISABLED: "1",
  };
  const child = launch(
    enabled ? "web-location" : "web-baseline",
    process.execPath,
    [
      resolve("node_modules/next/dist/bin/next"),
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    { cwd: directory, env },
  );
  await ready(child, `http://127.0.0.1:${port}`);
  return child;
}
function stop(child) {
  if (child.exitCode !== null) return;
  if (process.platform === "win32")
    spawnSync("taskkill.exe", ["/F", "/T", "/PID", String(child.pid)], {
      windowsHide: true,
      stdio: "ignore",
    });
  else child.kill("SIGTERM");
}
try {
  for (const port of [5433, 4161, 3161, 3162])
    if (!(await available(port)))
      throw new Error(
        `Port ${port} is already in use; existing processes were left unchanged`,
      );
  if (!existsSync(resolve(".data/test-postgres/PG_VERSION")))
    await pg.initialise();
  await pg.start();
  started = true;
  admin = new Client({
    connectionString:
      "postgresql://lyor_test:local_test_only@127.0.0.1:5433/postgres",
  });
  await admin.connect();
  for (const name of Object.values(names))
    if (!/^lyor_test_[a-z0-9_]+$/.test(name))
      throw new Error("Unsafe test name");
  await pg.createDatabase(names.baseline);
  run(
    process.execPath,
    [
      resolve("node_modules/prisma/build/index.js"),
      "migrate",
      "deploy",
      "--schema",
      "apps/api/prisma/schema.prisma",
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        DATABASE_URL: dsn("baseline") + "?schema=public",
        NODE_ENV: "test",
        DEMO_MODE: "true",
      },
    },
  );
  for (const action of ["seed-demo", "import-pilot"])
    run(python, ["-m", "app.db.fixtures", action], { env: pyEnv("baseline") });
  for (const key of ["restored", "tests", "phase02", "web"]) {
    await admin.query(
      `CREATE DATABASE "${names[key]}" TEMPLATE "${names.baseline}"`,
    );
    run(python, ["-m", "alembic", "stamp", "0001_legacy"], { env: pyEnv(key) });
    run(python, ["-m", "alembic", "upgrade", "head"], { env: pyEnv(key) });
  }
  for (const key of ["fresh", "odoo"]) {
    await pg.createDatabase(names[key]);
    run(python, ["-m", "alembic", "upgrade", "head"], { env: pyEnv(key) });
  }
  run(python, ["-m", "alembic", "downgrade", "0001_legacy"], {
    env: pyEnv("fresh"),
  });
  run(python, ["-m", "alembic", "upgrade", "head"], { env: pyEnv("fresh") });
  run(python, ["-m", "alembic", "check"], { env: pyEnv("fresh") });
  if (!locationOnly)
    run(python, ["-m", "pytest", "-q", "-p", "no:cacheprovider"], {
      env: {
        ...pyEnv("tests"),
        LYOR_LOC01_TEST_DATABASE_URL: dsn("tests"),
        LYOR_LOC01_BASELINE_DATABASE_URL: dsn("baseline"),
        LYOR_LOC01_RESTORED_DATABASE_URL: dsn("restored"),
        LYOR_LOC01_FRESH_DATABASE_URL: dsn("fresh"),
        LYOR_PHASE02_TEST_DATABASE_URL: dsn("phase02"),
        LYOR_PHASE05_TEST_DATABASE_URL: dsn("odoo"),
      },
    });
  run(
    python,
    [
      "-m",
      "app.services.postal_import",
      "tests/fixtures/postal-demo.json",
      "--apply",
      "--activate",
      "--actor",
      "loc01-rehearsal",
    ],
    { env: pyEnv("web") },
  );
  const blocked = spawnSync(
    python,
    ["-m", "alembic", "downgrade", "0001_legacy"],
    { env: pyEnv("web"), cwd: apiDir, encoding: "utf8", windowsHide: true },
  );
  writeFileSync(
    resolve(evidence, "blocked-downgrade.log"),
    (blocked.stdout ?? "") + (blocked.stderr ?? ""),
  );
  if (blocked.status === 0 || !blocked.stderr?.includes("Location data exists"))
    throw new Error("Populated downgrade was not safely blocked");
  if (!backendOnly) {
    const api = launch(
      "api",
      python,
      [
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        "4161",
        "--loop",
        "asyncio:SelectorEventLoop",
      ],
      { cwd: apiDir, env: pyEnv("web") },
    );
    await ready(api, "http://127.0.0.1:4161/api/v1/health/ready");
    const npmCommand =
      process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "npm";
    const npmArgs =
      process.platform === "win32"
        ? ["/d", "/s", "/c", "npm.cmd run test:e2e"]
        : ["run", "test:e2e"];
    if (!locationOnly) {
      const baseline = await preview(false, 3161);
      run(npmCommand, npmArgs, {
        cwd: root,
        env: {
          ...process.env,
          PREVIEW_URL: "http://127.0.0.1:3161",
          LOC01_E2E: "false",
        },
      });
      stop(baseline);
      // Both suites reach the API through one loopback proxy. Start the second
      // suite after the existing per-peer minute window has elapsed.
      await sleep(61000);
    }
    const fixture = new Client({ connectionString: dsn("web") });
    await fixture.connect();
    try {
      await fixture.query('UPDATE "Product" SET variants = variants || $1::jsonb WHERE id = $2', [
        JSON.stringify([{ id: "loc03-demo-finish", name: "Demo finish", monthlyDeltaPaise: 5000 }]), "mira-sofa",
      ]);
      await fixture.query('UPDATE "Product" SET cities = array_append(cities, $1) WHERE id = $2', ["gurugram", "arbor-bed"]);
    } finally {
      await fixture.end();
    }
    await preview(true, 3162);
    run(
      npmCommand,
      process.platform === "win32"
        ? [
            "/d",
            "/s",
            "/c",
            "npm.cmd run test:e2e -- tests/e2e/manual-location.spec.ts",
          ]
        : ["run", "test:e2e", "--", "tests/e2e/manual-location.spec.ts"],
      {
        cwd: root,
        env: {
          ...process.env,
          PREVIEW_URL: "http://127.0.0.1:3162",
          LOC01_E2E: "true",
        },
      },
    );
  }
  writeFileSync(
    resolve(evidence, "results.json"),
    JSON.stringify(
      {
        names,
        date: new Date().toISOString(),
        status: "passed",
        scope: backendOnly
          ? "backend"
          : locationOnly
            ? "location-browser"
            : "full",
      },
      null,
      2,
    ),
  );
  console.log("LOC01 VERIFIED", JSON.stringify(names));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  for (const child of children.reverse()) stop(child);
  for (const fd of files) closeSync(fd);
  await admin?.end().catch(() => {});
  if (started) await pg.stop().catch((error) => console.error(error.message));
}
