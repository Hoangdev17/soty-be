import { Module } from '@nestjs/common';
import { DmChannelService } from './dm-channel.service';
import { DmChannelController } from './dm-channel.controller';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CoreCacheModule } from 'src/core/cache/cache.module';
import { SnowflakeID } from 'src/utils/snowflake';

@Module({
  imports: [CoreCacheModule],
  controllers: [DmChannelController],
  providers: [DmChannelService, PrismaService, SnowflakeID],
  exports: [DmChannelService],
})
export class DmChannelModule {}
