import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CacheService } from 'src/core/cache/cache.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SnowflakeID } from 'src/utils/snowflake';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { WEBSOCKET_EVENTS } from '../websocket/websocket-events.types';
// ...existing imports...

@Injectable()
export class MessageService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly snowflakeID: SnowflakeID,
    private readonly cacheService: CacheService,
    @Inject(forwardRef(() => WebsocketGateway))
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  async sendMessage(sendMessageDto: SendMessageDto, authorId: string) {
    const { content, channelId, replyToMessageId, mentionAuthor } =
      sendMessageDto;

    // If this is a reply, verify the original message exists
    let originalMessage: any = null;
    if (replyToMessageId) {
      originalMessage = await this.prismaService.guildMessage.findFirst({
        where: {
          id: replyToMessageId,
          channelId,
          deleted: false,
        },
        include: {
          author: {
            select: { id: true, username: true, avatar: true },
          },
          channel: {
            select: { id: true, name: true, guildId: true },
          },
        },
      });

      if (!originalMessage) {
        throw new Error('Original message not found');
      }
    }

    // Create the message in database
    const message = await this.prismaService.guildMessage.create({
      data: {
        id: this.snowflakeID.generate(),
        content:
          replyToMessageId && mentionAuthor
            ? `<@${originalMessage.author.id}> ${content}`
            : content,
        channelId,
        authorId,
        type: replyToMessageId ? 19 : 0, // 19 = REPLY type
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

    // If this is a reply, create the message reference
    if (replyToMessageId) {
      await this.prismaService.guildMessageReference.create({
        data: {
          id: this.snowflakeID.generate(),
          reference: replyToMessageId,
          referenceBy: message.id,
          channelId,
          guildId: originalMessage.channel?.guildId,
          type: 0, // DEFAULT reference type
        },
      });
    }

    // Clear messages cache for this channel
    await this.clearChannelMessagesCache(channelId);

    // Build response object
    const response: any = {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      type: replyToMessageId ? 'reply' : 'text',
      room: `channel_${channelId}`,
      author: {
        id: message.author.id,
        username: message.author.username,
        avatar: message.author.avatar || '',
      },
      channelId: message.channel.id,
      channelName: message.channel.name,
    };

    // Add reply information if this is a reply
    if (replyToMessageId && originalMessage) {
      response.replyTo = {
        id: originalMessage.id,
        content: originalMessage.content,
        author: originalMessage.author,
      };
    }

    return response;
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
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        referredBy: {
          include: {
            messageRef: {
              select: {
                id: true,
                content: true,
                author: {
                  select: { id: true, username: true, avatar: true },
                },
              },
            },
          },
        },
      },
    });

    // Format messages to include reply information
    const formattedMessages = messages.map((message) => {
      const baseMessage: any = {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        type: message.type === 19 ? 'reply' : 'text',
        author: {
          id: message.author.id,
          username: message.author.username,
          avatar: message.author.avatar || '',
        },
        channelId: message.channelId,
      };

      // Add reply information if this message has references
      if (message.referredBy && message.referredBy.length > 0) {
        const reference = message.referredBy[0]; // Get first reference
        baseMessage.replyTo = {
          id: reference.messageRef.id,
          content: reference.messageRef.content,
          author: reference.messageRef.author,
        };
      }

      return baseMessage;
    });

    // Cache for 1 minute
    await this.cacheService.set(cacheKey, formattedMessages, 60);
    return formattedMessages;
  }

  private async clearChannelMessagesCache(channelId: string) {
    // Clear all cached messages for this channel
    // Since Redis doesn't support pattern deletion natively, we'll use a simple approach
    const keys = [
      `messages:channel:${channelId}:recent`,
      `messages:channel:${channelId}:count`,
      `pinned:channel:${channelId}`,
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

  async pinMessage(messageId: string, channelId: string, pinnedById: string) {
    // Check if message exists and is not already pinned
    const message = await this.prismaService.guildMessage.findFirst({
      where: {
        id: messageId,
        channelId,
        deleted: false,
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Check if already pinned
    const existingPin = await this.prismaService.pinnedMessage.findFirst({
      where: { messageId },
    });

    if (existingPin) {
      throw new Error('Message is already pinned');
    }

    // Create pin record
    const pinned = await this.prismaService.pinnedMessage.create({
      data: {
        id: this.snowflakeID.generate(),
        messageId,
        channelId,
        pinnedById,
      },
      include: {
        message: {
          include: {
            author: {
              select: { id: true, username: true, avatar: true },
            },
          },
        },
        pinnedBy: { select: { id: true, username: true, avatar: true } },
      },
    });

    // Update message pinned status
    await this.prismaService.guildMessage.update({
      where: { id: messageId },
      data: { pinned: true },
    });

    // Clear cache
    await this.clearChannelMessagesCache(channelId);

    const formatted = {
      id: pinned.message.id,
      content: pinned.message.content,
      createdAt: pinned.message.createdAt,
      type: 'text',
      author: {
        id: pinned.message.author.id,
        username: pinned.message.author.username,
        avatar: pinned.message.author.avatar || '',
      },
      channelId: pinned.message.channelId,
      pinned: true, // Thêm flag pinned
      pinnedAt: pinned.pinnedAt,
      pinnedBy: {
        id: pinned.pinnedBy.id,
        username: pinned.pinnedBy.username,
        avatar: pinned.pinnedBy.avatar || '',
      },
    };

    this.websocketGateway.emitToRoom(
      `channel_${channelId}`,
      WEBSOCKET_EVENTS.MESSAGES_PINNED,
      { channelId, formatted },
    );

    return {
      id: pinned.message.id,
      content: pinned.message.content,
      createdAt: pinned.message.createdAt,
      type: 'text',
      author: {
        id: pinned.message.author.id,
        username: pinned.message.author.username,
        avatar: pinned.message.author.avatar || '',
      },
      channelId: pinned.message.channelId,
      pinned: true, // Thêm flag pinned
      pinnedAt: pinned.pinnedAt,
      pinnedBy: {
        id: pinned.pinnedBy.id,
        username: pinned.pinnedBy.username,
        avatar: pinned.pinnedBy.avatar || '',
      },
    };
  }

  async unpinMessage(messageId: string, channelId: string) {
    // Check if message is pinned
    const pinnedMessage = await this.prismaService.pinnedMessage.findFirst({
      where: { messageId, channelId },
    });

    if (!pinnedMessage) {
      throw new Error('Message is not pinned');
    }

    // Remove pin record
    await this.prismaService.pinnedMessage.delete({
      where: { id: pinnedMessage.id },
    });

    // Update message pinned status
    await this.prismaService.guildMessage.update({
      where: { id: messageId },
      data: { pinned: false },
    });

    // Clear cache
    await this.clearChannelMessagesCache(channelId);

    this.websocketGateway.emitToRoom(
      `channel_${channelId}`,
      WEBSOCKET_EVENTS.MESSAGES_UNPINNED,
      { channelId, messageId },
    );

    return { success: true, messageId };
  }

  async getPinnedMessages(channelId: string) {
    const cacheKey = `pinned:channel:${channelId}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const pinnedMessages = await this.prismaService.pinnedMessage.findMany({
      where: { channelId },
      orderBy: { pinnedAt: 'desc' },
      include: {
        message: {
          include: {
            author: {
              select: { id: true, username: true, avatar: true },
            },
            channel: {
              select: { id: true, name: true },
            },
          },
        },
        pinnedBy: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    // Transform to consistent message format
    const formattedMessages = pinnedMessages.map((pinned) => ({
      id: pinned.message.id,
      content: pinned.message.content,
      createdAt: pinned.message.createdAt,
      type: 'text',
      author: {
        id: pinned.message.author.id,
        username: pinned.message.author.username,
        avatar: pinned.message.author.avatar || '',
      },
      channelId: pinned.message.channelId,
      channelName: pinned.message.channel?.name || '',
      pinned: true,
      pinnedAt: pinned.pinnedAt,
      pinnedBy: {
        id: pinned.pinnedBy.id,
        username: pinned.pinnedBy.username,
        avatar: pinned.pinnedBy.avatar || '',
      },
    }));

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, formattedMessages, 300);
    return formattedMessages;
  }

  async sendReply(
    content: string,
    channelId: string,
    replyToMessageId: string,
    authorId: string,
    mentionAuthor: boolean = false,
  ) {
    // Verify the message being replied to exists
    const originalMessage = await this.prismaService.guildMessage.findFirst({
      where: {
        id: replyToMessageId,
        channelId,
        deleted: false,
      },
      include: {
        author: {
          select: { id: true, username: true },
        },
        channel: {
          select: { id: true, name: true, guildId: true },
        },
      },
    });

    if (!originalMessage) {
      throw new Error('Original message not found');
    }

    // Create reply message
    const replyId = this.snowflakeID.generate();
    const reply = await this.prismaService.guildMessage.create({
      data: {
        id: replyId,
        content: mentionAuthor
          ? `<@${originalMessage.author.id}> ${content}`
          : content,
        channelId,
        authorId,
        type: 19, // REPLY type
      },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        channel: {
          select: { id: true, name: true },
        },
      },
    });

    // Create message reference
    await this.prismaService.guildMessageReference.create({
      data: {
        id: this.snowflakeID.generate(),
        reference: replyToMessageId,
        referenceBy: replyId,
        channelId,
        guildId: originalMessage.channel?.guildId,
        type: 0, // DEFAULT reference type
      },
    });

    // Clear messages cache
    await this.clearChannelMessagesCache(channelId);

    return {
      id: reply.id,
      content: reply.content,
      createdAt: reply.createdAt,
      type: 'reply',
      room: `channel_${channelId}`,
      author: {
        id: reply.author.id,
        username: reply.author.username,
        avatar: reply.author.avatar || '',
      },
      channelId: reply.channel.id,
      channelName: reply.channel.name,
      replyTo: {
        id: originalMessage.id,
        content: originalMessage.content,
        author: originalMessage.author,
      },
    };
  }

  async getMessageWithReplies(messageId: string) {
    const cacheKey = `message:${messageId}:replies`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const message = await this.prismaService.guildMessage.findUnique({
      where: { id: messageId },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        referredBy: {
          include: {
            messageBy: {
              include: {
                author: {
                  select: { id: true, username: true, avatar: true },
                },
              },
            },
          },
        },
        references: {
          include: {
            messageRef: {
              include: {
                author: {
                  select: { id: true, username: true, avatar: true },
                },
              },
            },
          },
        },
      },
    });

    if (message) {
      // Cache for 2 minutes
      await this.cacheService.set(cacheKey, message, 120);
    }

    return message;
  }
}
