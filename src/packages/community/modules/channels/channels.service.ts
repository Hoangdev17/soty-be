import { Injectable } from '@nestjs/common';
import { CreateChannelDto } from './dto/create-channel.dto';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CacheService } from 'src/core/cache/cache.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { ChannelType, Prisma } from '@prisma/client';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeID,
    private readonly cacheService: CacheService,
  ) {}

  async createChannel(guildId: string, createChannelDto: CreateChannelDto) {
    const channel = await this.prisma.guildChannel.create({
      data: {
        id: this.snowflake.generate(),
        guildId: guildId,
        ...createChannelDto,
      },
    });

    // Clear channels cache for this guild
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

    return result;
  }
}
