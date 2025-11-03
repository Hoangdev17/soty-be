import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SnowflakeID } from '../../utils/snowflake';
import { AddStickerDto, CreateStickerPackDto } from './dto/sticker.dto';

@Injectable()
export class GuildStickerService {
  private readonly logger = new Logger(GuildStickerService.name);

  constructor(
    private prisma: PrismaService,
    private snowflake: SnowflakeID,
  ) {}

  async searchTenor(
    query: string,
    contentType: 'gif' | 'sticker' | 'emoji' | 'all' = 'all',
    limit: number = 20,
  ) {
    const TENOR_API_KEY = process.env.TENOR_API_KEY;

    let searchFilter = '';
    switch (contentType) {
      case 'sticker':
        searchFilter = '&searchfilter=sticker';
        break;
      case 'gif':
        // No specific filter, default search returns GIFs
        searchFilter = '';
        break;
      case 'emoji':
        // Use sticker filter for emoji-like content
        searchFilter = '&searchfilter=sticker';
        break;
      case 'all':
      default:
        searchFilter = '';
        break;
    }

    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=${limit}${searchFilter}&contentfilter=low&media_filter=gif,tinygif,png,webp`;

    this.logger.log(
      `Searching Tenor: "${query}" (type: ${contentType}, limit: ${limit})`,
    );

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Tenor API error response: ${errorText}`);
        throw new Error(`Tenor API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform Tenor response to our format
      const results = data.results.map((item: any) => {
        let format = 4;
        let url = '';

        if (item.media_formats.gif) {
          format = 4; // GIF
          url = item.media_formats.gif.url;
        } else if (item.media_formats.tinygif) {
          format = 4; // GIF (tiny)
          url = item.media_formats.tinygif.url;
        } else if (item.media_formats.webp) {
          format = 1; // PNG/WEBP
          url = item.media_formats.webp.url;
        } else if (item.media_formats.png) {
          format = 1; // PNG
          url = item.media_formats.png.url;
        }

        return {
          id: item.id,
          name: item.title || item.content_description || 'Untitled',
          description: item.content_description,
          url,
          format,
          type: 1, // Standard type
          tags: item.tags?.join(', '),
          source: 'tenor',
          contentType: item.content_type || 'gif',
          // Additional metadata
          dimensions: {
            width: item.media_formats.gif?.dims?.[0] || 0,
            height: item.media_formats.gif?.dims?.[1] || 0,
          },
          hasAudio: item.hasaudio || false,
        };
      });

      return {
        results,
        next: data.next,
      };
    } catch (error) {
      this.logger.error(`Error searching Tenor: ${error.message}`);
      throw error;
    }
  }

  async searchTenorStickers(query: string, limit: number = 20) {
    return this.searchTenor(query, 'all', limit);
  }

  async addStickerToGuild(
    guildId: string,
    userId: string,
    data: AddStickerDto,
  ) {
    this.logger.log(`Adding sticker "${data.name}" to guild ${guildId}`);

    // Check if guild exists
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!guild) {
      throw new NotFoundException(`Guild ${guildId} not found`);
    }

    // Create sticker
    const sticker = await this.prisma.guildSticker.create({
      data: {
        id: this.snowflake.generate(),
        guildId,
        authorId: userId,
        name: data.name,
        description: data.description,
        url: data.url,
        tags: data.tags,
        format: data.format || 4, // Default GIF
        type: data.type || 2, // Guild type
        packId: data.packId,
        available: true,
        deletable: true,
      },
    });

    this.logger.log(`Sticker ${sticker.id} added to guild ${guildId}`);

    return sticker;
  }

  async getGuildStickers(guildId: string) {
    const stickers = await this.prisma.guildSticker.findMany({
      where: {
        guildId,
        available: true,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        pack: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return stickers;
  }

  async deleteSticker(stickerId: string, userId: string) {
    const sticker = await this.prisma.guildSticker.findUnique({
      where: { id: stickerId },
    });

    if (!sticker) {
      throw new NotFoundException(`Sticker ${stickerId} not found`);
    }

    await this.prisma.guildSticker.update({
      where: { id: stickerId },
      data: { available: false },
    });

    this.logger.log(`Sticker ${stickerId} deleted by user ${userId}`);

    return { success: true, message: 'Sticker deleted' };
  }

  async createStickerPack(guildId: string, data: CreateStickerPackDto) {
    const pack = await this.prisma.guildStickerPack.create({
      data: {
        id: this.snowflake.generate(),
        name: data.name,
        description: data.description,
        banner: data.banner,
      },
    });

    this.logger.log(`Sticker pack ${pack.id} created`);

    return pack;
  }

  async getGuildStickerPacks(guildId: string) {
    const packs = await this.prisma.guildStickerPack.findMany({
      include: {
        stickers: {
          where: {
            guildId,
            available: true,
          },
          take: 10,
        },
        coverSticker: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return packs;
  }

  /**
   * Lấy stickers kết hợp từ Tenor + Guild của user
   * @param userId - ID của user
   * @param query - Từ khóa tìm kiếm (optional)
   * @param contentType - Loại content: 'gif', 'sticker', 'emoji', 'all'
   * @param limit - Số lượng Tenor results
   */
  async getCombinedStickers(
    userId: string,
    query?: string,
    contentType: 'gif' | 'sticker' | 'emoji' | 'all' = 'sticker',
    limit: number = 20,
  ) {
    this.logger.log(
      `Getting combined stickers for user ${userId}, query: "${query || 'none'}"`,
    );

    // Get all guilds user is member of
    const userGuilds = await this.prisma.guildMember.findMany({
      where: { userId },
      select: { guildId: true },
    });

    const guildIds = userGuilds.map((m) => m.guildId);

    // Get guild stickers
    const guildStickers = await this.prisma.guildSticker.findMany({
      where: {
        guildId: { in: guildIds },
        available: true,
        ...(query && {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { tags: { contains: query, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        guild: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    // Transform guild stickers to match format
    const guildResults = guildStickers.map((sticker) => ({
      id: sticker.id,
      name: sticker.name,
      description: sticker.description,
      url: sticker.url,
      format: sticker.format,
      type: sticker.type,
      tags: sticker.tags,
      source: 'guild',
      guildId: sticker.guildId,
      guildName: sticker.guild.name,
      author: sticker.author,
      createdAt: sticker.createdAt,
    }));

    // Get Tenor stickers if query provided
    let tenorResults = [];
    if (query) {
      try {
        const tenorData = await this.searchTenor(query, contentType, limit);
        tenorResults = tenorData.results;
      } catch (error) {
        this.logger.error(`Error fetching Tenor stickers: ${error.message}`);
        // Continue without Tenor results
      }
    }

    return {
      guild: guildResults,
      tenor: tenorResults,
      total: {
        guild: guildResults.length,
        tenor: tenorResults.length,
      },
    };
  }
}
