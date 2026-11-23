import {
  Controller,
  Get,
  Module,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Database, DatabaseModule } from "./common/database";
import { AuthenticationModule } from "./common/auth";
import { CatalogModule } from "./modules/catalog/module";
import { ServiceabilityModule } from "./modules/serviceability/module";
import { CartModule } from "./modules/cart/module";
import { PricingModule } from "./modules/pricing/module";
import { OrderModule } from "./modules/orders/module";
import { BusinessModule } from "./modules/business/module";
import { AdminModule } from "./modules/admin/module";
@ApiTags("Health")
@Controller("health")
class HealthController {
  constructor(private readonly db: Database) {}
  @Get() @ApiOperation({ operationId: "health" }) live() {
    return { status: "ok", service: "lyor-api", demo: true };
  }
  @Get("ready") @ApiOperation({ operationId: "readiness" }) async ready() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { status: "ready" };
    } catch {
      throw new ServiceUnavailableException("Database is unavailable");
    }
  }
}
@Module({
  imports: [
    DatabaseModule,
    AuthenticationModule,
    CatalogModule,
    ServiceabilityModule,
    CartModule,
    PricingModule,
    OrderModule,
    BusinessModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
