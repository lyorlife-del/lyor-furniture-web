import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
export class LineDto {
  @ApiProperty({ type: String }) @IsString() @Length(1, 80) productId!: string;
  @ApiProperty({ type: String, enum: ["rent", "buy"] })
  @IsIn(["rent", "buy"])
  mode!: "rent" | "buy";
  @ApiProperty({ type: Number, minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  quantity!: number;
  @ApiProperty({ type: String }) @IsString() @Length(1, 60) variantId!: string;
  @ApiProperty({ type: Number, enum: [3, 6, 12] })
  @IsIn([3, 6, 12])
  tenure!: number;
}
export class CartDto {
  @ApiProperty({ type: String, format: "uuid" }) @IsUUID() cartId!: string;
  @ApiProperty({ type: String }) @IsIn(["noida"]) city!: string;
  @ApiProperty({ type: Number }) @IsInt() @Min(0) revision!: number;
  @ApiProperty({ type: [LineDto] })
  @IsArray()
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => LineDto)
  lines!: LineDto[];
}
export class QuoteDto {
  @ApiProperty({ type: String, format: "uuid" }) @IsUUID() cartId!: string;
  @ApiProperty({ type: String }) @Matches(/^\d{6}$/) pin!: string;
}
export class AddressDto {
  @ApiProperty({ type: String }) @IsString() @Length(2, 80) name!: string;
  @ApiProperty({ type: String }) @Matches(/^[6-9]\d{9}$/) phone!: string;
  @ApiProperty({ type: String }) @IsString() @Length(8, 300) street!: string;
  @ApiProperty({ type: String }) @Matches(/^\d{6}$/) pin!: string;
}
export class CheckoutDto {
  @ApiProperty({ type: String, format: "uuid" }) @IsUUID() quoteId!: string;
  @ApiProperty({ type: String }) @IsString() @Length(64, 64) signature!: string;
  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;
  @ApiProperty({ type: Boolean }) @IsBoolean() consent!: boolean;
}
export class SiteDto {
  @ApiProperty({ type: String }) @IsString() @Length(2, 80) name!: string;
  @ApiProperty({ type: String }) @Matches(/^\d{6}$/) pin!: string;
  @ApiProperty({ type: Number }) @IsInt() @Min(1) @Max(1000) units!: number;
}
export class EnquiryDto {
  @ApiProperty({ type: String }) @IsString() @Length(2, 80) name!: string;
  @ApiProperty({ type: String }) @IsEmail() @MaxLength(150) email!: string;
  @ApiProperty({ type: String }) @Matches(/^[6-9]\d{9}$/) phone!: string;
  @ApiProperty({ type: String }) @IsString() @Length(2, 150) company!: string;
  @ApiProperty({ type: String, enum: ["rent", "buy"] })
  @IsIn(["rent", "buy"])
  mode!: "rent" | "buy";
  @ApiProperty({ type: Boolean }) @IsBoolean() consent!: boolean;
  @ApiProperty({ type: [SiteDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SiteDto)
  sites!: SiteDto[];
}
export class PublishDto {
  @ApiProperty({ type: Boolean }) @IsBoolean() published!: boolean;
}
export class CatalogQuery {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsIn(["noida"])
  city?: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsIn(["rent", "buy"])
  mode?: "rent" | "buy";
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsIn([
    "living",
    "bedroom",
    "study",
    "dining",
    "storage",
    "appliances",
    "accessories",
    "bundles",
  ])
  category?: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsIn(["featured", "price-asc", "price-desc", "newest"])
  sort?: string;
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  page?: number;
}
