import { Module } from '@nestjs/common';
import { DistributionModule } from './distribution/distribution.module';

@Module({
  imports: [DistributionModule],
})
export class AppModule {}
