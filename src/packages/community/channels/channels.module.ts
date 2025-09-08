import { Module } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { PermissionsService } from '.././modules/permissions/permissions.service';

@Module({
  providers: [ChannelsService, PrismaService, SnowflakeID, PermissionsService],
  controllers: [ChannelsController]
})
export class ChannelsModule {}
