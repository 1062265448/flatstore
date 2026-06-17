import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '../common/decorators/skip-throttle.decorator';
import { OcrService } from '../common/services/ocr.service';

@Controller()
export class HealthController {
  constructor(private readonly ocrService: OcrService) {}

  @Get('health')
  @SkipThrottle()
  async check() {
    const ocrAvailable = await this.ocrService.isAvailable();
    return {
      status: 'ok',
      ocr: ocrAvailable ? 'available' : 'unavailable',
      timestamp: new Date().toISOString(),
    };
  }
}
