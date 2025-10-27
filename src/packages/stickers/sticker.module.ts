import { Module } from '@nestjs/common';
import { GuildStickerService } from './sticker.service';
import { GuildStickerController } from './sticker.controller';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SnowflakeID } from 'src/utils/snowflake';

@Module({
	controllers: [GuildStickerController],
	providers: [GuildStickerService, PrismaService, SnowflakeID],
})
export class StickerModule {}
