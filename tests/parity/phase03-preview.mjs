import { Client } from "pg";
import { execFileSync, spawn } from "node:child_process";
import { resolve } from "node:path";
import {
  existsSync,
  writeFileSync,
  createWriteStream,
  mkdirSync,
  unlinkSync,
  readFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { setTimeout as sleep } from "node:timers/promises";
const stamp = Date.now();
const names = Object.fromEntries(
  [
    "source",
    "legacy",
    "candidate",
    "handoff",
    "tests",
    "legacyWeb",
    "candidateWeb",
  ].map((key) => [key, "lyor_test_phase03_" + stamp + "_" + key.toLowerCase()]),
);
const fixture = {
  host: "127.0.0.1",
  port: 5433,
  user: "lyor_test",
  password: "local_test_only",
};
const dsn = (key) =>
  "postgresql://" +
  fixture.user +
  ":" +
  fixture.password +
  "@127.0.0.1:5433/" +
  names[key];
const secret = "isolated-phase03-synthetic-secret-at-least-32";
const nodeEnv = (key, port) => ({
  ...process.env,
  NODE_ENV: "development",
  DEMO_MODE: "true",
  DATABASE_URL: dsn(key) + "?schema=public",
  QUOTE_SECRET: secret,
  API_HOST: "127.0.0.1",
  API_PORT: String(port),
});
const pyEnv = (key) => ({
  ...process.env,
  LYOR_ENVIRONMENT: "test",
  LYOR_DEMO_MODE: "true",
  LYOR_DATABASE_URL: dsn(key),
  LYOR_QUOTE_SECRET: secret,
});
const python = resolve(
  "apps/api/.venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
const next = resolve("node_modules/next/dist/bin/next");
const children = [];
const ports = {
  legacy: 4030,
  candidate: 4130,
  handoffLegacy: 4031,
  handoffCandidate: 4131,
  legacyWebApi: 4032,
  candidateWebApi: 4132,
  web: 3120,
};
const testFolder = resolve(".data/phase03");
const apiFolder = resolve("apps/api");
const marker = resolve(".data/phase03/stop");
const servers = {};
const previewBackend = resolve(testFolder, "preview-backend.txt");
mkdirSync(testFolder, { recursive: true });
if (existsSync(marker)) unlinkSync(marker);
writeFileSync(previewBackend, "legacy");
let interrupted = false;
process.on("SIGINT", () => {
  interrupted = true;
});
process.on("SIGTERM", () => {
  interrupted = true;
});

const proxy = createServer(async (req, res) => {
  try {
    const mode = readFileSync(previewBackend, "utf8").trim();
    const port =
      mode === "legacy"
        ? ports.legacyWebApi
        : mode === "candidate"
          ? ports.candidateWebApi
          : 0;
    if (!port) throw Error("Unexpected preview backend");
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const headers = {};
    for (const key of ["authorization", "content-type", "idempotency-key"]) {
      if (req.headers[key]) headers[key] = req.headers[key];
    }
    const backend = await fetch("http://127.0.0.1:" + port + req.url, {
      method: req.method,
      headers,
      redirect: "manual",
      body: ["GET", "HEAD"].includes(req.method)
        ? undefined
        : Buffer.concat(chunks),
    });
    res.writeHead(backend.status, {
      "content-type": backend.headers.get("content-type") ?? "application/json",
    });
    res.end(Buffer.from(await backend.arrayBuffer()));
  } catch (error) {
    res.writeHead(502);
    res.end(error.message);
  }
});
function run(command, args, env, cwd) {
  execFileSync(command, args, {
    env,
    cwd,
    stdio: "inherit",
    windowsHide: true,
  });
}
function launch(name, command, args, env, cwd) {
  const out = createWriteStream(resolve(testFolder, name + ".log"), {
    flags: "w",
  });
  const child = spawn(command, args, {
    env,
    cwd,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.pipe(out, { end: false });
  child.stderr.pipe(out, { end: false });
  child.on("exit", () => out.end());
  children.push(child);
  servers[name] = child;
}
const db = new Client({ ...fixture, database: "postgres" });
try {
  await db.connect();
  await db.query('CREATE DATABASE "' + names.source + '"');
  run(
    process.execPath,
    [
      resolve("node_modules/prisma/build/index.js"),
      "migrate",
      "deploy",
      "--schema",
      "apps/api/prisma/schema.prisma",
    ],
    nodeEnv("source", 4000),
    process.cwd(),
  );
  for (const action of ["seed-demo", "import-pilot"]) {
    run(python, ["-m", "app.db.fixtures", action], pyEnv("source"), apiFolder);
  }
  for (const [key, name] of Object.entries(names))
    if (key !== "source") {
      await db.query(
        'CREATE DATABASE "' + name + '" TEMPLATE "' + names.source + '"',
      );
    }
  for (const key of ["candidate", "candidateWeb", "tests", "handoff"]) {
    run(
      python,
      ["-m", "alembic", "stamp", "0001_legacy"],
      pyEnv(key),
      apiFolder,
    );
  }
  for (const [processName, dbKey] of [
    ["legacy", "legacy"],
    ["handoffLegacy", "handoff"],
    ["legacyWebApi", "legacyWeb"],
  ]) {
    launch(
      processName,
      process.execPath,
      ["dist/main.js"],
      nodeEnv(dbKey, ports[processName]),
      apiFolder,
    );
  }
  for (const [processName, dbKey] of [
    ["candidate", "candidate"],
    ["handoffCandidate", "handoff"],
    ["candidateWebApi", "candidateWeb"],
  ]) {
    launch(
      processName,
      python,
      [
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        String(ports[processName]),
        "--loop",
        "asyncio:SelectorEventLoop",
      ],
      pyEnv(dbKey),
      apiFolder,
    );
  }
  await new Promise((ready, fail) => {
    proxy.once("error", fail);
    proxy.listen(4140, "127.0.0.1", ready);
  });
  launch(
    "web",
    process.execPath,
    [next, "dev", "--hostname", "127.0.0.1", "--port", String(ports.web)],
    {
      ...process.env,
      NODE_ENV: "development",
      DEMO_MODE: "true",
      API_URL: "http://127.0.0.1:4140/api/v1",
      WEB_ORIGIN: "http://127.0.0.1:" + ports.web,
      NEXT_TELEMETRY_DISABLED: "1",
    },
    resolve("apps/web"),
  );
  for (const [key, port] of Object.entries(ports)) {
    const url =
      "http://127.0.0.1:" +
      port +
      (key === "web" ? "/" : "/api/v1/health/ready");
    let up = false;
    for (let attempt = 0; attempt < 160; attempt++) {
      if (servers[key].exitCode !== null)
        throw Error(key + " exited, inspect its log");
      if (
        (
          await fetch(url, { signal: AbortSignal.timeout(3000) }).catch(
            () => null,
          )
        )?.ok
      ) {
        up = true;
        break;
      }
      await sleep(250);
    }
    if (!up) throw Error("Timed out " + url);
  }
  writeFileSync(
    resolve(testFolder, "runtime.json"),
    JSON.stringify({
      names,
      ports,
      pids: Object.fromEntries(
        Object.entries(servers).map(([key, proc]) => [key, proc.pid]),
      ),
    }),
  );
  console.log("PHASE03 READY", JSON.stringify(ports));
  while (!interrupted && !existsSync(marker)) await sleep(500);
} finally {
  proxy.close();
  for (const child of children) {
    if (child.exitCode !== null) continue;
    if (process.platform === "win32") {
      try {
        execFileSync("taskkill.exe", ["/F", "/T", "/PID", String(child.pid)], {
          stdio: "ignore",
          windowsHide: true,
        });
      } catch {
        child.kill();
      }
    } else {
      child.kill();
    }
  }
  await db.end();
}
