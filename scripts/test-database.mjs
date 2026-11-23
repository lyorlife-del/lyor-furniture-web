import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
const databaseDir = resolve(".data/test-postgres");
mkdirSync(databaseDir, { recursive: true });
const pg = new EmbeddedPostgres({
  databaseDir,
  user: "lyor_test",
  password: "local_test_only",
  port: 5433,
  persistent: true,
  autoRehydrateSymlinks: true,
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: (message) => console.error(String(message)),
});
const name = "lyor_test_" + Date.now();
if (!/^lyor_test_[0-9]+$/.test(name))
  throw new Error("Invalid isolated test database name");
try {
  if (!existsSync(resolve(databaseDir, "PG_VERSION"))) await pg.initialise();
  await pg.start();
  await pg.createDatabase(name);
  const env = {
    ...process.env,
    DATABASE_URL:
      "postgresql://lyor_test:local_test_only@127.0.0.1:5433/" +
      name +
      "?schema=public",
    NODE_ENV: "test",
    DEMO_MODE: "true",
    QUOTE_SECRET: "isolated-test-quote-secret-at-least-32-characters",
    RUN_DB_TESTS: "true",
  };
  execFileSync(
    process.execPath,
    [
      resolve("node_modules/prisma/build/index.js"),
      "migrate",
      "deploy",
      "--schema",
      "apps/api/prisma/schema.prisma",
    ],
    { env, stdio: "inherit" },
  );
  execFileSync(
    process.execPath,
    [
      resolve("node_modules/jest/bin/jest.js"),
      "--config",
      "apps/api/jest.config.cjs",
      "--runInBand",
    ],
    { env, stdio: "inherit" },
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pg.stop().catch(() => {});
}
