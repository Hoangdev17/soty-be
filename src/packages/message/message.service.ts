import { Injectable, Inject, forwardRef, Optional } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CacheService } from 'src/core/cache/cache.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SnowflakeID } from 'src/utils/snowflake';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { WEBSOCKET_EVENTS } from '../websocket/websocket-events.types';
import { BotMessageProcessor } from '../bot/handlers/bot-message.processor';
import { QueueService } from 'src/core/queue/queue.service';
import { MessageFilterService } from './message-filter.service';

@Injectable()
export class MessageService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly snowflakeID: SnowflakeID,
    private readonly cacheService: CacheService,
    @Inject(forwardRef(() => WebsocketGateway))
    private readonly websocketGateway: WebsocketGateway,
    private readonly queueService: QueueService,
    private readonly messageFilterService: MessageFilterService,
    @Optional()
    @Inject(forwardRef(() => BotMessageProcessor))
    private readonly botMessageProcessor?: BotMessageProcessor,
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
            avatarEffectId: true,
          },
        },
        channel: {
          select: {
            id: true,
            name: true,
            recipients: true,
            guildId: true,
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
          type: 0,
        },
      });
    }

    // Clear messages cache for this channel
    await this.clearChannelMessagesCache(channelId);

    // Optionally fetch guild name only when guildId exists
    let guildName = '';
    if (message.channel.guildId) {
      const guild = await this.prismaService.guild.findUnique({
        where: { id: message.channel.guildId },
        select: { name: true },
      });
      guildName = guild?.name ?? '';
    }

    // Build response object
    const response: any = {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      // Default status for recipients is UNREAD. Clients can interpret this string.
      status: 'UNREAD',
      type: replyToMessageId ? 'reply' : 'text',
      room: `channel_${channelId}`,
      author: {
        id: message.author.id,
        username: message.author.username,
        avatar: message.author.avatar || '',
        avatarEffectId: message.author.avatarEffectId || null,
      },
      channelId: message.channel.id,
      channelName: message.channel.name,
      guildId: message.channel.guildId || '',
      guildName,
    };

    // Add reply information if this is a reply
    if (replyToMessageId && originalMessage) {
      response.replyTo = {
        id: originalMessage.id,
        content: originalMessage.content,
        author: originalMessage.author,
      };
    }

    // If this channel has explicit recipients (DM / Group DM), emit the message
    // directly to each user's personal room so they receive unread notifications.
    try {
      const recipients: string[] = (message.channel as any)?.recipients || [];
      if (recipients && recipients.length > 0) {
        // DM/Group DM - emit to each recipient
        for (const userId of recipients) {
          // Skip emitting to sender's personal room as they are the sender
          if (userId === authorId) {
            // Optionally, mark sender's view as SEEN
            const senderPayload = { ...response, status: 'SEEN' };
            this.websocketGateway.emitToUser(
              userId,
              WEBSOCKET_EVENTS.MESSAGE,
              senderPayload,
            );
            continue;
          }

          // For other recipients, send UNREAD
          const recipientPayload = { ...response, status: 'UNREAD' };
          this.websocketGateway.emitToUser(
            userId,
            WEBSOCKET_EVENTS.MESSAGE,
            recipientPayload,
          );
        }
      } else if (message.channel.guildId) {
        // Guild message - emit to channel room
        this.websocketGateway.emitToRoom(
          `channel_${channelId}`,
          WEBSOCKET_EVENTS.MESSAGE,
          response,
        );
      }
    } catch (e) {
      // don't block on websocket errors
      // console.warn('Failed to emit direct message notifications', e);
    }

    // Queue bot processing for async execution (non-blocking)
    if (message.channel.guildId && this.botMessageProcessor) {
      try {
        // Đẩy vào queue để xử lý bất đồng bộ
        await this.queueService.queueBotCommand({
          command: 'process_message',
          messageId: message.id,
          channelId: message.channel.id,
          guildId: message.channel.guildId,
          authorId: message.author.id,
          content: message.content,
        });

        // Also queue message filtering for automatic moderation
        await this.queueService.queueBotCommand({
          command: 'filter_message',
          messageId: message.id,
          channelId: message.channel.id,
          guildId: message.channel.guildId,
          authorId: message.author.id,
          content: message.content,
        });
      } catch (error) {
        // Don't block on queue errors
        console.warn('Failed to queue bot processing:', error);
      }
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
      orderBy: { createdAt: 'desc' }, // Lấy tin nhắn mới nhất trước
      take: limitNum,
      skip: offsetNum,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            avatarEffectId: true,
          },
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
          avatarEffectId: message.author.avatarEffectId || null,
        },
        channelId: message.channelId,
        deleted: message.deleted,
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

    // Reverse để hiển thị cũ → mới (vì query đã lấy mới → cũ)
    const orderedMessages = formattedMessages.reverse();

    // Cache for 1 minute
    await this.cacheService.set(cacheKey, orderedMessages, 60);
    return orderedMessages;
  }

  private async clearChannelMessagesCache(channelId: string) {
    // Use pattern matching to delete all message cache keys for this channel
    const patterns = [
      `messages:channel:${channelId}:*`, // All pagination combinations
      `pinned:channel:${channelId}`, // Pinned messages
      `message:*:replies`, // Message replies (more specific would be better but this catches related)
    ];

    await Promise.all(
      patterns.map((pattern) => this.cacheService.deleteByPattern(pattern)),
    );
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

    const replyResponse = {
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

    // Process bot commands if message is in a guild
    if (originalMessage.channel?.guildId && this.botMessageProcessor) {
      try {
        await this.botMessageProcessor.processMessage({
          messageId: reply.id,
          channelId: channelId,
          guildId: originalMessage.channel.guildId,
          authorId: authorId,
          content: reply.content,
        });
      } catch (error) {
        // Don't block on bot processing errors
        console.warn('Failed to process bot commands:', error);
      }
    }

    return replyResponse;
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

  // Upsert last-read per user per channel (persist to DB + update cache)
  async setLastRead(
    channelId: string,
    userId: string,
    lastReadMessageId?: string | null,
  ) {
    const now = new Date();

    try {
      // 1) Persist to DB (durable)
      const upsertResult = await this.prismaService.channelLastRead.upsert({
        where: { channelId_userId: { channelId, userId } },
        update: {
          lastReadMessageId: lastReadMessageId ?? null,
          readAt: now,
        },
        create: {
          id: this.snowflakeID.generate(),
          channelId,
          userId,
          lastReadMessageId: lastReadMessageId ?? null,
          readAt: now,
        },
      });

      // 2) Update cache for fast reads (optional, keep TTL)
      const key = `channel:${channelId}:user:${userId}:lastReadMessage`;
      await this.cacheService.set(
        key,
        lastReadMessageId ?? null,
        60 * 60 * 24 * 30,
      );

      return { channelId, userId, lastReadMessageId, readAt: now };
    } catch (error) {
      console.error(`[DEBUG] Error in setLastRead:`, error);
      throw error;
    }
  }

  // Get unread count for a user in a channel
  async getUnreadCount(channelId: string, userId: string) {
    // Always get fresh data from DB
    const lastRead = await this.prismaService.channelLastRead.findUnique({
      where: { channelId_userId: { channelId, userId } },
      select: { lastReadMessageId: true, readAt: true },
    });
    const lastReadMessageId = lastRead?.lastReadMessageId ?? null;

    let whereCondition: any = { channelId, deleted: false };

    if (lastReadMessageId) {
      whereCondition.id = { gt: lastReadMessageId };
    }

    const count = await this.prismaService.guildMessage.count({
      where: whereCondition,
    });

    return { channelId, unreadCount: count };
  }

  // Get total unread count for a user in a community (all channels)
  async getCommunityUnreadCount(guildId: string, userId: string) {
    // Get all channels in the guild
    const channels = await this.prismaService.guildChannel.findMany({
      where: { guildId, type: 'GUILD_TEXT' },
      select: { id: true, name: true },
    });

    let totalUnread = 0;

    // Sum unread count from each channel
    for (const channel of channels) {
      const { unreadCount } = await this.getUnreadCount(channel.id, userId);
      totalUnread += unreadCount;
    }

    return { guildId, totalUnreadCount: totalUnread };
  }

  // Get unread count for each channel in a community
  async getCommunityChannelsUnreadCount(guildId: string, userId: string) {
    // Get all channels in the guild
    const channels = await this.prismaService.guildChannel.findMany({
      where: { guildId, type: 'GUILD_TEXT' },
      select: { id: true, name: true },
    });

    const channelsUnread = await Promise.all(
      channels.map(async (channel) => {
        const { unreadCount } = await this.getUnreadCount(channel.id, userId);

        return {
          channelId: channel.id,
          channelName: channel.name,
          unreadCount,
        };
      }),
    );

    const totalUnread = channelsUnread.reduce(
      (sum, ch) => sum + ch.unreadCount,
      0,
    );

    return { guildId, channels: channelsUnread, total: totalUnread };
  }

  // Mark all messages in a channel as read for a user
  async markChannelAsRead(channelId: string, userId: string) {
    // Find the message with the highest ID in the channel (most recent)
    const latestMessage = await this.prismaService.guildMessage.findFirst({
      where: { channelId, deleted: false },
      orderBy: { id: 'desc' }, // Order by ID desc to get the highest ID
      select: { id: true },
    });

    const lastReadMessageId = latestMessage?.id ?? null;

    // Call setLastRead with the latest message ID
    const result = await this.setLastRead(channelId, userId, lastReadMessageId);

    return result;
  }

  /**
   * Delete a message
   */
  async deleteMessage(
    messageId: string,
    userId: string,
    reason: string = 'user_deleted',
    filterType?: string,
  ) {
    try {
      // Find the message first
      const message = await this.prismaService.guildMessage.findUnique({
        where: { id: messageId },
        include: {
          author: {
            select: { id: true, username: true },
          },
          channel: {
            select: { id: true, guildId: true },
          },
        },
      });

      if (!message) {
        throw new Error('Message not found');
      }

      if (message.deleted) {
        throw new Error('Message already deleted');
      }

      // Soft delete the message
      const deletedMessage = await this.prismaService.guildMessage.update({
        where: { id: messageId },
        data: {
          deleted: true,
          deletedAt: new Date(),
        },
        include: {
          author: {
            select: { id: true, username: true, avatar: true },
          },
        },
      });

      // Clear cache for this channel's messages
      await this.clearChannelMessagesCache(message.channelId);

      // Emit delete event through WebSocket
      this.websocketGateway.emitToRoom(
        `channel_${message.channelId}`,
        WEBSOCKET_EVENTS.MESSAGE_DELETED,
        {
          messageId,
          channelId: message.channelId,
          guildId: message.channel.guildId,
          deletedBy: userId,
          reason,
          filterType, // spam, toxic, etc.
        },
      );

      return {
        success: true,
        message: 'Message deleted successfully',
        deletedMessage: {
          id: deletedMessage.id,
          content: deletedMessage.content,
          authorId: deletedMessage.authorId,
          deletedAt: deletedMessage.deletedAt,
        },
      };
    } catch (error) {
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  }
}
