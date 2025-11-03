import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UsePipes,
} from '@nestjs/common';
import { GuildStickerService } from './guild-sticker.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../core/validations/zod.pipe';
import { AddStickerSchema, CreateStickerPackSchema } from './dto/sticker.dto';
import type { AddStickerDto, CreateStickerPackDto } from './dto/sticker.dto';
import { ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../core/auth/dto/request-with-auth.dto';

@Controller('guilds/:guildId/stickers')
export class GuildStickerController {
  constructor(private readonly stickerService: GuildStickerService) {}

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiProperty({ description: 'Tìm kiếm sticker từ Tenor' })
  async searchStickers(
    @Query('q') query: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 20;
    const contentType = (type as 'gif' | 'sticker' | 'emoji' | 'all') || 'all';
    return this.stickerService.searchTenor(query, contentType, limitNum);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiProperty({ description: 'Lấy danh sách stickers của guild' })
  async getGuildStickers(@Param('guildId') guildId: string) {
    return this.stickerService.getGuildStickers(guildId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @UsePipes(new ZodValidationPipe(AddStickerSchema))
  @ApiProperty({ description: 'Thêm sticker vào guild' })
  async addSticker(
    @Param('guildId') guildId: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: AddStickerDto,
  ) {
    return this.stickerService.addStickerToGuild(guildId, req.user.id, body);
  }

  @Delete(':stickerId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiProperty({ description: 'Xóa sticker khỏi guild' })
  async deleteSticker(
    @Param('stickerId') stickerId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.stickerService.deleteSticker(stickerId, req.user.id);
  }

  @Get('packs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiProperty({ description: 'Lấy sticker packs của guild' })
  async getStickerPacks(@Param('guildId') guildId: string) {
    return this.stickerService.getGuildStickerPacks(guildId);
  }

  @Post('packs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiProperty({ description: 'Tạo sticker pack mới' })
  async createStickerPack(
    @Param('guildId') guildId: string,
    @Body() body: CreateStickerPackDto,
  ) {
    return this.stickerService.createStickerPack(guildId, body);
  }
}

@Controller('stickers')
@UseGuards(JwtAuthGuard)
export class StickerController {
  constructor(private readonly stickerService: GuildStickerService) {}

  /**
   * Lấy stickers kết hợp từ Tenor + Guild của user
   * GET /stickers/combined?q=happy&type=sticker&limit=20
   *
   * Query params:
   * - q: Từ khóa tìm kiếm (optional)
   * - type: Loại content - 'gif', 'sticker', 'emoji', 'all' (default: 'sticker')
   * - limit: Số lượng Tenor results (default: 20)
   */
  @Get('combined')
  @ApiBearerAuth('access-token')
  @ApiProperty({
    description: 'Lấy stickers kết hợp từ Tenor + Guild của user',
  })
  async getCombinedStickers(
    @Request() req: AuthenticatedRequest,
    @Query('q') query?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 20;
    const contentType =
      (type as 'gif' | 'sticker' | 'emoji' | 'all') || 'sticker';
    return this.stickerService.getCombinedStickers(
      req.user.id,
      query,
      contentType,
      limitNum,
    );
  }
}
