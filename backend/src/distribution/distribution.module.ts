import { Module } from '@nestjs/common';
import { DistributionController } from './distribution.controller';
import { DistributionService } from './distribution.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OcrService } from '../common/services/ocr.service';

@Module({
  imports: [PrismaModule],
  controllers: [DistributionController],
  providers: [DistributionService, OcrService],
})
export class DistributionModule {}
