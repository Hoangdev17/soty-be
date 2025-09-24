import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SepayController } from './sepay.controller';
import { SepayService } from './sepay.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SnowflakeID } from '../../utils/snowflake';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot()],
  controllers: [SepayController],
  providers: [SepayService, PrismaService, SnowflakeID],
  exports: [SepayService],
})
export class SepayModule {}
