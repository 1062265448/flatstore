import { SetMetadata } from '@nestjs/common';

export const SKIP_THROTTLE = 'skip_throttle';

export const SkipThrottle = () => SetMetadata(SKIP_THROTTLE, true);
