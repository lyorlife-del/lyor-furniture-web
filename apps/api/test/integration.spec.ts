import "reflect-metadata";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { createApplication } from "../src/bootstrap";
import { Database } from "../src/common/database";
import { demoProducts } from "../src/modules/catalog/fixtures";
import { processDemoOrder } from "../src/integrations/mock-odoo";
const suite = process.env.RUN_DB_TESTS === "true" ? describe : describe.skip;
suite("PostgreSQL and Fastify contract", () => {
  let app: Awaited<ReturnType<typeof createApplication>>["app"], db: Database;
  const a = "Bearer demo-customer-a",
    b = "Bearer demo-customer-b";
  beforeAll(async () => {
    ({ app } = await createApplication(false));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    db = app.get(Database);
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await db.reservation.deleteMany();
    await db.outboxEvent.deleteMany();
    await db.orderIntent.deleteMany();
    await db.quote.deleteMany();
    await db.cart.deleteMany();
    await db.businessEnquiry.deleteMany();
    await db.auditLog.deleteMany();
    for (const p of demoProducts)
      await db.product.upsert({ where: { id: p.id }, update: p, create: p });
  });
  async function quote(token = a, productId = "mira-sofa") {
    const cart = await request(app.getHttpServer())
      .put("/api/v1/cart")
      .set("Authorization", token)
      .send({
        cartId: randomUUID(),
        revision: 0,
        city: "noida",
        lines: [
          {
            productId,
            mode: "rent",
            variantId: "standard",
            tenure: 6,
            quantity: 1,
          },
        ],
      })
      .expect(200);
    const quote = await request(app.getHttpServer())
      .post("/api/v1/quotes")
      .set("Authorization", token)
      .send({ cartId: cart.body.id, pin: "201304" })
      .expect(201);
    return { cart: cart.body, quote: quote.body };
  }
  function checkout(q: { id: string; signature: string }) {
    return {
      quoteId: q.id,
      signature: q.signature,
      address: {
        name: "Demo User",
        phone: "9999999999",
        street: "Demo apartment, Demo street",
        pin: "201304",
      },
      consent: true,
    };
  }
  function order(
    q: { id: string; signature: string },
    token = a,
    key = randomUUID(),
  ) {
    return request(app.getHttpServer())
      .post("/api/v1/orders")
      .set("Authorization", token)
      .set("Idempotency-Key", key)
      .send(checkout(q));
  }
  it("validates DTOs and serviceability; never exposes SKU/stock internals", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/serviceability?pin=12")
      .expect(400);
    const coverage = await request(app.getHttpServer())
      .get("/api/v1/serviceability?pin=000000")
      .expect(200);
    expect(coverage.body.deliverable).toBe(false);
    await request(app.getHttpServer())
      .put("/api/v1/cart")
      .send({
        cartId: randomUUID(),
        city: "noida",
        revision: 0,
        lines: [],
        ownerId: "customer-a",
      })
      .expect(400);
    const catalog = await request(app.getHttpServer())
      .get("/api/v1/catalog")
      .expect(200);
    expect(catalog.body.items.length).toBeGreaterThan(0);
    expect(catalog.body.items[0]).not.toHaveProperty("stock");
    expect(catalog.body.items[0]).not.toHaveProperty("sku");
  });
  it("enforces quote ownership, tamper checks and expiry", async () => {
    const { quote: q } = await quote();
    await order(q, b).expect(404);
    await order({ ...q, signature: "0".repeat(64) }).expect(409);
    await db.quote.update({
      where: { id: q.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await order(q).expect(409);
    expect(await db.orderIntent.count()).toBe(0);
  });
  it("invalidates a quote after cart revision changes", async () => {
    const { cart, quote: q } = await quote();
    await request(app.getHttpServer())
      .put("/api/v1/cart")
      .set("Authorization", a)
      .send({
        cartId: cart.id,
        city: "noida",
        revision: cart.revision,
        lines: cart.lines,
      })
      .expect(200);
    await order(q).expect(409);
  });
  it("creates exactly one logical request and outbox event for duplicate submission", async () => {
    const { quote: q } = await quote(),
      key = randomUUID();
    const first = await order(q, a, key).expect(201),
      repeated = await order(q, a, key).expect(201);
    expect(first.body.id).toBe(repeated.body.id);
    expect(await db.orderIntent.count()).toBe(1);
    expect(await db.outboxEvent.count()).toBe(1);
    await request(app.getHttpServer())
      .post("/api/v1/orders")
      .set("Authorization", a)
      .set("Idempotency-Key", key)
      .send({
        ...checkout(q),
        address: { ...checkout(q).address, street: "A changed demo address" },
      })
      .expect(409);
    await request(app.getHttpServer())
      .get("/api/v1/me/orders/" + first.body.id)
      .set("Authorization", b)
      .expect(404);
  });
  it("allows only one reservation for the last unit, including repeated worker delivery", async () => {
    await db.product.update({ where: { id: "mira-sofa" }, data: { stock: 1 } });
    const qa = await quote(a),
      qb = await quote(b);
    const oa = await order(qa.quote, a).expect(201),
      ob = await order(qb.quote, b).expect(201);
    const results = await Promise.allSettled([
      processDemoOrder(db, oa.body.id),
      processDemoOrder(db, ob.body.id),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const winner = await db.orderIntent.findFirstOrThrow({
      where: { orderState: "confirmed_demo" },
    });
    await processDemoOrder(db, winner.id);
    expect(await db.reservation.count()).toBe(1);
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: "mira-sofa" } }))
        .stock,
    ).toBe(0);
    expect(winner.paymentState).toBe("not_collected");
  });
  it("enforces staff publication rules and audits publication", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/admin/catalog")
      .set("Authorization", a)
      .expect(403);
    await db.product.update({
      where: { id: "mira-sofa" },
      data: { active: false, published: false },
    });
    await request(app.getHttpServer())
      .patch("/api/v1/admin/catalog/mira-sofa")
      .set("Authorization", "Bearer demo-catalog")
      .send({ published: true })
      .expect(409);
    await request(app.getHttpServer())
      .patch("/api/v1/admin/catalog/arbor-bed")
      .set("Authorization", "Bearer demo-catalog")
      .send({ published: false })
      .expect(200);
    expect(
      await db.auditLog.count({ where: { action: "listing.unpublished" } }),
    ).toBe(1);
    await request(app.getHttpServer())
      .get("/api/v1/products/arbor-bed")
      .expect(404);
  });
  it("preserves multi-site enquiry quantities and deduplicates receipts", async () => {
    const body = {
        name: "Demo User",
        company: "Demo Business",
        email: "demo@example.invalid",
        phone: "9999999999",
        mode: "rent",
        consent: true,
        sites: [
          { name: "Demo site A", pin: "201304", units: 2 },
          { name: "Demo site B", pin: "201301", units: 3 },
        ],
      },
      key = randomUUID();
    const first = await request(app.getHttpServer())
      .post("/api/v1/b2b/enquiries")
      .set("Idempotency-Key", key)
      .send(body)
      .expect(201);
    const again = await request(app.getHttpServer())
      .post("/api/v1/b2b/enquiries")
      .set("Idempotency-Key", key)
      .send(body)
      .expect(201);
    expect(first.body.id).toBe(again.body.id);
    expect(await db.businessEnquiry.count()).toBe(1);
    expect(
      (
        await db.businessEnquiry.findUniqueOrThrow({
          where: { id: first.body.id },
        })
      ).sites,
    ).toEqual(body.sites);
  });
});
