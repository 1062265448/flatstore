import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { SKIP_THROTTLE } from '../decorators/skip-throttle.decorator';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(context: ExecutionContext): Promise<void> {
    throw new ThrottlerException('请求过于频繁，请稍后再试');
  }

  protected async getTracker(req: any): Promise<string> {
    return `${req.ip}-${req.headers['user-agent'] || 'unknown'}`;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipThrottle = this.reflector.getAllAndOverride<boolean>(SKIP_THROTTLE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipThrottle) {
      return true;
    }

    return super.canActivate(context);
  }
}
