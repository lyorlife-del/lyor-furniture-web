import { ApiProperty } from "@nestjs/swagger";
import { AddressDto, LineDto } from "./dto";
export class VariantResponse {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: Number }) monthlyDeltaPaise!: number;
}
export class ComponentResponse {
  @ApiProperty({ type: String }) productId!: string;
  @ApiProperty({ type: Number }) quantity!: number;
}
export class ProductResponse {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) slug!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String }) category!: string;
  @ApiProperty({ type: String }) description!: string;
  @ApiProperty({ type: String }) image!: string;
  @ApiProperty({ type: [String] }) images!: string[];
  @ApiProperty({ type: String }) material!: string;
  @ApiProperty({ type: String }) dimensions!: string;
  @ApiProperty({ type: String }) color!: string;
  @ApiProperty({ type: Number }) monthlyPaise!: number;
  @ApiProperty({ type: Number }) purchasePaise!: number;
  @ApiProperty({ type: Number }) depositPaise!: number;
  @ApiProperty({ type: Boolean }) available!: boolean;
  @ApiProperty({ type: [String] }) cities!: string[];
  @ApiProperty({ type: [VariantResponse] }) variants!: VariantResponse[];
  @ApiProperty({ type: [ComponentResponse] }) components!: ComponentResponse[];
  @ApiProperty({ type: Boolean }) featured!: boolean;
  @ApiProperty({ type: Boolean }) demo!: boolean;
}
export class CatalogResponse {
  @ApiProperty({ type: [ProductResponse] }) items!: ProductResponse[];
  @ApiProperty({ type: Number }) total!: number;
  @ApiProperty({ type: Number }) page!: number;
  @ApiProperty({ type: Number }) pageSize!: number;
  @ApiProperty({ type: Boolean }) demo!: boolean;
}
export class BreakdownResponse {
  @ApiProperty({ type: Number }) subtotalPaise!: number;
  @ApiProperty({ type: Number }) depositPaise!: number;
  @ApiProperty({ type: Number }) deliveryPaise!: number;
  @ApiProperty({ type: Number }) gstPaise!: number;
  @ApiProperty({ type: Number }) totalPaise!: number;
  @ApiProperty({ type: String }) currency!: string;
  @ApiProperty({ type: String }) taxLabel!: string;
}
export class CartProductResponse {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) slug!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String }) image!: string;
  @ApiProperty({ type: Number }) monthlyPaise!: number;
  @ApiProperty({ type: Number }) purchasePaise!: number;
}
export class CartResponse {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String, nullable: true }) ownerId!: string | null;
  @ApiProperty({ type: String }) city!: string;
  @ApiProperty({ type: [LineDto] }) lines!: LineDto[];
  @ApiProperty({ type: [CartProductResponse] })
  products!: CartProductResponse[];
  @ApiProperty({ type: Number }) revision!: number;
  @ApiProperty({ type: String }) createdAt!: string;
  @ApiProperty({ type: String }) updatedAt!: string;
}
export class PricedLineResponse {
  @ApiProperty({ type: String }) productId!: string;
  @ApiProperty({ type: String, enum: ["rent", "buy"] }) mode!: "rent" | "buy";
  @ApiProperty({ type: Number }) quantity!: number;
  @ApiProperty({ type: String }) variantId!: string;
  @ApiProperty({ type: Number }) tenure!: number;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: Number }) unitPaise!: number;
  @ApiProperty({ type: Number }) totalPaise!: number;
  @ApiProperty({ type: Number }) depositPaise!: number;
}
export class QuoteResponse {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) cartId!: string;
  @ApiProperty({ type: Number }) cartRevision!: number;
  @ApiProperty({ type: String, nullable: true }) ownerId!: string | null;
  @ApiProperty({ type: String }) city!: string;
  @ApiProperty({ type: String }) pin!: string;
  @ApiProperty({ type: [PricedLineResponse] }) lines!: PricedLineResponse[];
  @ApiProperty({ type: BreakdownResponse }) breakdown!: BreakdownResponse;
  @ApiProperty({ type: String }) policyVersion!: string;
  @ApiProperty({ type: String }) signature!: string;
  @ApiProperty({ type: String }) expiresAt!: string;
  @ApiProperty({ type: Boolean }) demo!: boolean;
}
export class OrderResponse {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) ownerId!: string;
  @ApiProperty({ type: String }) city!: string;
  @ApiProperty({ type: AddressDto }) address!: AddressDto;
  @ApiProperty({ type: [PricedLineResponse] }) lines!: PricedLineResponse[];
  @ApiProperty({ type: BreakdownResponse }) breakdown!: BreakdownResponse;
  @ApiProperty({ type: String }) orderState!: string;
  @ApiProperty({ type: String }) paymentState!: string;
  @ApiProperty({ type: String }) stockState!: string;
  @ApiProperty({ type: String }) deliveryState!: string;
  @ApiProperty({ type: String, nullable: true }) externalId!: string | null;
  @ApiProperty({ type: String, nullable: true }) failureReason!: string | null;
  @ApiProperty({ type: String }) createdAt!: string;
  @ApiProperty({ type: String }) updatedAt!: string;
}
export class EnquiryResponse {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) status!: string;
  @ApiProperty({ type: Boolean }) demo!: boolean;
}
export class ServiceabilityResponse {
  @ApiProperty({ type: String }) pin!: string;
  @ApiProperty({ type: String }) city!: string;
  @ApiProperty({ type: Boolean }) deliverable!: boolean;
  @ApiProperty({ type: Boolean }) demo!: boolean;
  @ApiProperty({ type: String }) message!: string;
}
