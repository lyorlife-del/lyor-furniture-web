import { EnquiryResponse } from "../../common/responses";
import {
  BadRequestException,
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
import { Prisma } from "@prisma/client";
import { Database } from "../../common/database";
import { EnquiryDto } from "../../common/dto";
import { hash } from "../pricing/domain";
@Injectable()
export class BusinessService {
  constructor(private readonly db: Database) {}
  async create(key: string, input: EnquiryDto) {
    if (!/^[0-9a-f-]{36}$/i.test(key ?? "") || !input.consent)
      throw new BadRequestException("Submission key and consent are required");
    const requestHash = hash(input);
    const prior = await this.db.businessEnquiry.findUnique({
      where: { idempotencyKey: key },
    });
    if (prior) {
      if (prior.requestHash !== requestHash)
        throw new ConflictException(
          "Submission changed. Use a new submission key.",
        );
      return { id: prior.id, status: prior.status, demo: true };
    }
    const { sites, mode, consent, ...contact } = input;
    void consent;
    try {
      const saved = await this.db.businessEnquiry.create({
        data: {
          idempotencyKey: key,
          requestHash,
          contact,
          sites: sites.map((site) => ({ ...site })),
          mode,
        },
      });
      return {
        id: saved.id,
        status: saved.status,
        demo: true,
        message:
          "Demo enquiry saved locally. No sales team has been contacted.",
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const saved = await this.db.businessEnquiry.findUniqueOrThrow({
          where: { idempotencyKey: key },
        });
        if (saved.requestHash !== requestHash)
          throw new ConflictException("Submission key conflict");
        return { id: saved.id, status: saved.status, demo: true };
      }
      throw error;
    }
  }
}
@ApiTags("Business")
@Controller("b2b/enquiries")
export class BusinessController {
  constructor(private readonly business: BusinessService) {}
  @Post()
  @ApiOperation({ operationId: "createBusinessEnquiry" })
  @ApiCreatedResponse({ type: EnquiryResponse })
  @ApiHeader({
    name: "Idempotency-Key",
    required: true,
    schema: { type: "string", format: "uuid" },
  })
  create(@Headers("idempotency-key") key: string, @Body() input: EnquiryDto) {
    return this.business.create(key, input);
  }
}
@Module({ controllers: [BusinessController], providers: [BusinessService] })
export class BusinessModule {}
