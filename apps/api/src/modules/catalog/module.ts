import { CatalogResponse, ProductResponse } from "../../common/responses";
import {
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Query,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiHeader,
} from "@nestjs/swagger";
import { Database } from "../../common/database";
import { CatalogQuery } from "../../common/dto";
@Injectable()
export class CatalogService {
  constructor(private readonly db: Database) {}
  async list(query: CatalogQuery) {
    const page = query.page ?? 1,
      city = query.city ?? "noida";
    const price = query.mode === "buy" ? "purchasePaise" : "monthlyPaise";
    const where = {
      active: true,
      published: true,
      companyId: "lyor-demo",
      cities: { has: city },
      ...(query.mode === "buy" ? { purchasePaise: { gt: 0 } } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" as const } },
              {
                description: {
                  contains: query.q,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };
    const orderBy =
      query.sort === "price-asc"
        ? { [price]: "asc" as const }
        : query.sort === "price-desc"
          ? { [price]: "desc" as const }
          : query.sort === "newest"
            ? { createdAt: "desc" as const }
            : { featured: "desc" as const };
    const [items, total] = await Promise.all([
      this.db.product.findMany({
        where,
        orderBy: [orderBy, { id: "asc" }],
        skip: (page - 1) * 8,
        take: 8,
      }),
      this.db.product.count({ where }),
    ]);
    return {
      items: items.map(publicProduct),
      total,
      page,
      pageSize: 8,
      demo: true,
    };
  }
  async find(slug: string) {
    const product = await this.db.product.findFirst({
      where: { slug, active: true, published: true, companyId: "lyor-demo" },
    });
    if (!product) throw new NotFoundException("This listing is unavailable");
    return publicProduct(product);
  }
}
export function publicProduct<
  T extends {
    stock: number;
    sku: string;
    companyId: string;
    active: boolean;
    published: boolean;
  },
>(product: T) {
  const { stock, sku, companyId, active, published, ...safe } = product;
  void sku;
  void companyId;
  void active;
  void published;
  return { ...safe, available: stock > 0, demo: true };
}
@ApiTags("Catalog")
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get("catalog")
  @ApiOperation({ operationId: "listCatalog" })
  @ApiOkResponse({ type: CatalogResponse })
  list(@Query() query: CatalogQuery) {
    return this.catalog.list(query);
  }
  @Get("products/:slug")
  @ApiOperation({ operationId: "getProduct" })
  @ApiOkResponse({ type: ProductResponse })
  find(@Param("slug") slug: string) {
    return this.catalog.find(slug);
  }
  @Get("bundles")
  @ApiOperation({ operationId: "listBundles" })
  @ApiOkResponse({ type: CatalogResponse })
  bundles() {
    return this.catalog.list({ category: "bundles" });
  }
}
@Module({
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
