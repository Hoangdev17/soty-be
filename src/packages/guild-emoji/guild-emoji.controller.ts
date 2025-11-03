import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UsePipes,
} from '@nestjs/common';
import { GuildEmojiService } from './guild-emoji.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../core/validations/zod.pipe';
import { AddEmojiSchema, UpdateEmojiSchema } from './dto/emoji.dto';
import type { AddEmojiDto, UpdateEmojiDto } from './dto/emoji.dto';
import { ApiBearerAuth, ApiProperty } from '@nestjs/swagger';

@Controller('guilds/:guildId/emojis')
@UseGuards(JwtAuthGuard)
export class GuildEmojiController {
  constructor(private readonly emojiService: GuildEmojiService) {}

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiProperty({ description: 'Tìm kiếm emoji từ Tenor' })
  async searchEmojis(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 20;
    return this.emojiService.searchTenorEmojis(query, limitNum);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiProperty({ description: 'Lấy danh sách emojis của guild' })
  async getGuildEmojis(@Param('guildId') guildId: string) {
    return this.emojiService.getGuildEmojis(guildId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiProperty({ description: 'Thêm emoji vào guild' })
  async addEmoji(
    @Param('guildId') guildId: string,
    @Request() req: any,
    @Body() body: AddEmojiDto,
  ) {
    const userId = req.user.id;
    return this.emojiService.addEmojiToGuild(guildId, userId, body);
  }

  @Patch(':emojiId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiProperty({ description: 'Cập nhật emoji của guild' })
  async updateEmoji(
    @Param('emojiId') emojiId: string,
    @Body() body: UpdateEmojiDto,
  ) {
    return this.emojiService.updateEmoji(emojiId, body);
  }

  @Delete(':emojiId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiProperty({ description: 'Xóa emoji khỏi guild' })
  async deleteEmoji(@Param('emojiId') emojiId: string, @Request() req: any) {
    const userId = req.user.id;
    return this.emojiService.deleteEmoji(emojiId, userId);
  }
}
