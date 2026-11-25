import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  createWriteStream,
} from "node:fs";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "@playwright/test";
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import pg from "pg";

pg.types.setTypeParser(
  1114,
  (value) => new Date(value.replace(" ", "T") + "Z"),
);

const output = ".data/phase04";
const stamp = Date.now();
const names = Object.fromEntries(
  ["worker", "inventory"].map((key) => [
    key,
    "lyor_test_phase04_" + stamp + "_" + key,
  ]),
);
const credentials = {
  host: "127.0.0.1",
  port: 5433,
  user: "lyor_test",
  password: "local_test_only",
};
const dsn = (key) =>
  "postgresql://lyor_test:local_test_only@127.0.0.1:5433/" + names[key];
const api = "http://127.0.0.1:4142";
const browserOrigin = "http://127.0.0.1:3120";
const redis = "redis://127.0.0.1:6383";
const python = resolve(
  "apps/api/.venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
const apiFolder = resolve("apps/api");
const processes = new Set();
const checks = [];

function env(key) {
  return {
    ...process.env,
    LYOR_ENVIRONMENT: "test",
    LYOR_DEMO_MODE: "true",
    LYOR_QUOTE_SECRET: "isolated-phase-four-synthetic-quote-secret",
    LYOR_DATABASE_URL: dsn(key),
    LYOR_REDIS_URL: redis + "/0",
    LYOR_DEMO_ODOO_OUTAGE: "false",
  };
}

function run(key, args) {
  return execFileSync(python, args, {
    env: env(key),
    cwd: apiFolder,
    encoding: "utf8",
    windowsHide: true,
    timeout: 30000,
  });
}

function launch(name, command, args, options) {
  const path = output + "/" + name + ".log";
  const log = createWriteStream(path);
  const child = spawn(command, args, {
    ...options,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  child.on("close", () => log.end());
  processes.add(child);
  return { child, path };
}

async function stop(processHandle) {
  const child = processHandle?.child;
  if (!child) return;
  if (child.exitCode === null && child.signalCode === null) {
    const exited = new Promise((done) => child.once("exit", done));
    if (process.platform === "win32") {
      execFileSync("taskkill.exe", ["/F", "/T", "/PID", String(child.pid)], {
        windowsHide: true,
        stdio: "ignore",
      });
    } else {
      child.kill("SIGKILL");
    }
    await exited;
  }
  processes.delete(child);
}

async function until(label, predicate, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await predicate();
    if (result) return result;
    await sleep(100);
  }
  throw Error("Timed out: " + label);
}

function record(name) {
  checks.push(name);
  console.log("PASS " + name);
}

async function query(key, sql, params = []) {
  const db = new pg.Client({ ...credentials, database: names[key] });
  await db.connect();
  try {
    return await db.query(sql, params);
  } finally {
    await db.end();
  }
}

async function orderFixture(key, productId = "mira-sofa") {
  // The worker database uses the checkout API. Inventory rehearsal uses a local
  // Prisma-shaped fixture isolated from the browser and worker test data.
  if (key === "inventory") {
    const cartId = randomUUID(),
      quoteId = randomUUID(),
      orderId = randomUUID(),
      eventId = randomUUID();
    const lines = JSON.stringify([
      {
        productId,
        mode: "rent",
        quantity: 1,
        variantId: "standard",
        tenure: 6,
      },
    ]);
    const db = new pg.Client({ ...credentials, database: names[key] });
    await db.connect();
    try {
      await db.query("BEGIN");
      await db.query(
        'INSERT INTO "Cart" (id, "ownerId", lines, "updatedAt") VALUES ($1,\'customer-a\',$2,now())',
        [cartId, lines],
      );
      await db.query(
        "INSERT INTO \"Quote\" (id,\"cartId\",\"cartRevision\",\"ownerId\",city,pin,lines,breakdown,\"policyVersion\",signature,\"expiresAt\") VALUES ($1,$2,0,'customer-a','noida','201304',$3,'{}','demo','synthetic',now())",
        [quoteId, cartId, lines],
      );
      await db.query(
        'INSERT INTO "OrderIntent" (id,"ownerId","idempotencyKey","requestHash","quoteId",city,address,lines,breakdown,"updatedAt") VALUES ($1,\'customer-a\',$2,\'synthetic\',$3,\'noida\',\'{}\',$4,\'{}\',now())',
        [orderId, randomUUID(), quoteId, lines],
      );
      await db.query(
        'INSERT INTO "OutboxEvent" (id,"orderId") VALUES ($1,$2)',
        [eventId, orderId],
      );
      await db.query("COMMIT");
    } finally {
      await db.end();
    }
    return { orderId, eventId };
  }
  const cartId = randomUUID();
  const cart = await request("PUT", "/cart", 200, {
    cartId,
    city: "noida",
    revision: 0,
    lines: [
      {
        productId,
        mode: "rent",
        quantity: 1,
        variantId: "standard",
        tenure: 6,
      },
    ],
  });
  assert.equal(cart.revision, 1);
  const quote = await request("POST", "/quotes", 201, {
    cartId,
    pin: "201304",
  });
  const order = await request(
    "POST",
    "/orders",
    201,
    {
      quoteId: quote.id,
      signature: quote.signature,
      address: {
        name: "Phase Four",
        phone: "9999999999",
        street: "Synthetic worker street",
        pin: "201304",
      },
      consent: true,
    },
    "customer-a",
    randomUUID(),
  );
  const {
    rows: [event],
  } = await query("worker", 'SELECT id FROM "OutboxEvent" WHERE "orderId"=$1', [
    order.id,
  ]);
  return { orderId: order.id, eventId: event.id };
}

async function request(
  method,
  path,
  expected,
  body,
  identity = "customer-a",
  key,
) {
  const headers = { Authorization: "Bearer demo-" + identity };
  if (key) headers["Idempotency-Key"] = key;
  if (body) headers["Content-Type"] = "application/json";
  const result = await fetch(api + "/api/v1" + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await result.json();
  assert.equal(result.status, expected, JSON.stringify(data));
  return data;
}

async function eventState(key, id) {
  const {
    rows: [state],
  } = await query(
    key,
    `
    SELECT e.*, o."orderState", o."externalId", o."stockState",
      o.attempts AS "orderAttempts",
      (SELECT COUNT(*)::int FROM "Reservation" r WHERE r."orderId"=o.id) AS reservations,
      (SELECT COUNT(*)::int FROM "AuditLog" a WHERE a."entityId"=o.id AND a.action='order.demo_confirmed') AS confirmations
    FROM "OutboxEvent" e JOIN "OrderIntent" o ON o.id=e."orderId" WHERE e.id=$1
  `,
    [id],
  );
  return state;
}

async function stock(key) {
  const {
    rows: [product],
  } = await query(key, "SELECT stock FROM \"Product\" WHERE id='mira-sofa'");
  return product.stock;
}

function dispatch(key = "worker") {
  return run(key, ["-m", "app.workers", "dispatch", "--once"]);
}

async function worker(name, key = "worker", outage = false) {
  const processHandle = launch(
    name,
    python,
    ["-m", "app.workers", "worker", "--pool", "solo"],
    {
      cwd: apiFolder,
      env: { ...env(key), LYOR_DEMO_ODOO_OUTAGE: String(outage) },
    },
  );
  await until(name + " ready", () => {
    assert.equal(processHandle.child.exitCode, null, name + " exited");
    return (
      existsSync(processHandle.path) &&
      / ready\./.test(readFileSync(processHandle.path, "utf8"))
    );
  });
  return processHandle;
}

function docker(...args) {
  const container = "lyor-phase04-redis";
  const owner = execFileSync(
    "docker",
    [
      "inspect",
      "--format",
      '{{index .Config.Labels "com.lyor.purpose"}}',
      container,
    ],
    { encoding: "utf8" },
  ).trim();
  assert.equal(owner, "phase04-worker");
  execFileSync("docker", [...args, container], {
    stdio: "ignore",
    timeout: 30000,
  });
}

function publish(key, eventId, lease) {
  run(key, [
    "-c",
    `
import sys
from app.workers.celery_app import PROCESS_ORDER, QUEUE, create_celery
app = create_celery("redis://127.0.0.1:6383/0")
app.send_task(PROCESS_ORDER, args=sys.argv[1:], queue=QUEUE, retry=False)
`,
    eventId,
    lease,
  ]);
}

async function expireLease(key, eventId) {
  await query(
    key,
    'UPDATE "OutboxEvent" SET "leaseUntil"=now()-interval \'1 second\' WHERE id=$1',
    [eventId],
  );
}

async function waitDone(key, fixture) {
  const state = await until("outbox completion", async () => {
    const current = await eventState(key, fixture.eventId);
    return current.status === "done" && current;
  });
  assert.equal(state.orderState, "confirmed_demo");
  assert.equal(state.externalId, "DEMO-" + fixture.orderId);
  assert.equal(state.reservations, 1);
  assert.equal(state.confirmations, 1);
  return state;
}

function readLegacyReport(status) {
  const result = spawnSync(process.execPath, ["scripts/reconcile-bullmq.mjs"], {
    env: {
      ...process.env,
      LYOR_RECONCILE_DB_URL: dsn("inventory"),
      LYOR_RECONCILE_REDIS_URL: redis + "/1",
    },
    encoding: "utf8",
    timeout: 15000,
  });
  assert.equal(result.status, status, result.stderr + result.stdout);
  return JSON.parse(result.stdout);
}

async function rehearseInventory() {
  const connection = new Redis(redis + "/1", { maxRetriesPerRequest: null });
  const queue = new Queue("lyor-orders", { connection });
  let release;
  let legacyWorker;
  let consumer;
  const activeGate = new Promise((done) => {
    release = done;
  });
  try {
    const fixtures = {};
    for (const state of [
      "waiting",
      "active",
      "delayed",
      "retrying",
      "failed",
      "dbOnly",
    ]) {
      fixtures[state] = await orderFixture("inventory");
    }
    const started = new Set();
    legacyWorker = new Worker(
      "lyor-orders",
      async (job) => {
        started.add(job.id);
        if (job.name === "active") await activeGate;
        if (["failed", "retrying"].includes(job.name))
          throw Error("Synthetic legacy outage");
      },
      { connection, concurrency: 1 },
    );
    function add(state, options) {
      const { eventId, orderId } = fixtures[state];
      return queue.add(
        state,
        { eventId, orderId },
        { jobId: eventId, ...options },
      );
    }
    const failed = await add("failed", { attempts: 1 });
    const retrying = await add("retrying", {
      attempts: 2,
      backoff: { type: "fixed", delay: 120000 },
    });
    await until(
      "BullMQ failure and retry",
      async () =>
        (await failed.getState()) === "failed" &&
        (await retrying.getState()) === "delayed",
    );
    for (const state of ["failed", "dbOnly"]) {
      await query(
        "inventory",
        "UPDATE \"OutboxEvent\" SET status='failed', attempts=1 WHERE id=$1",
        [fixtures[state].eventId],
      );
    }
    await add("active");
    await until("BullMQ active job", () =>
      started.has(fixtures.active.eventId),
    );
    await add("waiting");
    await add("delayed", { delay: 120000 });
    const blocked = readLegacyReport(2);
    assert.equal(blocked.readyForReview, false);
    const preStates = Object.fromEntries(
      blocked.report.map((row) => [row.eventId, row.state]),
    );
    for (const [label, state] of [
      ["waiting", "wait"],
      ["active", "active"],
      ["delayed", "delayed"],
      ["retrying", "retrying"],
      ["failed", "failed"],
      ["dbOnly", "outbox-only"],
    ]) {
      assert.equal(preStates[fixtures[label].eventId], state);
    }
    writeFileSync(
      output + "/bullmq-before-drain.json",
      JSON.stringify(blocked, null, 2),
    );
    await queue.pause();
    const draining = readLegacyReport(2);
    assert.equal(draining.paused, true);
    assert(
      draining.report.some((row) => row.disposition === "drain-active-job"),
    );
    await query(
      "inventory",
      "UPDATE \"OutboxEvent\" SET status='done' WHERE id=$1",
      [fixtures.active.eventId],
    );
    release();
    await legacyWorker.close();
    legacyWorker = null;
    const ready = readLegacyReport(0);
    assert.equal(ready.readyForReview, true);
    const transferable = ready.report.filter(
      (row) => row.disposition === "transfer-after-approval",
    );
    assert.equal(transferable.length, 3);
    assert.equal(
      transferable.find((row) => row.eventId === fixtures.retrying.eventId)
        .attempts,
      1,
    );
    assert.equal(
      ready.report.filter(
        (row) => row.disposition === "retain-failure-for-audited-replay",
      ).length,
      2,
    );
    writeFileSync(
      output + "/bullmq-after-drain.json",
      JSON.stringify(ready, null, 2),
    );
    for (const row of transferable) {
      await query(
        "inventory",
        'UPDATE "OutboxEvent" SET attempts=$2,"availableAt"=$3,"leaseUntil"=NULL WHERE id=$1',
        [row.eventId, row.attempts, row.availableAt],
      );
    }
    consumer = await worker("handoff-worker", "inventory");
    dispatch("inventory");
    await waitDone("inventory", fixtures.waiting);
    for (const label of ["delayed", "retrying"]) {
      assert.equal(
        (await eventState("inventory", fixtures[label].eventId)).status,
        "pending",
      );
    }
    await query(
      "inventory",
      'UPDATE "OutboxEvent" SET "availableAt"=now()-interval \'1 second\' WHERE id=$1',
      [fixtures.retrying.eventId],
    );
    dispatch("inventory");
    const retried = await waitDone("inventory", fixtures.retrying);
    assert.equal(retried.attempts, 1);
    assert.equal(await queue.isPaused(), true);
    assert.equal(await queue.getFailedCount(), 1);
    record(
      "BullMQ inventory, pause and drain, retained failures, and due-time and retry handoff",
    );
  } finally {
    release();
    await stop(consumer);
    if (legacyWorker) await legacyWorker.close();
    await queue.close();
    connection.disconnect();
  }
}

mkdirSync(output, { recursive: true });
let consumer;
try {
  const root = new pg.Client({ ...credentials, database: "postgres" });
  await root.connect();
  try {
    await root.query('CREATE DATABASE "' + names.worker + '"');
    run("worker", ["-m", "alembic", "upgrade", "head"]);
    run("worker", ["-m", "app.db.fixtures", "seed-demo"]);
    await root.query(
      'CREATE DATABASE "' +
        names.inventory +
        '" TEMPLATE "' +
        names.worker +
        '"',
    );
  } finally {
    await root.end();
  }
  launch(
    "api",
    python,
    [
      "-m",
      "uvicorn",
      "app.main:app",
      "--host",
      "127.0.0.1",
      "--port",
      "4142",
      "--loop",
      "asyncio:SelectorEventLoop",
    ],
    {
      cwd: apiFolder,
      env: env("worker"),
    },
  );
  await until(
    "FastAPI",
    async () =>
      (await fetch(api + "/api/v1/health/ready").catch(() => null))?.ok,
  );

  const original = await orderFixture("worker");
  const beforeStock = await stock("worker");
  dispatch();
  const lease = (
    await eventState("worker", original.eventId)
  ).leaseUntil.toISOString();
  publish("worker", original.eventId, lease);
  consumer = await worker("normal-worker");
  await waitDone("worker", original);
  await until("duplicate delivery ignored", () =>
    readFileSync(consumer.path, "utf8").includes(
      original.eventId + " outcome: ignored",
    ),
  );
  assert.equal(await stock("worker"), beforeStock - 1);
  const reconciledStock = await stock("worker");
  await query(
    "worker",
    'UPDATE "OutboxEvent" SET status=\'queued\',"leaseUntil"=NULL WHERE id=$1',
    [original.eventId],
  );
  await query(
    "worker",
    'UPDATE "OrderIntent" SET "orderState"=\'pending\' WHERE id=$1',
    [original.orderId],
  );
  dispatch();
  await waitDone("worker", original);
  assert.equal(await stock("worker"), reconciledStock);
  await stop(consumer);
  consumer = null;
  record(
    "Real duplicate delivery and reconciliation of a previously committed demo reservation",
  );

  const retried = await orderFixture("worker");
  consumer = await worker("outage-worker", "worker", true);
  for (let attempt = 1; attempt <= 5; attempt++) {
    dispatch();
    const state = await until("persistent retry " + attempt, async () => {
      const value = await eventState("worker", retried.eventId);
      return value.attempts === attempt && value;
    });
    assert.equal(state.orderAttempts, attempt);
    assert.equal(state.lastError, "Simulated ERP outage");
    assert.equal(state.reservations, 0);
    assert.equal(state.leaseUntil, null);
    assert.equal(state.status, attempt < 5 ? "pending" : "failed");
    if (attempt < 5) {
      const scheduled = state.availableAt.getTime() - Date.now();
      assert(scheduled > 0 && scheduled <= 1500 * 2 ** (attempt - 1));
      await sleep(scheduled + 50);
    } else {
      assert.equal(state.orderState, "failed");
    }
  }
  await stop(consumer);
  consumer = null;
  record(
    "Five database-backed attempts with exponential scheduling and terminal failure",
  );

  launch(
    "web",
    process.execPath,
    [
      resolve("node_modules/next/dist/bin/next"),
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3120",
    ],
    {
      cwd: resolve("apps/web"),
      env: {
        ...process.env,
        NODE_ENV: "development",
        DEMO_MODE: "true",
        NEXT_TELEMETRY_DISABLED: "1",
        API_URL: api + "/api/v1",
        WEB_ORIGIN: browserOrigin,
      },
    },
  );
  await until(
    "Next preview",
    async () => (await fetch(browserOrigin).catch(() => null))?.ok,
    45000,
  );
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const context = await browser.newContext({ baseURL: browserOrigin });
    const session = await context.request.post("/api/session", {
      headers: { Origin: browserOrigin },
      data: { identity: "demo-admin" },
    });
    assert.equal(session.status(), 200);
    const page = await context.newPage();
    await page.goto("/admin");
    const response = page.waitForResponse((result) =>
      result.url().endsWith("/replay"),
    );
    await page.getByRole("button", { name: "Request audited replay" }).click();
    assert.equal((await response).status(), 201);
    await context.close();
  } finally {
    await browser.close();
  }
  assert.equal((await eventState("worker", retried.eventId)).attempts, 0);
  const replay = await query(
    "worker",
    'SELECT detail FROM "AuditLog" WHERE action=\'integration.replay\' AND "entityId"=$1',
    [retried.eventId],
  );
  assert.deepEqual(replay.rows, [{ detail: { previousAttempts: 5 } }]);
  consumer = await worker("recovery-worker");
  dispatch();
  await waitDone("worker", retried);
  await stop(consumer);
  consumer = null;
  record(
    "Admin browser replay, audit history, and successful processing after recovery",
  );

  const unavailable = await orderFixture("worker");
  docker("stop");
  try {
    dispatch();
    const state = await eventState("worker", unavailable.eventId);
    assert.equal(state.status, "queued");
    assert.equal(state.attempts, 0);
    assert(state.leaseUntil);
  } finally {
    docker("start");
  }
  await expireLease("worker", unavailable.eventId);
  consumer = await worker("after-redis-worker");
  dispatch();
  await waitDone("worker", unavailable);
  record(
    "Real Redis interruption and recovery through an expired dispatcher lease",
  );

  const interrupted = await orderFixture("worker");
  const stockBeforeCrash = await stock("worker");
  const lock = new pg.Client({ ...credentials, database: names.worker });
  await lock.connect();
  try {
    await lock.query("BEGIN");
    await lock.query('LOCK TABLE "AuditLog" IN SHARE MODE');
    dispatch();
    await until("worker blocked before audit INSERT", async () => {
      const { rowCount } = await query(
        "worker",
        `
        SELECT pid FROM pg_stat_activity WHERE datname=current_database()
          AND wait_event_type='Lock' AND query LIKE 'INSERT INTO "AuditLog"%'
      `,
      );
      return rowCount > 0;
    });
    await stop(consumer);
    consumer = null;
  } finally {
    await lock.query("ROLLBACK");
    await lock.end();
  }
  assert.equal(await stock("worker"), stockBeforeCrash);
  const lost = await eventState("worker", interrupted.eventId);
  assert.equal(lost.reservations, 0);
  assert.equal(lost.confirmations, 0);
  const obsoleteLease = lost.leaseUntil.toISOString();
  await expireLease("worker", interrupted.eventId);
  publish("worker", interrupted.eventId, obsoleteLease);
  consumer = await worker("after-crash-worker");
  dispatch();
  await waitDone("worker", interrupted);
  assert.equal(await stock("worker"), stockBeforeCrash - 1);
  await until("obsolete delivery ignored", () =>
    readFileSync(consumer.path, "utf8").includes(
      interrupted.eventId + " outcome: ignored",
    ),
  );
  record(
    "Worker termination after stock SQL, transaction rollback, stale delivery fencing, and recovery",
  );

  const uncertain = await orderFixture("worker");
  await query(
    "worker",
    'UPDATE "OrderIntent" SET "externalId"=\'unknown-phase04\' WHERE id=$1',
    [uncertain.orderId],
  );
  dispatch();
  const disputed = await until("manual reconciliation", async () => {
    const state = await eventState("worker", uncertain.eventId);
    return state.status === "failed" && state;
  });
  assert.match(disputed.lastError, /^Manual reconciliation required:/);
  assert.equal(disputed.reservations, 0);
  const denied = await request(
    "POST",
    "/admin/exceptions/" + uncertain.eventId + "/replay",
    409,
    {},
    "admin",
  );
  assert.equal(
    denied.message,
    "Resolve manual reconciliation before requesting replay",
  );
  await query(
    "worker",
    'UPDATE "OutboxEvent" SET "lastError"=\'Legacy terminal failure\' WHERE id=$1',
    [uncertain.eventId],
  );
  await request(
    "POST",
    "/admin/exceptions/" + uncertain.eventId + "/replay",
    409,
    {},
    "admin",
  );
  launch("legacy-api", process.execPath, ["dist/main.js"], {
    cwd: apiFolder,
    env: {
      ...process.env,
      NODE_ENV: "test",
      DEMO_MODE: "true",
      DATABASE_URL: dsn("worker") + "?schema=public",
      QUOTE_SECRET: "isolated-phase-four-synthetic-quote-secret",
      API_HOST: "127.0.0.1",
      API_PORT: "4042",
    },
  });
  await until(
    "legacy API readiness",
    async () =>
      (
        await fetch("http://127.0.0.1:4042/api/v1/health/ready").catch(
          () => null,
        )
      )?.ok,
  );
  const guarded = await fetch(
    "http://127.0.0.1:4042/api/v1/admin/exceptions/" +
      uncertain.eventId +
      "/replay",
    { method: "POST", headers: { Authorization: "Bearer demo-admin" } },
  );
  assert.equal(guarded.status, 409);
  assert.equal(
    (await guarded.json()).message,
    "Resolve manual reconciliation before requesting replay",
  );
  assert.equal(
    (await eventState("worker", uncertain.eventId)).status,
    "failed",
  );
  await stop(consumer);
  consumer = null;
  record(
    "Uncertain external reference held for manual reconciliation with replay denied by both APIs",
  );

  await rehearseInventory();
  writeFileSync(
    output + "/worker-results.json",
    JSON.stringify({ checks }, null, 2),
  );
} finally {
  for (const child of processes) await stop({ child });
}
