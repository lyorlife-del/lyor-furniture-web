import { Queue } from "bullmq";
import Redis from "ioredis";
import pg from "pg";

// Legacy timestamps are stored without a zone and represent UTC.
pg.types.setTypeParser(
  1114,
  (value) => new Date(value.replace(" ", "T") + "Z"),
);

const dbUrl = new URL(process.env.LYOR_RECONCILE_DB_URL ?? "");
const redisUrl = new URL(process.env.LYOR_RECONCILE_REDIS_URL ?? "");
if (
  dbUrl.protocol !== "postgresql:" ||
  dbUrl.hostname !== "127.0.0.1" ||
  dbUrl.port !== "5433" ||
  dbUrl.username !== "lyor_test" ||
  !/^\/lyor_test_[a-z0-9_]+$/.test(dbUrl.pathname) ||
  dbUrl.search ||
  dbUrl.hash ||
  redisUrl.protocol !== "redis:" ||
  redisUrl.hostname !== "127.0.0.1" ||
  !redisUrl.port ||
  redisUrl.search ||
  redisUrl.hash ||
  !/^\/[0-9]+$/.test(redisUrl.pathname)
) {
  throw new Error("Use isolated loopback PostgreSQL and Redis URLs");
}

const connection = new Redis(redisUrl.href, { maxRetriesPerRequest: 1 });
const queue = new Queue("lyor-orders", { connection });
const db = new pg.Client({ connectionString: dbUrl.href });
const states = [
  "active",
  "delayed",
  "failed",
  "completed",
  "prioritized",
  "paused",
  "wait",
  "waiting-children",
];
const manual = "Manual reconciliation required:";

async function snapshotJobs() {
  const result = new Map();
  for (const state of states) {
    for (const job of await queue.getJobs([state])) {
      if (result.has(job.id)) continue;
      const score =
        state === "delayed"
          ? await connection.zscore(queue.toKey("delayed"), job.id)
          : null;
      result.set(job.id, {
        jobId: job.id,
        eventId: job.data?.eventId ?? null,
        orderId: job.data?.orderId ?? null,
        state: state === "delayed" && job.attemptsMade > 0 ? "retrying" : state,
        attempts: job.attemptsMade,
        // The locked BullMQ version uses 12 low bits as a tie-breaker.
        dueAt:
          score === null
            ? null
            : new Date(Math.floor(Number(score) / 4096)).toISOString(),
      });
    }
  }
  return [...result.values()].sort((a, b) => a.jobId.localeCompare(b.jobId));
}

function disposition(event, job) {
  if (
    !event ||
    (job && (job.jobId !== event.id || job.orderId !== event.orderId))
  ) {
    return "investigate-unmatched-job";
  }
  if (job?.state === "active") return "drain-active-job";
  if (event.lastError?.startsWith(manual)) return "resolve-manual-review";
  if (event.status === "done") return "retain-completed";
  if (event.externalId || event.reservations || event.audit) {
    return "resolve-existing-order-evidence";
  }
  if (event.status === "failed") return "retain-failure-for-audited-replay";
  if (job && ["failed", "completed", "waiting-children"].includes(job.state)) {
    return "resolve-queue-outbox-disagreement";
  }
  if (
    !["pending", "queued"].includes(event.status) ||
    Math.max(event.attempts, job?.attempts ?? 0) >= 5
  ) {
    return "resolve-unsupported-state-or-exhausted-retry";
  }
  if (["delayed", "retrying"].includes(job?.state) && !job.dueAt) {
    return "resolve-missing-due-time";
  }
  return "transfer-after-approval";
}

try {
  await db.connect();
  await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const pausedBefore = await queue.isPaused();
  const jobs = await snapshotJobs();
  const { rows } = await db.query(`
    SELECT e.*, o."externalId",
      EXISTS (SELECT 1 FROM "Reservation" r WHERE r."orderId"=e."orderId") AS reservations,
      EXISTS (SELECT 1 FROM "AuditLog" a WHERE a."entityId"=e."orderId"
        AND a.action='order.demo_confirmed') AS audit
    FROM "OutboxEvent" e JOIN "OrderIntent" o ON o.id=e."orderId"
    ORDER BY e.id
  `);
  const byId = new Map(rows.map((event) => [event.id, event]));
  const covered = new Set();
  const report = [];
  function record(event, job) {
    const action = disposition(event, job);
    const due = [event?.availableAt?.toISOString(), job?.dueAt]
      .filter(Boolean)
      .sort()
      .at(-1);
    report.push({
      eventId: event?.id ?? job.eventId,
      jobId: job?.jobId ?? null,
      state: job?.state ?? "outbox-only",
      disposition: action,
      ...(action === "transfer-after-approval"
        ? {
            availableAt: due,
            attempts: Math.max(event.attempts, job?.attempts ?? 0),
          }
        : {}),
    });
  }
  for (const job of jobs) {
    const event = byId.get(job.eventId);
    if (event) covered.add(event.id);
    record(event, job);
  }
  for (const event of rows) if (!covered.has(event.id)) record(event);
  const stable = JSON.stringify(jobs) === JSON.stringify(await snapshotJobs());
  const paused = pausedBefore && (await queue.isPaused());
  const blockers = report.filter(
    (item) =>
      item.disposition.startsWith("resolve-") ||
      item.disposition.startsWith("investigate-") ||
      item.disposition === "drain-active-job",
  ).length;
  await db.query("COMMIT");
  const readyForReview = paused && stable && blockers === 0;
  console.log(
    JSON.stringify(
      { paused, stable, blockers, readyForReview, report },
      null,
      2,
    ),
  );
  if (!readyForReview) process.exitCode = 2;
} catch (error) {
  console.error("BullMQ reconciliation report failed:", error.name);
  process.exitCode = 1;
} finally {
  await Promise.allSettled([queue.close(), db.end()]);
  connection.disconnect();
}
