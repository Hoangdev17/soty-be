import { Module } from '@nestjs/common';
import {
  GuildStickerController,
  StickerController,
} from './guild-sticker.controller';
import { GuildStickerService } from './guild-sticker.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SnowflakeID } from '../../utils/snowflake';

@Module({
  controllers: [GuildStickerController, StickerController],
  providers: [GuildStickerService, PrismaService, SnowflakeID],
  exports: [GuildStickerService],
})
export class GuildStickerModule {}
