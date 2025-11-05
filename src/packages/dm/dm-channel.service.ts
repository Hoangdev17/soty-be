import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CacheService } from 'src/core/cache/cache.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { ChannelType } from '@prisma/client';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { WEBSOCKET_EVENTS } from '../websocket/websocket-events.types';

@Injectable()
export class DmChannelService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly snowflakeID: SnowflakeID,
    private readonly cacheService: CacheService,
    private readonly ws: WebsocketGateway,
  ) {}

  async createDmChannel(
    userId: string,
    userIds: string[],
    icon?: string,
    groupName?: string,
  ) {
    const isGroupDm = userIds.length > 1;
    const channelType = isGroupDm ? 'GROUP_DM' : 'DM';

    const allRecipients = [userId, ...userIds].filter(
      (id, index, arr) => arr.indexOf(id) === index,
    );

    if (!isGroupDm) {
      const otherUserId = userIds[0];
      const otherUser = await this.prismaService.user.findUnique({
        where: { id: otherUserId },
        select: { username: true },
      });

      if (!otherUser) {
        throw new Error('User not found');
      }

      const channelName = otherUser.username;

      const existingChannel = await this.prismaService.guildChannel.findFirst({
        where: {
          type: channelType,
          recipients: {
            hasEvery: allRecipients,
          },
          deleted: false,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

      if (existingChannel) {
        // Update name if it's not the correct username
        if (existingChannel.name !== channelName) {
          await this.prismaService.guildChannel.update({
            where: { id: existingChannel.id },
            data: { name: channelName },
          });
          // Clear cache for all users in the DM after update
          await Promise.all(
            allRecipients.map((userId) => this.clearUserDmCache(userId)),
          );
        }
        return {
          id: existingChannel.id,
          type: existingChannel.type,
          name: channelName,
          recipients: existingChannel.recipients,
          createdAt: existingChannel.createdAt,
          createdBy: existingChannel.createdBy,
        };
      }

      const newChannel = await this.prismaService.guildChannel.create({
        data: {
          id: this.snowflakeID.generate(),
          name: channelName,
          type: channelType as any,
          recipients: allRecipients,
          createdById: userId,
          guildId: 'dm-system-guild',
          manageable: true,
          viewAble: true,
          deletable: true,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

      // Clear cache for all users in the DM
      await Promise.all(
        allRecipients.map((userId) => this.clearUserDmCache(userId)),
      );

      const format = {
        id: newChannel.id,
        type: newChannel.type,
        name: newChannel.name,
        recipients: newChannel.recipients,
        createdAt: newChannel.createdAt,
        createdBy: newChannel.createdBy,
      };

      this.ws.emitToRoom(
        `channel_${newChannel.id}`,
        WEBSOCKET_EVENTS.CHANNEL_CREATED,
        format,
      );

      return format;
    }

    // Create new DM channel
    let channelName = groupName;

    // If no groupName provided, use first 2 usernames
    if (!channelName) {
      const firstTwoUsers = await this.prismaService.user.findMany({
        where: {
          id: {
            in: userIds.slice(0, 2),
          },
        },
        select: {
          username: true,
        },
      });
      channelName = firstTwoUsers.map((u) => u.username).join(', ');
    }

    const newChannel = await this.prismaService.guildChannel.create({
      data: {
        id: this.snowflakeID.generate(),
        name: channelName,
        type: channelType,
        recipients: allRecipients,
        createdById: userId,
        guildId: 'dm-system-guild',
        manageable: true,
        viewAble: true,
        deletable: true,
        icon: icon,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // Clear cache for all users in the DM
    await Promise.all(
      allRecipients.map((userId) => this.clearUserDmCache(userId)),
    );

    const format = {
      id: newChannel.id,
      type: newChannel.type,
      name: newChannel.name,
      recipients: newChannel.recipients,
      createdAt: newChannel.createdAt,
      createdBy: newChannel.createdBy,
      icon: newChannel.icon,
    };

    this.ws.emitToRoom(
      `channel_${newChannel.id}`,
      WEBSOCKET_EVENTS.CHANNEL_CREATED,
      format,
    );

    return format;
  }

  async getUserDmChannels(userId: string) {
    const cacheKey = `dm:user:${userId}:channels`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // Get all DM channels where user is a recipient
    const dmChannels = await this.prismaService.guildChannel.findMany({
      where: {
        recipients: {
          has: userId,
        },
        type: {
          in: ['DM', 'GROUP_DM'],
        },
        deleted: false,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedChannels = await Promise.all(
      dmChannels.map(async (channel) => {
        let channelName = channel.name;

        // Fetch full recipient details from IDs
        const recipientUsers = await this.prismaService.user.findMany({
          where: {
            id: {
              in: channel.recipients,
            },
          },
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        });

        if (channel.type === 'DM') {
          // For 1:1 DM, ensure name is the other user's username
          const otherUser = recipientUsers.find((user) => user.id !== userId);
          channelName = otherUser ? otherUser.username : channel.name;
        }

        return {
          id: channel.id,
          type: channel.type,
          name: channelName,
          recipients: recipientUsers,
          createdAt: channel.createdAt,
          createdBy: channel.createdBy,
          icon: channel.icon,
          lastMessage: channel.messages[0] || null,
        };
      }),
    );

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, formattedChannels, 300);

    return formattedChannels;
  }

  private async clearUserDmCache(userId: string) {
    await this.cacheService.del(`dm:user:${userId}:channels`);
  }

  async getChannelById(channelId: string, userId: string) {
    const cacheKey = `dm:channel:${channelId}`;

    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const channel = await this.prismaService.guildChannel.findUnique({
      where: { id: channelId },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!channel) {
      return null;
    }

    // Get recipients info (exclude current user)
    const otherRecipients = channel.recipients.filter((id) => id !== userId);
    const recipientsInfo = await Promise.all(
      otherRecipients.map(async (recipientId) => {
        const user = await this.prismaService.user.findUnique({
          where: { id: recipientId },
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        });
        return user;
      }),
    );

    let channelName = channel.name;
    if (channel.type === 'DM') {
      // For 1:1 DM, ensure name is the other user's username
      const otherUserId = channel.recipients.find((id) => id !== userId);
      if (otherUserId) {
        const otherUser = await this.prismaService.user.findUnique({
          where: { id: otherUserId },
          select: { username: true },
        });
        channelName = otherUser ? otherUser.username : channel.name;
      }
    }

    const formattedChannel = {
      id: channel.id,
      type: channel.type,
      name: channelName,
      recipients: recipientsInfo, // Use recipientsInfo instead of string array
      createdAt: channel.createdAt,
      createdBy: channel.createdBy,
      lastMessage: channel.messages[0] || null,
      icon: channel.icon,
    };
    await this.cacheService.set(cacheKey, formattedChannel, 300);
    return formattedChannel;
  }
}
