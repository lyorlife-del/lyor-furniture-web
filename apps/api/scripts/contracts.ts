import "../src/common/config";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createApplication } from "../src/bootstrap";
async function generate() {
  const { app, document } = await createApplication(false);
  const destination = resolve(process.cwd(), "../../packages/api-contracts");
  await mkdir(destination + "/src", { recursive: true });
  await writeFile(
    destination + "/openapi.json",
    JSON.stringify(document, null, 2) + "\n",
  );
  await app.close();
}
generate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
