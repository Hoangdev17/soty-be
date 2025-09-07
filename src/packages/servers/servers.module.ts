import { Module } from '@nestjs/common';
import { ServersService } from './servers.service';
import { ServersController } from './servers.controller';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { SnowflakeID } from 'src/utils/snowflake';

@Module({
  controllers: [ServersController],
  providers: [ServersService, PrismaService, SnowflakeID],
  exports: [ServersService],
})
export class ServersModule {}
