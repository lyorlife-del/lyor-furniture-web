import { ServiceabilityResponse } from "../../common/responses";
import {
  BadRequestException,
  Controller,
  Get,
  Injectable,
  Module,
  Query,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiOkResponse,
} from "@nestjs/swagger";
export const demoPins = [
  "201301",
  "201302",
  "201303",
  "201304",
  "201305",
  "201306",
  "201307",
  "201309",
  "201310",
];
@Injectable()
export class ServiceabilityService {
  check(pin: string) {
    if (!/^\d{6}$/.test(pin))
      throw new BadRequestException("Enter a six-digit PIN");
    return {
      pin,
      city: "noida",
      deliverable: demoPins.includes(pin),
      demo: true,
      message: demoPins.includes(pin)
        ? "Covered by the synthetic Noida demo zone."
        : "This area is outside our demo coverage. Send an enquiry.",
    };
  }
}
@ApiTags("Serviceability")
@Controller()
export class ServiceabilityController {
  constructor(private readonly zones: ServiceabilityService) {}
  @Get("cities") @ApiOperation({ operationId: "listCities" }) cities() {
    return [{ id: "noida", name: "Noida", demo: true }];
  }
  @Get("serviceability")
  @ApiOperation({ operationId: "checkServiceability" })
  @ApiOkResponse({ type: ServiceabilityResponse })
  @ApiQuery({ name: "pin", type: String })
  check(@Query("pin") pin: string) {
    return this.zones.check(pin);
  }
}
@Module({
  controllers: [ServiceabilityController],
  providers: [ServiceabilityService],
  exports: [ServiceabilityService],
})
export class ServiceabilityModule {}
