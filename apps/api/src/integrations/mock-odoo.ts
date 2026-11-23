import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Database } from "../common/database";
import { LineDto } from "../common/dto";
import { demandFor } from "../modules/pricing/domain";
// This adapter only touches the local demo DB. It never calls an external ERP.
export async function processDemoOrder(db: Database, orderId: string) {
  if (process.env.DEMO_ODOO_OUTAGE === "true")
    throw new Error("Simulated ERP outage");
  return db.$transaction(
    async (tx) => {
      const order = await tx.orderIntent.findUniqueOrThrow({
        where: { id: orderId },
      });
      if (order.externalId) return order;
      const products = await tx.product.findMany({
        where: { companyId: order.companyId },
      });
      const demand = demandFor(
        order.lines as unknown as LineDto[],
        products,
        order.city,
      );
      for (const [productId, quantity] of [...demand].sort(([a], [b]) =>
        a.localeCompare(b),
      )) {
        const changed = await tx.product.updateMany({
          where: {
            id: productId,
            companyId: order.companyId,
            active: true,
            published: true,
            stock: { gte: quantity },
          },
          data: { stock: { decrement: quantity } },
        });
        if (changed.count !== 1)
          throw new ConflictException("An item is no longer available");
        await tx.reservation.create({ data: { orderId, productId, quantity } });
      }
      await tx.auditLog.create({
        data: {
          actorId: "demo-worker",
          action: "order.demo_confirmed",
          entityId: orderId,
          detail: { authoritativeSystem: "local-demo-only" },
        },
      });
      return tx.orderIntent.update({
        where: { id: orderId },
        data: {
          externalId: "DEMO-" + orderId,
          orderState: "confirmed_demo",
          stockState: "reserved_demo",
          failureReason: null,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
