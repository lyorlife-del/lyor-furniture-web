import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { Client } from "pg";

const runtime = JSON.parse(readFileSync(".data/phase03/runtime.json", "utf8"));
const legacy = runtime.ports.legacy;
const candidate = runtime.ports.candidate;
assert(Number.isInteger(candidate) && candidate > 1024 && candidate <= 65535);
const openapi = await fetch("http://127.0.0.1:" + candidate + "/api/docs-json");
assert.equal(openapi.status, 200);
assert.deepEqual(
  await openapi.json(),
  JSON.parse(
    readFileSync("packages/api-contracts/fastapi-openapi.json", "utf8"),
  ),
);
const caseResults = [];
const token = "customer-a";
const address = {
  name: "Phase Three",
  phone: "9999999999",
  street: "Synthetic – phase three address",
  pin: "201304",
};
const fixtureLine = {
  productId: "mira-sofa",
  mode: "rent",
  quantity: 1,
  variantId: "standard",
  tenure: 6,
};

async function request(port, method, path, { role, key, body, raw } = {}) {
  assert(Number.isInteger(port) && port >= 1024 && port <= 65535);
  const headers = {};
  if (role) headers.authorization = "Bearer demo-" + role;
  if (key) headers["idempotency-key"] = key;
  if (body !== undefined || raw !== undefined)
    headers["content-type"] = "application/json";
  const reply = await fetch("http://127.0.0.1:" + port + "/api/v1" + path, {
    method,
    headers,
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const content = await reply.text();
  try {
    return { status: reply.status, data: JSON.parse(content) };
  } catch {
    return { status: reply.status, data: content };
  }
}

const idPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;

function comparable(value, key) {
  if (Array.isArray(value)) return value.map((item) => comparable(item));
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [
        name,
        comparable(item, name),
      ]),
    );
  }
  if (typeof value === "string") {
    if (
      [
        "createdAt",
        "updatedAt",
        "expiresAt",
        "availableAt",
        "leaseUntil",
      ].includes(key)
    ) {
      assert.match(value, datePattern);
      return "<timestamp>";
    }
    if (["signature", "requestHash"].includes(key)) {
      assert.match(value, /^[0-9a-f]{64}$/);
      return "<sha256>";
    }
    if (
      ["id", "orderId", "quoteId", "cartId"].includes(key) &&
      idPattern.test(value)
    )
      return "<uuid>";
  }
  return value;
}

async function both(
  method,
  path,
  status,
  options = {},
  candidatePath = path,
  candidateOptions = options,
) {
  const [before, after] = await Promise.all([
    request(legacy, method, path, options),
    request(candidate, method, candidatePath, candidateOptions),
  ]);
  assert.equal(
    before.status,
    status,
    JSON.stringify({ method, path, before, after }),
  );
  assert.equal(
    after.status,
    status,
    JSON.stringify({ method, path, before, after }),
  );
  assert.deepEqual(
    comparable(after.data),
    comparable(before.data),
    method + " " + path,
  );
  caseResults.push({
    method,
    path: path.replace(/[0-9a-f-]{36}/gi, "{id}"),
    status,
  });
  return [before.data, after.data];
}

async function fixtureDb(name, callback) {
  const database = runtime.names[name];
  assert.match(
    database,
    /^lyor_test_phase03_[0-9]+_(legacy|candidate|handoff)$/,
  );
  const db = new Client({
    host: "127.0.0.1",
    port: 5433,
    user: "lyor_test",
    password: "local_test_only",
    database,
  });
  await db.connect();
  try {
    return await callback(db);
  } finally {
    await db.end();
  }
}

await both("GET", "/health", 200);
await both("GET", "/health/ready", 200);
for (const query of [
  "",
  "?mode=rent&sort=price-desc&page=2",
  "?mode=buy&category=living&sort=price-asc",
  "?q=SOFA",
  "?sort=newest&page=1000",
  "?q=%25",
]) {
  await both("GET", "/catalog" + query, 200);
}
await both("GET", "/catalog?page=0", 400);
await both("GET", "/catalog?page=abc", 400);
await both("GET", "/catalog?page=1001", 400);
await both("GET", "/catalog?category=wrong", 400);
await both("GET", "/catalog?unsafe=true", 400);
await both("GET", "/products/mira-sofa", 200);
await both("GET", "/products/pilot-b07", 200);
await both("GET", "/products/missing-product", 404);
await both("GET", "/bundles", 200);
await both("GET", "/cities", 200);
await both("GET", "/serviceability?pin=201304", 200);
await both("GET", "/serviceability?pin=400001", 200);
await both("GET", "/serviceability?pin=broken", 400);
await both("GET", "/serviceability", 400);

