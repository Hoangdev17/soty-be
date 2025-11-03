import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SnowflakeID } from '../../utils/snowflake';

@Injectable()
export class GuildEmojiService {
  private readonly logger = new Logger(GuildEmojiService.name);

  constructor(
    private prisma: PrismaService,
    private snowflake: SnowflakeID,
  ) {}

  async searchTenorEmojis(query: string, limit: number = 20) {
    const TENOR_API_KEY = process.env.TENOR_API_KEY;

    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=${limit}&media_filter=png,webp,gif&contentfilter=low`;

    this.logger.log(`Searching Tenor emojis: "${query}"`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Tenor API error response: ${errorText}`);
        throw new Error(`Tenor API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform Tenor response to our format
      const emojis = data.results.map((item: any) => {
        // Prefer static formats for emojis (png, webp), but support animated
        let url = '';
        let animated = false;

        if (item.media_formats.png) {
          url = item.media_formats.png.url;
          animated = false;
        } else if (item.media_formats.webp) {
          url = item.media_formats.webp.url;
          animated = false;
        } else if (item.media_formats.gif) {
          url = item.media_formats.gif.url;
          animated = true;
        } else if (item.media_formats.tinygif) {
          url = item.media_formats.tinygif.url;
          animated = true;
        }

        return {
          id: item.id,
          name: item.title || item.content_description || 'emoji',
          description: item.content_description,
          url,
          animated,
          source: 'tenor',
          tags: item.tags?.join(', '),
          dimensions: {
            width: item.media_formats.png?.dims?.[0] || 0,
            height: item.media_formats.png?.dims?.[1] || 0,
          },
        };
      });

      return {
        results: emojis,
        next: data.next,
      };
    } catch (error) {
      this.logger.error(`Error searching Tenor emojis: ${error.message}`);
      throw error;
    }
  }

  async addEmojiToGuild(
    guildId: string,
    userId: string,
    data: {
      name: string;
      url: string;
      animated?: boolean;
      requiresColons?: boolean;
    },
  ) {
    this.logger.log(`Adding emoji "${data.name}" to guild ${guildId}`);

    // Check if guild exists
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!guild) {
      throw new NotFoundException(`Guild ${guildId} not found`);
    }

    // Check if emoji name already exists in guild
    const existingEmoji = await this.prisma.guildEmoji.findFirst({
      where: {
        guildId,
        name: data.name,
        available: true,
      },
    });

    if (existingEmoji) {
      throw new Error(
        `Emoji with name "${data.name}" already exists in this guild`,
      );
    }

    // Create emoji
    const emoji = await this.prisma.guildEmoji.create({
      data: {
        id: this.snowflake.generate(),
        guildId,
        authorId: userId,
        name: data.name,
        url: data.url,
        animated: data.animated || false,
        requiresColons: data.requiresColons !== false, // Default true
        available: true,
        deletable: true,
        managed: false,
      },
    });

    this.logger.log(`Emoji ${emoji.id} added to guild ${guildId}`);

    return emoji;
  }

  async getGuildEmojis(guildId: string) {
    const emojis = await this.prisma.guildEmoji.findMany({
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return emojis;
  }

  async deleteEmoji(emojiId: string, userId: string) {
    const emoji = await this.prisma.guildEmoji.findUnique({
      where: { id: emojiId },
    });

    if (!emoji) {
      throw new NotFoundException(`Emoji ${emojiId} not found`);
    }

    // Check if user is author or has permission
    // TODO: Add permission check

    await this.prisma.guildEmoji.update({
      where: { id: emojiId },
      data: { available: false },
    });

    this.logger.log(`Emoji ${emojiId} deleted by user ${userId}`);

    return { success: true, message: 'Emoji deleted' };
  }

  async updateEmoji(
    emojiId: string,
    data: {
      name?: string;
      url?: string;
      animated?: boolean;
    },
  ) {
    const emoji = await this.prisma.guildEmoji.findUnique({
      where: { id: emojiId },
    });

    if (!emoji) {
      throw new NotFoundException(`Emoji ${emojiId} not found`);
    }

    // If updating name, check for duplicates
    if (data.name && data.name !== emoji.name) {
      const existingEmoji = await this.prisma.guildEmoji.findFirst({
        where: {
          guildId: emoji.guildId,
          name: data.name,
          available: true,
          id: { not: emojiId },
        },
      });

      if (existingEmoji) {
        throw new Error(
          `Emoji with name "${data.name}" already exists in this guild`,
        );
      }
    }

    const updated = await this.prisma.guildEmoji.update({
      where: { id: emojiId },
      data,
    });

    this.logger.log(`Emoji ${emojiId} updated`);

    return updated;
  }

  /**
   * Lấy emojis kết hợp từ Tenor + Guild của user
   * @param userId - ID của user
   * @param query - Từ khóa tìm kiếm (optional)
   * @param limit - Số lượng Tenor results
   */
  async getCombinedEmojis(userId: string, query?: string, limit: number = 20) {
    this.logger.log(
      `Getting combined emojis for user ${userId}, query: "${query || 'none'}"`,
    );

    // Get all guilds user is member of
    const userGuilds = await this.prisma.guildMember.findMany({
      where: { userId },
      select: { guildId: true },
    });

    const guildIds = userGuilds.map((m) => m.guildId);

    // Get guild emojis
    const guildEmojis = await this.prisma.guildEmoji.findMany({
      where: {
        guildId: { in: guildIds },
        available: true,
        ...(query && {
          name: { contains: query, mode: 'insensitive' },
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

    // Transform guild emojis to match format
    const guildResults = guildEmojis.map((emoji) => ({
      id: emoji.id,
      name: emoji.name,
      url: emoji.url,
      animated: emoji.animated,
      source: 'guild',
      guildId: emoji.guildId,
      guildName: emoji.guild.name,
      author: emoji.author,
      createdAt: emoji.createdAt,
    }));

    // Get Tenor emojis if query provided
    let tenorResults = [];
    if (query) {
      try {
        const tenorData = await this.searchTenorEmojis(query, limit);
        tenorResults = tenorData.results;
      } catch (error) {
        this.logger.error(`Error fetching Tenor emojis: ${error.message}`);
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
