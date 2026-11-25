import {
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminGuard, Identity, StaffGuard } from "../../common/auth";
import { Database } from "../../common/database";
import { PublishDto } from "../../common/dto";
@Injectable()
export class AdminService {
  constructor(private readonly db: Database) {}
  catalog() {
    return this.db.product.findMany({
      where: { companyId: "lyor-demo" },
      orderBy: { name: "asc" },
    });
  }
  async publish(id: string, published: boolean, actorId: string) {
    return this.db.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id, companyId: "lyor-demo" },
      });
      if (!product) throw new NotFoundException("Listing not found");
      if (published && !product.active)
        throw new ConflictException("Inactive SKUs cannot be published");
      const updated = await tx.product.update({
        where: { id },
        data: { published },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: published ? "listing.published" : "listing.unpublished",
          entityId: id,
          detail: { previous: product.published, published },
        },
      });
      return updated;
    });
  }
  exceptions() {
    return this.db.outboxEvent.findMany({
      where: { status: { in: ["failed", "pending", "queued"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
  async replay(id: string, actorId: string) {
    return this.db.$transaction(async (tx) => {
      const event = await tx.outboxEvent.findFirst({
        where: { id, status: "failed" },
      });
      if (!event)
        throw new ConflictException("Only failed events can be replayed");
      const order = await tx.orderIntent.findUniqueOrThrow({
        where: { id: event.orderId },
        select: { id: true, externalId: true },
      });
      if (
        event.lastError?.startsWith("Manual reconciliation required:") ||
        (order.externalId !== null && order.externalId !== "DEMO-" + order.id)
      )
        throw new ConflictException(
          "Resolve manual reconciliation before requesting replay",
        );
      await tx.orderIntent.update({
        where: { id: event.orderId },
        data: { orderState: "pending", failureReason: null },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "integration.replay",
          entityId: id,
          detail: { previousAttempts: event.attempts },
        },
      });
      return tx.outboxEvent.update({
        where: { id },
        data: {
          status: "pending",
          availableAt: new Date(),
          leaseUntil: null,
          lastError: null,
          attempts: 0,
        },
      });
    });
  }
}
@ApiTags("Admin")
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}
  @Get("catalog")
  @UseGuards(StaffGuard)
  @ApiOperation({ operationId: "adminCatalog" })
  catalog() {
    return this.admin.catalog();
  }
  @Patch("catalog/:id")
  @UseGuards(StaffGuard)
  @ApiOperation({ operationId: "publishListing" })
  publish(
    @Param("id") id: string,
    @Body() body: PublishDto,
    @Req() req: { identity: Identity },
  ) {
    return this.admin.publish(id, body.published, req.identity.id);
  }
  @Get("exceptions")
  @UseGuards(AdminGuard)
  @ApiOperation({ operationId: "integrationExceptions" })
  exceptions() {
    return this.admin.exceptions();
  }
  @Post("exceptions/:id/replay")
  @UseGuards(AdminGuard)
  @ApiOperation({ operationId: "replayException" })
  replay(@Param("id") id: string, @Req() req: { identity: Identity }) {
    return this.admin.replay(id, req.identity.id);
  }
}
@Module({ controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