const cartId = randomUUID();
const cart = { cartId, city: "noida", revision: 0, lines: [fixtureLine] };
const options = { body: cart };
await both("PUT", "/cart", 400, { body: { ...cart, unexpected: true } });
await both("PUT", "/cart", 400, {
  body: { ...cart, lines: [{ ...fixtureLine, quantity: 11 }] },
});
await both("PUT", "/cart", 400, {
  body: { ...cart, lines: [fixtureLine, fixtureLine] },
});
await both("PUT", "/cart", 413, { body: { oversized: "x".repeat(132000) } });
const [guestCart] = await both("PUT", "/cart", 200, options);
assert.equal(guestCart.ownerId, null);
await both("GET", "/cart/" + cartId, 200);
await both("GET", "/cart/invalid", 400);
await both("PUT", "/cart", 409, options);
const signed = { role: token };
await both("PUT", "/cart", 200, { ...signed, body: { ...cart, revision: 1 } });
await both("GET", "/cart/" + cartId, 404, { role: "customer-b" });
await both("GET", "/cart/" + cartId, 401, { role: "invalid" });
await both("GET", "/cart/" + cartId, 200, signed);

await both("POST", "/quotes", 409, {
  ...signed,
  body: { cartId, pin: "400001" },
});
const quotes = await both("POST", "/quotes", 201, {
  ...signed,
  body: { cartId, pin: "201304" },
});
assert.equal(quotes[1].breakdown.totalPaise, 129564);
assert.equal(quotes[1].cartRevision, 2);
const orderKey = randomUUID();
const orderOptions = quotes.map((quote) => ({
  ...signed,
  key: orderKey,
  body: {
    quoteId: quote.id,
    signature: quote.signature,
    address,
    consent: true,
  },
}));
const orders = await both(
  "POST",
  "/orders",
  201,
  orderOptions[0],
  "/orders",
  orderOptions[1],
);
assert.equal(orders[1].quoteId, quotes[1].id);
await both("POST", "/orders", 201, orderOptions[0], "/orders", orderOptions[1]);
const changed = orderOptions.map((options) => ({
  ...options,
  body: {
    ...options.body,
    address: { ...address, street: "Different synthetic street" },
  },
}));
await both("POST", "/orders", 409, changed[0], "/orders", changed[1]);
await both("GET", "/me/orders", 401);
await both("GET", "/me/orders", 200, signed);
await both(
  "GET",
  "/me/orders/" + orders[0].id,
  200,
  signed,
  "/me/orders/" + orders[1].id,
);
await both(
  "GET",
  "/me/orders/" + orders[0].id,
  404,
  { role: "customer-b" },
  "/me/orders/" + orders[1].id,
);

const enquiry = {
  key: randomUUID(),
  body: {
    name: "Phase Three",
    email: "test@example.invalid",
    phone: "9999999999",
    company: "Synthetic",
    mode: "rent",
    consent: true,
    sites: [{ name: "Example location", pin: "201304", units: 2 }],
  },
};
await both("POST", "/b2b/enquiries", 201, enquiry);
await both("POST", "/b2b/enquiries", 201, enquiry);
await both("POST", "/b2b/enquiries", 409, {
  ...enquiry,
  body: { ...enquiry.body, company: "Changed" },
});

await both("GET", "/admin/catalog", 403, signed);
await both("GET", "/admin/catalog", 200, { role: "catalog" });
await both("PATCH", "/admin/catalog/mira-sofa", 200, {
  role: "catalog",
  body: { published: false },
});
await both("GET", "/products/mira-sofa", 404);
await both("PATCH", "/admin/catalog/mira-sofa", 200, {
  role: "catalog",
  body: { published: true },
});
await both("GET", "/admin/exceptions", 403, { role: "catalog" });
const admin = { role: "admin" };
const events = (await both("GET", "/admin/exceptions", 200, admin)).map(
  (rows) => rows[0],
);
await both(
  "POST",
  "/admin/exceptions/" + events[0].id + "/replay",
  409,
  admin,
  "/admin/exceptions/" + events[1].id + "/replay",
);
for (const [index, name] of ["legacy", "candidate"].entries()) {
  await fixtureDb(name, (db) =>
    db.query(
      "UPDATE \"OutboxEvent\" SET status='failed', attempts=3, \"lastError\"='synthetic fault' WHERE id=$1",
      [events[index].id],
    ),
  );
}
const replay = await both(
  "POST",
  "/admin/exceptions/" + events[0].id + "/replay",
  201,
  admin,
  "/admin/exceptions/" + events[1].id + "/replay",
);
assert.equal(replay[1].status, "pending");
assert.equal(replay[1].attempts, 0);
const auditSql =
  'SELECT "actorId", action, detail FROM "AuditLog" ORDER BY action, detail::text';
const auditRows = await Promise.all(
  ["legacy", "candidate"].map((name) =>
    fixtureDb(name, (db) => db.query(auditSql)),
  ),
);
assert.deepEqual(auditRows[1].rows, auditRows[0].rows);
assert.equal(auditRows[1].rowCount, 4);
const operations = new Set(
  caseResults
    .filter(({ status }) => status < 300)
    .map(
      ({ method, path }) =>
        method +
        " " +
        path.split("?")[0].replace(/\/products\/[^/]+$/, "/products/{slug}"),
    ),
);
assert.equal(operations.size, 18);

