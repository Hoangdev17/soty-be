import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CacheService } from 'src/core/cache/cache.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SnowflakeID } from 'src/utils/snowflake';

@Injectable()
export class MessageService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly snowflakeID: SnowflakeID,
    private readonly cacheService: CacheService,
  ) {}

  async sendMessage(sendMessageDto: SendMessageDto, authorId: string) {
    const { content, channelId } = sendMessageDto;

    // Create the message in database
    const message = await this.prismaService.guildMessage.create({
      data: {
        id: this.snowflakeID.generate(),
        content,
        channelId,
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        channel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Clear messages cache for this channel
    const pattern = `messages:channel:${channelId}:*`;
    await this.clearChannelMessagesCache(channelId);

    return {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      type: 'text',
      room: `channel_${channelId}`,
      author: {
        id: message.author.id,
        username: message.author.username,
        avatar: message.author.avatar || '',
      },
      channelId: message.channel.id,
      channelName: message.channel.name,
    };
  }

  async getMessages(channelId: string, limit?: string, offset?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    const cacheKey = `messages:channel:${channelId}:limit:${limitNum}:offset:${offsetNum}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const messages = await this.prismaService.guildMessage.findMany({
      where: { channelId },
      orderBy: { createdAt: 'asc' },
      take: limitNum,
      skip: offsetNum,
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    // Cache for 1 minute
    await this.cacheService.set(cacheKey, messages, 60);
    return messages;
  }

  private async clearChannelMessagesCache(channelId: string) {
    // Clear all cached messages for this channel
    // Since Redis doesn't support pattern deletion natively, we'll use a simple approach
    const keys = [
      `messages:channel:${channelId}:recent`,
      `messages:channel:${channelId}:count`,
    ];

    // Clear common pagination combinations
    for (let limit = 10; limit <= 100; limit += 10) {
      for (let offset = 0; offset <= 500; offset += 50) {
        keys.push(
          `messages:channel:${channelId}:limit:${limit}:offset:${offset}`,
        );
      }
    }

    await Promise.all(keys.map((key) => this.cacheService.del(key)));
  }
}
