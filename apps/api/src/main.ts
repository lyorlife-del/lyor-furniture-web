import "./common/config";
import { validateEnvironment } from "./common/config";
import { createApplication } from "./bootstrap";
async function main() {
  validateEnvironment();
  const { app } = await createApplication();
  await app.listen(
    Number(process.env.API_PORT ?? 4000),
    process.env.API_HOST ?? "127.0.0.1",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
