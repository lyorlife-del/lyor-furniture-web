import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
const databaseDir = resolve(".data/postgres");
mkdirSync(databaseDir, { recursive: true });
const pg = new EmbeddedPostgres({
  databaseDir,
  user: "lyor",
  password: "lyor_local_only",
  port: 5432,
  persistent: true,
  autoRehydrateSymlinks: true,
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: (message) => console.error(String(message)),
});
if (!existsSync(resolve(databaseDir, "PG_VERSION"))) await pg.initialise();
await pg.start();
const client = pg.getPgClient("postgres", "127.0.0.1");
await client.connect();
if (
  !(
    await client.query("SELECT 1 FROM pg_database WHERE datname = $1", ["lyor"])
  ).rowCount
)
  await client.query('CREATE DATABASE "lyor"');
await client.end();
console.log(
  "Local demo PostgreSQL ready at 127.0.0.1:5432. Data remains in ignored .data/postgres. Ctrl+C stops it.",
);
const timer = setInterval(() => {}, 30000);
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  clearInterval(timer);
  await pg.stop();
}
process.once("SIGINT", () => {
  void close();
});
process.once("SIGTERM", () => {
  void close();
});
