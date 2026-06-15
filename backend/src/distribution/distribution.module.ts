import { Module } from '@nestjs/common';
import { DistributionController } from './distribution.controller';
import { DistributionService } from './distribution.service';
import { PrismaService } from '../prisma/prisma.service';
import { QwenAIService } from '../common/services/qwen-ai.service';
import { OcrService } from '../common/services/ocr.service';

@Module({
  controllers: [DistributionController],
  providers: [DistributionService, PrismaService, QwenAIService, OcrService],
})
export class DistributionModule {}
