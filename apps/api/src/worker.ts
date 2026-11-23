import "./common/config";
import { Database } from "./common/database";
import { validateEnvironment } from "./common/config";
import { processDemoOrder } from "./integrations/mock-odoo";
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { createServer } from "node:http";
validateEnvironment();
const db = new Database();
const connection = new Redis(
  process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  { maxRetriesPerRequest: null },
);
connection.on("error", (error) =>
  console.error("Redis connection unavailable:", error.message),
);
const queue = new Queue("lyor-orders", { connection });
const worker = new Worker(
  "lyor-orders",
  async (job) => {
    const event = await db.outboxEvent.findUnique({
      where: { id: job.data.eventId },
    });
    if (!event || event.status === "done") return;
    try {
      await processDemoOrder(db, event.orderId);
      await db.outboxEvent.update({
        where: { id: event.id },
        data: { status: "done", lastError: null, leaseUntil: null },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Integration failed";
      await db.$transaction([
        db.outboxEvent.update({
          where: { id: event.id },
          data: { attempts: { increment: 1 }, lastError: message },
        }),
        db.orderIntent.update({
          where: { id: event.orderId },
          data: { attempts: { increment: 1 }, failureReason: message },
        }),
      ]);
      throw error;
    }
  },
  { connection, concurrency: 2 },
);
worker.on("error", (error) => console.error("Worker error:", error.message));
worker.on("failed", async (job, error) => {
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    await db.outboxEvent.update({
      where: { id: job.data.eventId },
      data: { status: "failed", lastError: error.message, leaseUntil: null },
    });
    await db.orderIntent.updateMany({
      where: { id: job.data.orderId, externalId: null },
      data: { orderState: "failed" },
    });
  }
});
let dispatching = false,
  shuttingDown = false;
async function dispatch() {
  if (dispatching || shuttingDown) return;
  dispatching = true;
  try {
    const events = await db.outboxEvent.findMany({
      where: {
        status: { in: ["pending", "queued"] },
        availableAt: { lte: new Date() },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
      },
      take: 25,
      orderBy: { createdAt: "asc" },
    });
    for (const event of events) {
      const claim = await db.outboxEvent.updateMany({
        where: {
          id: event.id,
          status: { in: ["pending", "queued"] },
          OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
        },
        data: { leaseUntil: new Date(Date.now() + 60_000) },
      });
      if (!claim.count) continue;
      const existing = await queue.getJob(event.id);
      if (existing) {
        const state = await existing.getState();
        if (state === "completed" || state === "failed")
          await existing.remove();
        else continue;
      }
      await queue.add(
        "create-demo-order",
        { eventId: event.id, orderId: event.orderId },
        {
          jobId: event.id,
          attempts: 5,
          backoff: { type: "exponential", delay: 1500 },
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
      await db.outboxEvent.updateMany({
        where: { id: event.id, status: { notIn: ["done", "failed"] } },
        data: { status: "queued" },
      });
    }
  } catch (error) {
    console.error(
      "Dispatcher unavailable:",
      error instanceof Error ? error.message : "unknown error",
    );
  } finally {
    dispatching = false;
  }
}
const timer = setInterval(() => {
  void dispatch();
}, 2000);
void dispatch();
const health = createServer((_req, res) => {
  res.writeHead(shuttingDown ? 503 : 200, {
    "Content-Type": "application/json",
  });
  res.end(
    JSON.stringify({
      service: "lyor-worker",
      demo: true,
      redis: connection.status === "ready",
    }),
  );
});
health.listen(Number(process.env.WORKER_PORT ?? 4001), "127.0.0.1");
async function close() {
  shuttingDown = true;
  clearInterval(timer);
  health.close();
  while (dispatching) await new Promise((resolve) => setTimeout(resolve, 50));
  await worker.close();
  await queue.close();
  await connection.quit();
  await db.$disconnect();
}
process.once("SIGINT", () => {
  void close();
});
process.once("SIGTERM", () => {
  void close();
});
