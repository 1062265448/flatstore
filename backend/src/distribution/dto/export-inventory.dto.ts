import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExportInventoryDto {
  @ApiPropertyOptional()
  keyword?: string;

  @ApiPropertyOptional()
  grade?: string;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  productType?: string;
}
