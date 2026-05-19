import { IsOptional, IsString, IsNumber, Min, Max, MinLength, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInventoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  packageNo?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  batchNo: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  grade: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specification?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(10000)
  weight: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1000)
  pieceCount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nickelContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  impurityContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inspectionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificateNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  recognitionHistoryId?: number;
}

export class UpdateInventoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  packageNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specification?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  pieceCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nickelContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  impurityContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inspectionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificateNo?: string;
}

export class BatchCreateInventoryDto {
  @ApiProperty({ type: [CreateInventoryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInventoryDto)
  items: CreateInventoryDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  recognitionHistoryId?: number;
}
