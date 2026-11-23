import { QuoteResponse } from "../../common/responses";
import {
  Body,
  ConflictException,
  Controller,
  Headers,
  Injectable,
  Module,
  Post,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiHeader,
} from "@nestjs/swagger";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { Database } from "../../common/database";
import { LineDto, QuoteDto } from "../../common/dto";
import { CartModule, CartService } from "../cart/module";
import {
  ServiceabilityModule,
  ServiceabilityService,
} from "../serviceability/module";
import { priceLines, quotePayload, sign } from "./domain";
@Injectable()
export class PricingService {
  constructor(
    private readonly db: Database,
    private readonly carts: CartService,
    private readonly zones: ServiceabilityService,
  ) {}
  async create(input: QuoteDto, authorization?: string) {
    const cart = await this.carts.get(input.cartId, authorization);
    if (!this.zones.check(input.pin).deliverable || cart.city !== "noida")
      throw new ConflictException("This PIN is outside the demo service zone");
    const products = await this.db.product.findMany({
      where: { companyId: "lyor-demo" },
    });
    const priced = priceLines(
      cart.lines as unknown as LineDto[],
      products,
      cart.city,
    );
    const payload = quotePayload({
      id: randomUUID(),
      cartId: cart.id,
      cartRevision: cart.revision,
      ownerId: cart.ownerId,
      city: cart.city,
      pin: input.pin,
      ...priced,
      expiresAt: new Date(Date.now() + 15 * 60_000),
    });
    const quote = await this.db.quote.create({
      data: {
        ...payload,
        lines: payload.lines as unknown as Prisma.InputJsonValue,
        breakdown: payload.breakdown as Prisma.InputJsonValue,
        signature: sign(payload),
      },
    });
    return { ...quote, demo: true };
  }
}
@ApiTags("Pricing")
@Controller("quotes")
export class PricingController {
  constructor(private readonly pricing: PricingService) {}
  @Post()
  @ApiOperation({ operationId: "createQuote" })
  @ApiCreatedResponse({ type: QuoteResponse })
  create(
    @Body() input: QuoteDto,
    @Headers("authorization") authorization?: string,
  ) {
    return this.pricing.create(input, authorization);
  }
}
@Module({
  imports: [CartModule, ServiceabilityModule],
  controllers: [PricingController],
  providers: [PricingService],
})
export class PricingModule {}
