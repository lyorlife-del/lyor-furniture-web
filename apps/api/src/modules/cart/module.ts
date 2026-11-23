import { CartResponse } from "../../common/responses";
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
  Put,
} from "@nestjs/common";
import { ApiOperation, ApiTags, ApiOkResponse } from "@nestjs/swagger";
import { Database } from "../../common/database";
import { identity } from "../../common/auth";
import { CartDto } from "../../common/dto";
@Injectable()
export class CartService {
  constructor(private readonly db: Database) {}
  async withProductSummaries<T extends { city: string; lines: unknown }>(
    cart: T,
    db: Pick<Database, "product"> = this.db,
  ) {
    const lines = Array.isArray(cart.lines)
      ? (cart.lines as CartDto["lines"])
      : [];
    const ids = [...new Set(lines.map((line) => line.productId))];
    const products = ids.length
      ? await db.product.findMany({
          where: {
            id: { in: ids },
            active: true,
            published: true,
            companyId: "lyor-demo",
            cities: { has: cart.city },
          },
          select: {
            id: true,
            slug: true,
            name: true,
            image: true,
            monthlyPaise: true,
            purchasePaise: true,
          },
        })
      : [];
    return { ...cart, products };
  }
  async get(id: string, authorization?: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id))
      throw new BadRequestException("Invalid cart reference");
    const cart = await this.db.cart.findUnique({ where: { id } });
    if (
      !cart ||
      (cart.ownerId &&
        (!authorization || cart.ownerId !== identity(authorization).id))
    )
      throw new NotFoundException("Cart not found");
    return cart;
  }
  async save(input: CartDto, authorization?: string) {
    const ownerId = authorization ? identity(authorization).id : undefined;
    if (
      new Set(input.lines.map((line) => line.productId + ":" + line.mode))
        .size !== input.lines.length
    )
      throw new BadRequestException("Merge duplicate cart lines");
    const result = await this.db.$transaction(async (tx) => {
      const existing = await tx.cart.findUnique({
        where: { id: input.cartId },
      });
      if (existing && existing.ownerId && existing.ownerId !== ownerId)
        throw new NotFoundException("Cart not found");
      if (!existing) {
        if (input.revision !== 0)
          throw new ConflictException("Refresh this cart before saving");
        const created = await tx.cart.create({
          data: {
            id: input.cartId,
            city: input.city,
            ownerId,
            lines: input.lines.map((line) => ({ ...line })),
            revision: 1,
          },
        });
        return this.withProductSummaries(created, tx);
      }
      const changed = await tx.cart.updateMany({
        where: { id: input.cartId, revision: input.revision },
        data: {
          city: input.city,
          ownerId: existing.ownerId ?? ownerId,
          lines: input.lines.map((line) => ({ ...line })),
          revision: { increment: 1 },
        },
      });
      if (!changed.count)
        throw new ConflictException(
          "Cart changed in another tab. Refresh and try again.",
        );
      const updated = await tx.cart.findUniqueOrThrow({
        where: { id: input.cartId },
      });
      return this.withProductSummaries(updated, tx);
    });
    return { ...result, demo: true };
  }
}
@ApiTags("Cart")
@Controller("cart")
export class CartController {
  constructor(private readonly carts: CartService) {}
  @Get(":id")
  @ApiOperation({ operationId: "getCart" })
  @ApiOkResponse({ type: CartResponse })
  async get(
    @Param("id") id: string,
    @Headers("authorization") authorization?: string,
  ) {
    return this.carts.withProductSummaries(
      await this.carts.get(id, authorization),
    );
  }
  @Put()
  @ApiOperation({ operationId: "saveCart" })
  @ApiOkResponse({ type: CartResponse })
  async save(
    @Body() input: CartDto,
    @Headers("authorization") authorization?: string,
  ) {
    return this.carts.save(input, authorization);
  }
}
@Module({
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
