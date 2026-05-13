import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DistributionModule } from './distribution/distribution.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CustomThrottlerGuard } from './common/guards/throttler.guard';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 3000,
      },
      {
        name: 'login',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'upload',
        ttl: 60000,
        limit: 200,
      },
    ]),
    PrismaModule,
    AuthModule,
    DistributionModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
