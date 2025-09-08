import { Injectable } from '@nestjs/common';
import { CreateChannelDto } from './dto/create-channel.dto';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { ChannelType, PermissionOverwriteType, Prisma } from '@prisma/client';

@Injectable()
export class ChannelsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly snowflake: SnowflakeID
    ) {}

  async createChannel(guildId: string, userId: string, dto: CreateChannelDto) {
    const channelId = this.snowflake.generate();

    // PUBLIC
    if (!dto.isPrivate) {
    return await this.prisma.guildChannel.create({
        data: {
          id: channelId,
          guildId,
          name: dto.name,
          type: dto.type as ChannelType,
          isPrivate: false,
          nsfw: dto.nsfw ?? false,
          topic: dto.topic ?? null,
          position: dto.position ?? 0,
          manageable: dto.manageable ?? true,
          rateLimitPerUser: dto.rateLimitPerUser ?? 0,
          viewAble: dto.viewAble ?? true,
          recipients: Array.isArray(dto.recipients) ? dto.recipients : [],
          maxMembers: dto.maxMembers ?? null,
        },
      });
    }

    // PRIVATE
    else{
      const channel = await this.prisma.guildChannel.create({
        data: {
          id: channelId,
          guildId,
          name: dto.name,
          type: dto.type as ChannelType,
          nsfw: dto.nsfw ?? false,
          isPrivate: true,
          topic: dto.topic ?? null,
          position: dto.position ?? 0,
          manageable: dto.manageable ?? true,
          rateLimitPerUser: dto.rateLimitPerUser ?? 0,
          viewAble: dto.viewAble ?? false, // private
          recipients: Array.isArray(dto.recipients) ? dto.recipients : [],
          maxMembers: dto.maxMembers ?? null,

          channelAllows: 
          {
            allowUserIds: Array.isArray(dto.allowUserIds) ? dto.allowUserIds : [],
            allowRoleIds: Array.isArray(dto.allowRoleIds) ? dto.allowRoleIds : [],
          }
        },
      });
      return channel;
    }
  }

  async joinPrivateChannel(guildId: string, channelId: string, userId: string) {
    if (!userId) throw new Error('Unauthenticated');

    const channel = await this.prisma.guildChannel.findFirst({
      where: {
        id: channelId,
        guildId,
        isPrivate: true,
        deleted: false
      }
    })
    if(!channel) throw new Error('Channel not found or not private')

    const allows = (channel.channelAllows ?? {}) as {
    allowUserIds?: string[];
    allowRoleIds?: string[];
    };

    // Nếu mảng chưa có thì tạo mới, nếu có thì thêm userId vào
    const allowUserIds = allows.allowUserIds ?? [];
    if (!allowUserIds.includes(userId)) {
      allowUserIds.push(userId);
    }

    return this.prisma.guildChannel.update({
    where: { id: channelId },
    data: {
      channelAllows: {
        ...allows, 
        allowUserIds, 
      },
    },
  });
    }  

    async updateChannel(guildId: string, channelId: string, dto: UpdateChannelDto) {
        const data: Prisma.GuildChannelUpdateInput = {};

        if (dto.name !== undefined) data.name = { set: dto.name };
        if (dto.nsfw !== undefined) data.nsfw = { set: dto.nsfw };
        if (dto.topic !== undefined) data.topic = { set: dto.topic };

        if (dto.type !== undefined) {
            data.type = { set: dto.type as ChannelType };
        }

        if (dto.manageable !== undefined) data.manageable = { set: dto.manageable };
        if (dto.rateLimitPerUser !== undefined) data.rateLimitPerUser = { set: dto.rateLimitPerUser };
        if (dto.viewAble !== undefined) data.viewAble = { set: dto.viewAble };
        if (dto.recepients !== undefined) data.recipients = { set: dto.recepients };
        if (dto.maxMembers !== undefined) data.maxMembers = { set: dto.maxMembers };
        if (dto.createdAt !== undefined) data.createdAt = { set: dto.createdAt };
        if (dto.deleteable !== undefined) data.deletable = { set: dto.deleteable };
        if (dto.deletedAt !== undefined) data.deletedAt = { set: dto.deletedAt };
        if (dto.deleted !== undefined) data.deleted = { set: dto.deleted };
        if (dto.position !== undefined) data.position = { set: dto.position };
        if (dto.isPrivate !== undefined) data.isPrivate = { set: dto.isPrivate };

        return this.prisma.guildChannel.update({
            where: { 
                id: channelId,
                guildId
            },
            data,
        });
    }

    async getChannels(guildId: string) {
        return await this.prisma.guildChannel.findMany({
            where: {
                guildId: guildId,
                deleted: false
            },
            orderBy: {
                createdAt: 'asc'
            }
        })
    }

    async getChannelById(guildId: string, channelId: string) {
        return await this.prisma.guildChannel.findFirst({
            where: {
                id: channelId,
                guildId,
                deleted: false
            }
        })
    }

    async deleteChannel(guildId: string, channelId: string) {
        return await this.prisma.guildChannel.update({
            where: { 
                id: channelId,
                guildId
            },
            data: { deleted: true, deletedAt: new Date() }
        })
    }
}
