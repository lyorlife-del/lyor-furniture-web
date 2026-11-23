import { OrderResponse } from "../../common/responses";
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiHeader,
} from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { Database } from "../../common/database";
import { Identity, IdentityGuard } from "../../common/auth";
import { CheckoutDto, LineDto } from "../../common/dto";
import {
  hash,
  priceLines,
  quotePayload,
  validSignature,
} from "../pricing/domain";
@Injectable()
export class OrderService {
  constructor(private readonly db: Database) {}
  async create(ownerId: string, key: string, input: CheckoutDto) {
    if (!/^[0-9a-f-]{36}$/i.test(key ?? ""))
      throw new BadRequestException("A UUID Idempotency-Key is required");
    if (!input.consent)
      throw new BadRequestException("Accept the demo terms to continue");
    const requestHash = hash(input);
    const prior = await this.db.orderIntent.findUnique({
      where: { ownerId_idempotencyKey: { ownerId, idempotencyKey: key } },
    });
    if (prior) {
      if (prior.requestHash !== requestHash)
        throw new ConflictException(
          "This submission key was used for a different request",
        );
      return { ...prior, demo: true };
    }
    try {
      const result = await this.db.$transaction(
        async (tx) => {
          const quote = await tx.quote.findUnique({
            where: { id: input.quoteId },
          });
          if (!quote || quote.ownerId !== ownerId)
            throw new NotFoundException("Quote not found");
          if (quote.expiresAt.getTime() <= Date.now())
            throw new ConflictException(
              "Quote expired. Refresh the quote and accept the new total.",
            );
          if (
            quote.signature !== input.signature ||
            !validSignature(quotePayload(quote), input.signature)
          )
            throw new ConflictException("Quote could not be verified");
          if (input.address.pin !== quote.pin)
            throw new ConflictException(
              "Address PIN changed. Request a new quote.",
            );
          const cart = await tx.cart.findUnique({
            where: { id: quote.cartId },
          });
          if (
            !cart ||
            cart.ownerId !== ownerId ||
            cart.revision !== quote.cartRevision
          )
            throw new ConflictException("Cart changed. Refresh your quote.");
          const current = priceLines(
            quote.lines as unknown as LineDto[],
            await tx.product.findMany({ where: { companyId: "lyor-demo" } }),
            quote.city,
          );
          if (hash(current.breakdown) !== hash(quote.breakdown))
            throw new ConflictException("Pricing changed. Refresh your quote.");
          const order = await tx.orderIntent.create({
            data: {
              ownerId,
              idempotencyKey: key,
              requestHash,
              quoteId: quote.id,
              city: quote.city,
              address: { ...input.address },
              lines: quote.lines as Prisma.InputJsonValue,
              breakdown: quote.breakdown as Prisma.InputJsonValue,
            },
          });
          await tx.outboxEvent.create({ data: { orderId: order.id } });
          await tx.auditLog.create({
            data: {
              actorId: ownerId,
              action: "order.requested",
              entityId: order.id,
              detail: { demo: true },
            },
          });
          return order;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return { ...result, demo: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2034"].includes(error.code)
      ) {
        const existing = await this.db.orderIntent.findUnique({
          where: { ownerId_idempotencyKey: { ownerId, idempotencyKey: key } },
        });
        if (existing && existing.requestHash === requestHash)
          return { ...existing, demo: true };
        throw new ConflictException(
          "Order or cart changed. Refresh before trying again.",
        );
      }
      throw error;
    }
  }
  list(ownerId: string) {
    return this.db.orderIntent.findMany({
      where: { ownerId, companyId: "lyor-demo" },
      orderBy: { createdAt: "desc" },
    });
  }
  async find(ownerId: string, id: string) {
    const order = await this.db.orderIntent.findFirst({
      where: { id, ownerId, companyId: "lyor-demo" },
    });
    if (!order) throw new NotFoundException("Order not found");
    return { ...order, demo: true };
  }
}
@ApiTags("Orders")
@UseGuards(IdentityGuard)
@Controller()
export class OrderController {
  constructor(private readonly orders: OrderService) {}
  @Post("orders")
  @ApiOperation({ operationId: "createOrder" })
  @ApiCreatedResponse({ type: OrderResponse })
  @ApiHeader({
    name: "Idempotency-Key",
    required: true,
    schema: { type: "string", format: "uuid" },
  })
  create(
    @Req() req: { identity: Identity },
    @Headers("idempotency-key") key: string,
    @Body() input: CheckoutDto,
  ) {
    return this.orders.create(req.identity.id, key, input);
  }
  @Get("me/orders")
  @ApiOperation({ operationId: "listMyOrders" })
  @ApiOkResponse({ type: [OrderResponse] })
  list(@Req() req: { identity: Identity }) {
    return this.orders.list(req.identity.id);
  }
  @Get("me/orders/:id")
  @ApiOperation({ operationId: "getMyOrder" })
  @ApiOkResponse({ type: OrderResponse })
  find(@Req() req: { identity: Identity }, @Param("id") id: string) {
    return this.orders.find(req.identity.id, id);
  }
}
@Module({
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
