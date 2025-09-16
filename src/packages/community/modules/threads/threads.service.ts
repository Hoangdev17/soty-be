import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CacheService } from 'src/core/cache/cache.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { CreateThreadDto } from './dto/create-thread.dto';
import { ChannelType } from '@prisma/client';

@Injectable()
export class ThreadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeID,
    private readonly cacheService: CacheService,
  ) {}

  async createThread(
    channelId: string,
    createThreadDto: CreateThreadDto,
    userId: string,
  ) {
    // Verify parent channel exists and is not already a thread
    const parentChannel = await this.prisma.guildChannel.findUnique({
      where: {
        id: channelId,
      },
      select: {
        id: true,
        guildId: true,
        type: true,
        deleted: true,
      },
    });

    if (!parentChannel || parentChannel.deleted) {
      throw new Error('Parent channel not found');
    }

    if (
      parentChannel.type !== ChannelType.GUILD_TEXT &&
      parentChannel.type !== ChannelType.GUILD_FORUM
    ) {
      throw new Error('Cannot create threads in this channel type');
    }

    // Create thread channel
    const threadId = this.snowflake.generate();
    const thread = await this.prisma.guildChannel.create({
      data: {
        id: threadId,
        name: createThreadDto.name,
        topic: createThreadDto.topic,
        type:
          createThreadDto.type === 'GUILD_PRIVATE_THREAD'
            ? ChannelType.GUILD_PRIVATE_THREAD
            : ChannelType.GUILD_PUBLIC_THREAD,
        parentId: channelId,
        guildId: parentChannel.guildId,
        starterMessageId: createThreadDto.starterMessageId
          ? createThreadDto.starterMessageId
          : createThreadDto.starterMessageId,
        rateLimitPerUser: 0,
        createdById: userId,
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

    // Clear related cache
    await this.clearThreadCache(parentChannel.guildId, channelId, threadId);

    return thread;
  }

  async getThreads(channelId: string) {
    const cacheKey = `threads:channel:${channelId}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const threads = await this.prisma.guildChannel.findMany({
      where: {
        parentId: channelId,
        deleted: false,
        type: {
          in: [
            ChannelType.GUILD_PUBLIC_THREAD,
            ChannelType.GUILD_PRIVATE_THREAD,
          ],
        },
      },
      include: {
        createdBy: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    // Cache for 2 minutes
    await this.cacheService.set(cacheKey, threads, 120);
    return threads;
  }

  async getThreadById(channelId: string, threadId: string) {
    const cacheKey = `thread:${threadId}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const thread = await this.prisma.guildChannel.findFirst({
      where: {
        id: threadId,
        parentId: channelId,
        deleted: false,
        type: {
          in: [
            ChannelType.GUILD_PUBLIC_THREAD,
            ChannelType.GUILD_PRIVATE_THREAD,
          ],
        },
      },
      include: {
        parent: {
          select: { id: true, name: true, type: true },
        },
        messages: {
          take: 50,
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: { id: true, username: true, avatar: true },
            },
          },
        },
        createdBy: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    if (thread) {
      // Cache for 3 minutes
      await this.cacheService.set(cacheKey, thread, 180);
    }

    return thread;
  }

  async updateThread(threadId: string, updateData: Partial<CreateThreadDto>) {
    const thread = await this.prisma.guildChannel.update({
      where: { id: threadId },
      data: {
        name: updateData.name,
        topic: updateData.topic,
      },
    });

    // Clear related cache
    await this.clearThreadCache(thread.guildId, thread.parentId!, threadId);

    return thread;
  }

  async deleteThread(threadId: string) {
    const thread = await this.prisma.guildChannel.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new Error('Thread not found');
    }

    // Soft delete the thread
    const deleted = await this.prisma.guildChannel.update({
      where: { id: threadId },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    });

    // Clear related cache
    await this.clearThreadCache(thread.guildId, thread.parentId!, threadId);

    return deleted;
  }

  async joinThread(threadId: string, userId: string) {
    // For now, we'll just return success since thread permissions
    // are handled by channel permissions
    // In the future, we could add a thread_members table
    return { success: true, threadId, userId };
  }

  async leaveThread(threadId: string, userId: string) {
    // For now, we'll just return success since thread permissions
    // are handled by channel permissions
    return { success: true, threadId, userId };
  }

  private async clearThreadCache(
    guildId: string,
    channelId: string,
    threadId: string,
  ) {
    await Promise.all([
      this.cacheService.del(`threads:channel:${channelId}`),
      this.cacheService.del(`thread:${threadId}`),
      this.cacheService.del(`channels:guild:${guildId}`),
      this.cacheService.del(`community:${guildId}`),
    ]);
  }
}
