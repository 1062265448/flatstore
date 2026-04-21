import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '../common/decorators/skip-throttle.decorator';

@Controller()
export class HealthController {
  @Get('health')
  @SkipThrottle()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
