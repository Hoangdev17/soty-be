import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { CreateChannelDto } from './dto/create-channel.dto';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CacheService } from 'src/core/cache/cache.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { ChannelType, Prisma } from '@prisma/client';
import { PermissionUtils } from '../../constants/guild-permissions';
import { WebsocketGateway } from '../../../websocket/websocket.gateway';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeID,
    private readonly cacheService: CacheService,
    @Inject(forwardRef(() => WebsocketGateway))
    private readonly ws: WebsocketGateway,
  ) {}

  async createCategory(
    guildId: string,
    createCategoryDto: { name: string; topic?: string; position?: number },
    userId: string,
  ) {
    // Get the highest position for categories in this guild
    const highestPosition = await this.prisma.guildChannel.findFirst({
      where: {
        guildId,
        type: ChannelType.GUILD_CATEGORY,
        deleted: false,
      },
      orderBy: { position: 'desc' },
    });

    const position =
      createCategoryDto.position ?? (highestPosition?.position ?? -1) + 1;

    const categoryId = this.snowflake.generate();
    const category = await this.prisma.guildChannel.create({
      data: {
        id: categoryId,
        name: createCategoryDto.name,
        type: ChannelType.GUILD_CATEGORY,
        guildId,
        createdById: userId,
        position,
        topic: createCategoryDto.topic,
      },
    });
    // Clear related cache
    await this.cacheService.del(`community:${guildId}`);
    await this.cacheService.del(`community:${guildId}:channels`);
    await this.cacheService.del(`channels:guild:${guildId}`);

    return category;
  }

  async createChannel(
    guildId: string,
    createChannelDto: CreateChannelDto,
    userId: string,
  ) {
    // Validate parentId if provided
    if (createChannelDto.parentId) {
      const parentCategory = await this.prisma.guildChannel.findFirst({
        where: {
          id: createChannelDto.parentId,
          guildId,
          type: ChannelType.GUILD_CATEGORY,
          deleted: false,
        },
      });

      if (!parentCategory) {
        throw new Error('Category cha không tồn tại hoặc không hợp lệ');
      }
    }
    // Get the highest position for channels in this category or guild
    let position = createChannelDto.position;
    if (position === undefined) {
      const highestPosition = await this.prisma.guildChannel.findFirst({
        where: {
          guildId,
          parentId: createChannelDto.parentId || null,
          deleted: false,
        },
        orderBy: { position: 'desc' },
      });
      position = (highestPosition?.position ?? -1) + 1;
    }

    // Map string type to ChannelType enum
    const channelType =
      createChannelDto.type === 'GUILD_TEXT'
        ? ChannelType.GUILD_TEXT
        : ChannelType.GUILD_VOICE;

    const channelId = this.snowflake.generate();
    const channel = await this.prisma.guildChannel.create({
      data: {
        id: channelId,
        name: createChannelDto.name,
        type: channelType,
        guildId,
        parentId: createChannelDto.parentId,
        createdById: userId,
        position,
        topic: createChannelDto.topic,
        nsfw: createChannelDto.nsfw ?? false,
        rateLimitPerUser: createChannelDto.rateLimitPerUser ?? 0,
      },
    });

    // Clear related cache
    await this.cacheService.del(`community:${guildId}`);
    await this.cacheService.del(`community:${guildId}:channels`);
    await this.cacheService.del(`channels:guild:${guildId}`);

    return channel;
  }

  async updateChannel(
    guildId: string,
    channelId: string,
    dto: UpdateChannelDto,
  ) {
    const data: Prisma.GuildChannelUpdateInput = {};

    if (dto.name !== undefined) data.name = { set: dto.name };
    if (dto.nsfw !== undefined) data.nsfw = { set: dto.nsfw };
    if (dto.topic !== undefined) data.topic = { set: dto.topic };

    if (dto.type !== undefined) {
      data.type = { set: dto.type as ChannelType }; // enum Prisma
    }

    if (dto.manageable !== undefined) data.manageable = { set: dto.manageable };
    if (dto.rateLimitPerUser !== undefined)
      data.rateLimitPerUser = { set: dto.rateLimitPerUser };
    if (dto.viewAble !== undefined) data.viewAble = { set: dto.viewAble };
    if (dto.recepients !== undefined) data.recipients = { set: dto.recepients };
    if (dto.maxMembers !== undefined) data.maxMembers = { set: dto.maxMembers };
    if (dto.createdAt !== undefined) data.createdAt = { set: dto.createdAt };
    if (dto.deleteable !== undefined) data.deletable = { set: dto.deleteable };
    if (dto.deletedAt !== undefined) data.deletedAt = { set: dto.deletedAt };
    if (dto.deleted !== undefined) data.deleted = { set: dto.deleted };

    const result = await this.prisma.guildChannel.update({
      where: {
        id: channelId,
        guildId,
      },
      data,
    });

    // Clear related cache
    await this.cacheService.del(`channels:guild:${guildId}`);
    await this.cacheService.del(`channel:${channelId}`);
    // Also clear community cache since it includes channels
    await this.cacheService.del(`community:${guildId}`);

    return result;
  }

  async getChannels(guildId: string) {
    const cacheKey = `channels:guild:${guildId}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const channels = await this.prisma.guildChannel.findMany({
      where: {
        guildId: guildId,
        deleted: false,
        type: { in: [ChannelType.GUILD_TEXT, ChannelType.GUILD_VOICE] },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, channels, 300);
    return channels;
  }

  async getChannelById(guildId: string, channelId: string) {
    const cacheKey = `channel:${channelId}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const channel = await this.prisma.guildChannel.findFirst({
      where: {
        id: channelId,
        guildId,
        deleted: false,
      },
    });

    if (channel) {
      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, channel, 300);
    }

    return channel;
  }

  async deleteChannel(guildId: string, channelId: string) {
    const result = await this.prisma.guildChannel.update({
      where: {
        id: channelId,
        guildId,
      },
      data: { deleted: true, deletedAt: new Date() },
    });

    // Clear related cache
    await this.cacheService.del(`channels:guild:${guildId}`);
    await this.cacheService.del(`channel:${channelId}`);
    // Also clear community cache since it includes channels
    await this.cacheService.del(`community:${guildId}`);

    return result;
  }
}
