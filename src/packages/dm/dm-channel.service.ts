import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CacheService } from 'src/core/cache/cache.service';
import { SnowflakeID } from 'src/utils/snowflake';

@Injectable()
export class DmChannelService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly snowflakeID: SnowflakeID,
    private readonly cacheService: CacheService,
  ) {}

  async createDmChannel(userId1: string, userId2: string) {
    // For now, we'll implement DM using existing message system
    // We can create a special "virtual" DM system or extend the current schema later

    // Check if users have existing conversation in any guild (simplified approach)
    const existingMessages = await this.prismaService.guildMessage.findFirst({
      where: {
        OR: [
          { authorId: userId1, content: { contains: `@${userId2}` } },
          { authorId: userId2, content: { contains: `@${userId1}` } },
        ],
      },
      include: {
        channel: true,
      },
    });

    if (existingMessages) {
      return {
        id: `dm-${userId1}-${userId2}`,
        type: 'DM',
        recipients: [userId1, userId2],
        name: 'Direct Message',
        isVirtual: true,
      };
    }

    // Return virtual DM channel
    return {
      id: `dm-${userId1}-${userId2}`,
      type: 'DM',
      recipients: [userId1, userId2],
      name: 'Direct Message',
      isVirtual: true,
    };
  }

  async getUserDmChannels(userId: string) {
    const cacheKey = `dm:user:${userId}:channels`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // For now, return empty array as we're using virtual DM system
    // In a real implementation, you might query conversations from message history
    const dmChannels = [];

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, dmChannels, 300);
    return dmChannels;
  }

  async sendDmMessage(channelId: string, content: string, authorId: string) {
    // Extract recipient ID from virtual channel ID
    const channelParts = channelId.split('-');
    if (channelParts.length !== 3 || channelParts[0] !== 'dm') {
      throw new Error('Invalid DM channel ID');
    }

    const [, userId1, userId2] = channelParts;
    const recipientId = userId1 === authorId ? userId2 : userId1;

    // For virtual DM, we could create a special message format
    // or use a notification system. For now, we'll return a virtual message
    const virtualMessage = {
      id: this.snowflakeID.generate(),
      content,
      createdAt: new Date(),
      type: 'dm',
      room: `dm_${channelId}`,
      author: {
        id: authorId,
        username: 'User', // Would need to fetch from database
        avatar: '',
      },
      channelId,
      recipientId,
    };

    // Clear cache
    await this.clearDmMessagesCache(channelId);
    await this.clearUserDmCache(userId1);
    await this.clearUserDmCache(userId2);

    return virtualMessage;
  }

  async getDmMessages(
    channelId: string,
    userId: string,
    limit?: string,
    offset?: string,
  ) {
    // Extract recipient ID from virtual channel ID
    const channelParts = channelId.split('-');
    if (channelParts.length !== 3 || channelParts[0] !== 'dm') {
      throw new Error('Invalid DM channel ID');
    }

    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    const cacheKey = `dm:messages:channel:${channelId}:limit:${limitNum}:offset:${offsetNum}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // For virtual DM, return empty messages for now
    // In real implementation, you might query message history between users
    const messages = [];

    // Cache for 1 minute
    await this.cacheService.set(cacheKey, messages, 60);
    return messages;
  }

  async getDmChannel(channelId: string, userId: string) {
    const cacheKey = `dm:channel:${channelId}:user:${userId}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // Extract recipient ID from virtual channel ID
    const channelParts = channelId.split('-');
    if (channelParts.length !== 3 || channelParts[0] !== 'dm') {
      throw new Error('Invalid DM channel ID');
    }

    const [, userId1, userId2] = channelParts;
    if (userId !== userId1 && userId !== userId2) {
      throw new Error('Unauthorized access to DM channel');
    }

    const result = {
      id: channelId,
      type: 'DM',
      name: 'Direct Message',
      recipients: [userId1, userId2],
      recipientId: userId1 === userId ? userId2 : userId1,
      isVirtual: true,
    };

    // Cache for 10 minutes
    await this.cacheService.set(cacheKey, result, 600);
    return result;
  }

  private async clearUserDmCache(userId: string) {
    await this.cacheService.del(`dm:user:${userId}:channels`);
  }

  private async clearDmMessagesCache(channelId: string) {
    const keys = [
      `dm:messages:channel:${channelId}:recent`,
      `dm:messages:channel:${channelId}:count`,
    ];

    // Clear common pagination combinations
    for (let limit = 10; limit <= 100; limit += 10) {
      for (let offset = 0; offset <= 500; offset += 50) {
        keys.push(
          `dm:messages:channel:${channelId}:limit:${limit}:offset:${offset}`,
        );
      }
    }

    await Promise.all(keys.map((key) => this.cacheService.del(key)));
  }
}
