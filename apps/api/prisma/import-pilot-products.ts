import "../src/common/config";
import { PrismaClient } from "@prisma/client";
import pilotProducts from "./pilot-products.json";

const categories: Record<string, string> = {
  Bedroom: "bedroom",
  Dining: "dining",
  Living: "living",
  Accessories: "accessories",
  Storage: "storage",
};

async function importPilotProducts() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (
    url.protocol !== "postgresql:" ||
    url.hostname !== "127.0.0.1" ||
    url.port !== "5432" ||
    url.pathname !== "/lyor" ||
    url.username !== "lyor" ||
    (url.searchParams.get("schema") ?? "public") !== "public" ||
    process.env.DEMO_MODE !== "true" ||
    process.env.NODE_ENV !== "development"
  ) {
    throw new Error("This import requires the local LYOR demo database.");
  }

  const db = new PrismaClient();
  try {
    const products = await db.$transaction(async (tx) => {
      const results = [];
      for (const row of pilotProducts) {
        const id = "pilot-" + row.sku.toLowerCase();
        const existing = await tx.product.findUnique({
          where: { sku: row.sku },
        });
        if (
          existing &&
          (existing.id !== id || existing.companyId !== "lyor-demo")
        ) {
          throw new Error("SKU already belongs to another listing: " + row.sku);
        }
        const data = {
          name: row.name + " (" + row.tier + ")",
          category: categories[row.category],
          description:
            row.designCount +
            (row.designCount === 1 ? " design option" : " design options") +
            " in the pilot price list.",
          monthlyPaise: row.monthlyPaise,
        };
        results.push(
          await tx.product.upsert({
            where: { sku: row.sku },
            create: {
              ...data,
              id,
              slug: id,
              sku: row.sku,
              companyId: "lyor-demo",
              image: "",
              images: [],
              material: "",
              dimensions: "",
              color: "",
              stock: 0,
              purchasePaise: 0,
              cities: ["noida"],
              components: [],
              variants: [
                { id: "standard", name: row.tier, monthlyDeltaPaise: 0 },
              ],
            },
            update: data,
            select: { sku: true, monthlyPaise: true },
          }),
        );
      }
      return results;
    });
    console.log("Verified " + products.length + " local pilot product rates.");
  } finally {
    await db.$disconnect();
  }
}

importPilotProducts().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
