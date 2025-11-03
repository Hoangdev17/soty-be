import { Module } from '@nestjs/common';
import { GuildEmojiController } from './guild-emoji.controller';
import { GuildEmojiService } from './guild-emoji.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SnowflakeID } from '../../utils/snowflake';

@Module({
  controllers: [GuildEmojiController],
  providers: [GuildEmojiService, PrismaService, SnowflakeID],
  exports: [GuildEmojiService],
})
export class GuildEmojiModule {}
