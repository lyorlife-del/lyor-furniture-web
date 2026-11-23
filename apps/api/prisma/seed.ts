import "../src/common/config";
import { PrismaClient } from "@prisma/client";
import { demoProducts } from "../src/modules/catalog/fixtures";
const db = new PrismaClient();
async function seed() {
  for (const product of demoProducts)
    await db.product.upsert({
      where: { id: product.id },
      update: {},
      create: product,
    });
  console.log("Synthetic LYOR catalog seeded; existing records preserved.");
}
seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
