import { Module } from '@nestjs/common';
import { GuildsService } from './guilds.service';
import { GuildsController } from './guilds.controller';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { SnowflakeID } from 'src/utils/snowflake';

@Module({
  providers: [GuildsService, PrismaService, SnowflakeID],
  controllers: [GuildsController]
})
export class GuildsModule {}