const mixed = [runtime.ports.handoffLegacy, runtime.ports.handoffCandidate];
const handoffs = [];
for (const [issuer, consumer] of [mixed, [...mixed].reverse()]) {
  const handoffCart = randomUUID();
  const opened = await request(issuer, "PUT", "/cart", {
    ...signed,
    body: { ...cart, cartId: handoffCart },
  });
  assert.equal(opened.status, 200);
  const quoted = await request(issuer, "POST", "/quotes", {
    ...signed,
    body: { cartId: handoffCart, pin: "201304" },
  });
  assert.equal(quoted.status, 201);
  const issued = quoted.data;
  const orderInput = {
    ...signed,
    key: randomUUID(),
    body: {
      quoteId: issued.id,
      signature: issued.signature,
      address,
      consent: true,
    },
  };
  const ordered = await request(consumer, "POST", "/orders", orderInput);
  assert.equal(ordered.status, 201, JSON.stringify(ordered));
  const replayed = await request(issuer, "POST", "/orders", orderInput);
  assert.equal(replayed.status, 201, JSON.stringify(replayed));
  assert.equal(replayed.data.id, ordered.data.id);
  handoffs.push({ issuer, consumer, orderId: ordered.data.id });
}

const concurrencyCart = randomUUID();
const opened = await request(mixed[1], "PUT", "/cart", {
  ...signed,
  body: { ...cart, cartId: concurrencyCart },
});
assert.equal(opened.status, 200);
const issued = (
  await request(mixed[1], "POST", "/quotes", {
    ...signed,
    body: { cartId: concurrencyCart, pin: "201304" },
  })
).data;
const orderInput = {
  ...signed,
  key: randomUUID(),
  body: {
    quoteId: issued.id,
    signature: issued.signature,
    address,
    consent: true,
  },
};
const competing = await Promise.all(
  Array.from({ length: 6 }, () =>
    request(mixed[1], "POST", "/orders", orderInput),
  ),
);
assert(
  competing.every((result) => result.status === 201),
  JSON.stringify(competing),
);
assert.equal(new Set(competing.map(({ data }) => data.id)).size, 1);
const ids = [...handoffs.map(({ orderId }) => orderId), competing[0].data.id];
await fixtureDb("handoff", async (db) => {
  for (const [table, field] of [
    ["OrderIntent", "id"],
    ["OutboxEvent", "orderId"],
    ["AuditLog", "entityId"],
  ]) {
    const {
      rows: [result],
    } = await db.query(
      'SELECT count(*)::int AS count FROM "' +
        table +
        '" WHERE "' +
        field +
        '" = ANY($1)',
      [ids],
    );
    assert.equal(result.count, 3, table);
  }
});
const invalidCartFixture = {
  cartId: "00000000-0000-4000-8000-000000000001",
  city: "noida",
  revision: 0,
  lines: [
    {
      productId: "abc",
      mode: "rent",
      quantity: 1,
      variantId: "standard",
      tenure: 6,
    },
  ],
};
const samples = [
  ["GET", "/catalog?page=0.5"],
  ["GET", "/catalog?q=a&q=b"],
  ["GET", "/catalog?page=1&page=2"],
  ["PUT", "/cart", {}],
  [
    "PUT",
    "/cart",
    {
      ...invalidCartFixture,
      lines: [{ ...invalidCartFixture.lines[0], quantity: "1" }],
    },
  ],
  [
    "PUT",
    "/cart",
    {
      ...invalidCartFixture,
      lines: [
        { ...invalidCartFixture.lines[0], quantity: 11, unexpected: true },
      ],
    },
  ],
  ["PUT", "/cart", { ...invalidCartFixture, lines: ["bad"] }],
  ["PUT", "/cart", { ...invalidCartFixture, lines: null }],
  ["POST", "/orders", {}],
  ["POST", "/b2b/enquiries", {}],
  ["PUT", "/cart", "invalid", "{"],
  ["PUT", "/cart", "invalid", ""],
  ["PUT", "/cart", "invalid", "[]"],
];
for (const [method, path, body, raw] of samples) {
  const responses = [];
  for (const port of [legacy, candidate]) {
    const r = await fetch("http://127.0.0.1:" + port + "/api/v1" + path, {
      method,
      headers: {
        authorization: "Bearer demo-admin",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    responses.push({ status: r.status, data: await r.json() });
  }
  assert.deepEqual(
    responses[1],
    responses[0],
    method + " " + path + " " + JSON.stringify(body),
  );
}
console.log("13 supplemental validation comparisons matched");
writeFileSync(
  ".data/phase03/api-results.json",
  JSON.stringify(
    {
      comparisonCases: caseResults,
      supplementalValidation: samples.length,
      uniqueOperations: operations.size,
      handoffs: 2,
      duplicateSubmissions: competing.length,
    },
    null,
    2,
  ),
);
console.log(
  caseResults.length +
    " matching API probes across 18 operations; two bidirectional handoffs and six simultaneous duplicate submissions verified",
);
