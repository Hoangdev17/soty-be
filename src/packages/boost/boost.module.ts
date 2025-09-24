import { Module } from '@nestjs/common';
import { BoostService } from './boost.service';
import { BoostController } from './boost.controller';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SnowflakeID } from '../../utils/snowflake';

@Module({
  controllers: [BoostController],
  providers: [BoostService, PrismaService, SnowflakeID],
  exports: [BoostService],
})
export class BoostModule {}
