import { CollectiblesService } from './collectibles.service';
import { CollectiblesController } from './collectibles.controller';
import { Module } from '@nestjs/common';
import { SnowflakeID } from '../../utils/snowflake';
import { PrismaService } from '../../core/prisma/prisma.service';

@Module({
  controllers: [CollectiblesController],
  providers: [CollectiblesService, SnowflakeID, PrismaService],
  exports: [CollectiblesService],
})
export class CollectiblesModule {}
