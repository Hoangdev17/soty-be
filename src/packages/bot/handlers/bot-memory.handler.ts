import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { SnowflakeID } from '../../../utils/snowflake';
import { MessageService } from '../../message/message.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { WEBSOCKET_EVENTS } from '../../websocket/websocket-events.types';
import { BotActionContext, BotActionResult } from './bot-action.handler';

/**
 * Bot Memory Handler - Quản lý notification, reminder và memory
 */
@Injectable()
export class BotMemoryHandler {
  private readonly logger = new Logger(BotMemoryHandler.name);

  constructor(
    private prisma: PrismaService,
    private snowflake: SnowflakeID,
    @Inject(forwardRef(() => MessageService))
    private messageService: MessageService,
    @Inject(forwardRef(() => WebsocketGateway))
    private websocketGateway: WebsocketGateway,
  ) {}

  // ============= NOTIFICATION HANDLERS =============

  /**
   * Tạo notification cho user
   */
  async createNotification(
    botId: string,
    userId: string,
    title: string,
    message: string,
    options?: {
      guildId?: string;
      channelId?: string;
      type?: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'REMINDER';
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
      expiresAt?: Date;
    },
  ): Promise<BotActionResult> {
    try {
      const notification = await this.prisma.botNotification.create({
        data: {
          id: this.snowflake.generate(),
          botId,
          userId,
          guildId: options?.guildId,
          channelId: options?.channelId,
          title,
          message,
          type: options?.type || 'INFO',
          priority: options?.priority || 'NORMAL',
          expiresAt: options?.expiresAt,
        },
      });

      this.logger.log(
        `Notification created: ${notification.id} for user ${userId}`,
      );

      return {
        success: true,
        response: `✅ Thông báo đã được tạo: ${title}`,
        data: notification,
      };
    } catch (error) {
      this.logger.error('Error creating notification:', error);
      return {
        success: false,
        error: `Lỗi khi tạo thông báo: ${error.message}`,
      };
    }
  }

  /**
   * Lấy danh sách notification của user
   */
  async getUserNotifications(
    userId: string,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
      guildId?: string;
    },
  ): Promise<BotActionResult> {
    try {
      const notifications = await this.prisma.botNotification.findMany({
        where: {
          userId,
          read: options?.unreadOnly ? false : undefined,
          guildId: options?.guildId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: options?.limit || 50,
        include: {
          bot: {
            select: { id: true, username: true, avatar: true },
          },
        },
      });

      const unreadCount = await this.prisma.botNotification.count({
        where: { userId, read: false },
      });

      return {
        success: true,
        data: { notifications, unreadCount },
      };
    } catch (error) {
      this.logger.error('Error fetching notifications:', error);
      return {
        success: false,
        error: `Lỗi khi lấy thông báo: ${error.message}`,
      };
    }
  }

  /**
   * Đánh dấu notification đã đọc
   */
  async markNotificationAsRead(
    notificationId: string,
    userId: string,
  ): Promise<BotActionResult> {
    try {
      const notification = await this.prisma.botNotification.update({
        where: { id: notificationId, userId },
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      return {
        success: true,
        response: '✅ Đã đánh dấu thông báo đã đọc',
        data: notification,
      };
    } catch (error) {
      this.logger.error('Error marking notification as read:', error);
      return {
        success: false,
        error: `Lỗi khi đánh dấu thông báo: ${error.message}`,
      };
    }
  }

  // ============= REMINDER HANDLERS =============

  /**
   * Tạo reminder mới
   */
  async createReminder(
    botId: string,
    userId: string,
    channelId: string,
    title: string,
    message: string,
    remindAt: Date,
    options?: {
      guildId?: string;
      repeat?: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
      repeatInterval?: number; // minutes for CUSTOM
    },
  ): Promise<BotActionResult> {
    try {
      const reminder = await this.prisma.botReminder.create({
        data: {
          id: this.snowflake.generate(),
          botId,
          userId,
          channelId,
          guildId: options?.guildId,
          title,
          message,
          remindAt,
          repeat: options?.repeat || 'ONCE',
          repeatInterval: options?.repeatInterval,
        },
      });

      this.logger.log(`Reminder created: ${reminder.id} for user ${userId}`);

      // Format theo giờ Việt Nam (UTC+7)
      // remindAt trong DB là UTC, cộng 7 giờ để hiển thị
      const vietnamTime = new Date(remindAt.getTime() + 7 * 60 * 60 * 1000);
      const timeStr = vietnamTime.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      return {
        success: true,
        response: `⏰ Đã đặt nhắc nhở: ${title}\nThời gian: ${timeStr}`,
        data: reminder,
      };
    } catch (error) {
      this.logger.error('Error creating reminder:', error);
      return {
        success: false,
        error: `Lỗi khi tạo nhắc nhở: ${error.message}`,
      };
    }
  }

  /**
   * Lấy danh sách reminder của user
   */
  async getUserReminders(
    userId: string,
    options?: {
      activeOnly?: boolean;
      guildId?: string;
    },
  ): Promise<BotActionResult> {
    try {
      const reminders = await this.prisma.botReminder.findMany({
        where: {
          userId,
          isActive: options?.activeOnly ? true : undefined,
          completed: false,
          guildId: options?.guildId,
        },
        orderBy: { remindAt: 'asc' },
        include: {
          bot: {
            select: { id: true, username: true, avatar: true },
          },
        },
      });

      return {
        success: true,
        data: { reminders, count: reminders.length },
      };
    } catch (error) {
      this.logger.error('Error fetching reminders:', error);
      return {
        success: false,
        error: `Lỗi khi lấy nhắc nhở: ${error.message}`,
      };
    }
  }

  /**
   * Xử lý reminder đến hạn
   */
  async processReminder(reminderId: string): Promise<BotActionResult> {
    try {
      // Fetch và lock reminder bằng cách check + update atomic
      const reminder = await this.prisma.botReminder.findUnique({
        where: { id: reminderId },
        include: {
          bot: true,
          user: true,
        },
      });

      if (!reminder || !reminder.isActive || reminder.completed) {
        return {
          success: false,
          error: 'Reminder không tồn tại, đã tắt, hoặc đã hoàn thành',
        };
      }

      // Double check: nếu remindAt chưa đến, skip (có thể đã được xử lý và update)
      if (reminder.remindAt > new Date()) {
        return {
          success: true,
          data: { skipped: true, reason: 'Not due yet' },
        };
      }

      // Xử lý lặp lại hoặc complete NGAY
      if (reminder.repeat === 'ONCE') {
        // Đánh dấu completed
        await this.prisma.botReminder.update({
          where: { id: reminderId },
          data: {
            completed: true,
            completedAt: new Date(),
            isActive: false,
          },
        });
      } else {
        // Tính và update thời gian nhắc lại NGAY
        let nextRemindAt: Date | undefined;
        switch (reminder.repeat) {
          case 'DAILY':
            nextRemindAt = new Date(
              reminder.remindAt.getTime() + 24 * 60 * 60 * 1000,
            );
            break;
          case 'WEEKLY':
            nextRemindAt = new Date(
              reminder.remindAt.getTime() + 7 * 24 * 60 * 60 * 1000,
            );
            break;
          case 'MONTHLY':
            nextRemindAt = new Date(reminder.remindAt);
            nextRemindAt.setMonth(nextRemindAt.getMonth() + 1);
            break;
          case 'CUSTOM':
            if (reminder.repeatInterval) {
              nextRemindAt = new Date(
                reminder.remindAt.getTime() +
                  reminder.repeatInterval * 60 * 1000,
              );
            }
            break;
        }

        if (nextRemindAt) {
          await this.prisma.botReminder.update({
            where: { id: reminderId },
            data: { remindAt: nextRemindAt },
          });
        } else {
          // Nếu không có nextRemindAt, deactivate
          await this.prisma.botReminder.update({
            where: { id: reminderId },
            data: { isActive: false },
          });
        }
      }

      // SAU KHI ĐÃ LOCK, mới gửi tin nhắn nhắc nhở
      const content = `⏰ **Nhắc nhở: ${reminder.title}**\n\n${reminder.message}`;

      await this.messageService.sendMessage(
        {
          content,
          channelId: reminder.channelId,
          type: 'text',
          mentionAuthor: false,
        },
        reminder.botId,
      );

      return { success: true, data: { reminded: true } };
    } catch (error) {
      this.logger.error('Error processing reminder:', error);
      return {
        success: false,
        error: `Lỗi khi xử lý nhắc nhở: ${error.message}`,
      };
    }
  }

  /**
   * Xóa reminder
   */
  async deleteReminder(
    reminderId: string,
    userId: string,
  ): Promise<BotActionResult> {
    try {
      await this.prisma.botReminder.delete({
        where: { id: reminderId, userId },
      });

      return {
        success: true,
        response: '✅ Đã xóa nhắc nhở',
      };
    } catch (error) {
      this.logger.error('Error deleting reminder:', error);
      return {
        success: false,
        error: `Lỗi khi xóa nhắc nhở: ${error.message}`,
      };
    }
  }

  // ============= MEMORY HANDLERS =============

  /**
   * Lưu/cập nhật memory
   */
  async setMemory(
    botId: string,
    userId: string,
    key: string,
    value: string,
    options?: {
      guildId?: string;
      category?: string;
      importance?: number;
      expiresAt?: Date;
    },
  ): Promise<BotActionResult> {
    try {
      const whereClause = {
        botId,
        userId,
        guildId: options?.guildId || undefined,
        key,
      };

      const memory = await this.prisma.botMemory.upsert({
        where: {
          botId_userId_guildId_key: whereClause as any,
        },
        update: {
          value,
          category: options?.category,
          importance: options?.importance,
          expiresAt: options?.expiresAt,
          lastAccessed: new Date(),
        },
        create: {
          id: this.snowflake.generate(),
          botId,
          userId,
          guildId: options?.guildId,
          key,
          value,
          category: options?.category,
          importance: options?.importance || 1,
          expiresAt: options?.expiresAt,
        },
      });

      this.logger.log(`Memory saved: ${key} for user ${userId}`);

      return {
        success: true,
        data: memory,
      };
    } catch (error) {
      this.logger.error('Error setting memory:', error);
      return {
        success: false,
        error: `Lỗi khi lưu memory: ${error.message}`,
      };
    }
  }

  /**
   * Lấy memory
   */
  async getMemory(
    botId: string,
    userId: string,
    key: string,
    guildId?: string,
  ): Promise<BotActionResult> {
    try {
      const whereClause = {
        botId,
        userId,
        guildId: guildId || undefined,
        key,
      };

      const memory = await this.prisma.botMemory.findUnique({
        where: {
          botId_userId_guildId_key: whereClause as any,
        },
      });

      if (!memory) {
        return {
          success: false,
          error: 'Không tìm thấy memory',
        };
      }

      // Cập nhật lastAccessed
      await this.prisma.botMemory.update({
        where: { id: memory.id },
        data: { lastAccessed: new Date() },
      });

      return {
        success: true,
        data: memory,
      };
    } catch (error) {
      this.logger.error('Error getting memory:', error);
      return {
        success: false,
        error: `Lỗi khi lấy memory: ${error.message}`,
      };
    }
  }

  /**
   * Lấy tất cả memories của user
   */
  async getUserMemories(
    botId: string,
    userId: string,
    options?: {
      guildId?: string;
      category?: string;
    },
  ): Promise<BotActionResult> {
    try {
      const memories = await this.prisma.botMemory.findMany({
        where: {
          botId,
          userId,
          guildId: options?.guildId,
          category: options?.category,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: [{ importance: 'desc' }, { lastAccessed: 'desc' }],
      });

      return {
        success: true,
        data: { memories, count: memories.length },
      };
    } catch (error) {
      this.logger.error('Error fetching memories:', error);
      return {
        success: false,
        error: `Lỗi khi lấy memories: ${error.message}`,
      };
    }
  }

  /**
   * Cập nhật memory level dựa trên số tin nhắn
   * CHỈ INCREMENT COUNTER - không check level up tại đây
   */
  async updateMemoryLevel(
    botId: string,
    userId: string,
    guildId?: string,
    channelId?: string,
  ): Promise<BotActionResult> {
    try {
      const whereClause = {
        botId,
        userId,
        guildId: guildId || undefined,
      };

      const memoryLevel = await this.prisma.botMemoryLevel.upsert({
        where: {
          botId_userId_guildId: whereClause as any,
        },
        update: {
          totalMessages: { increment: 1 },
          lastMessageAt: new Date(),
        },
        create: {
          id: this.snowflake.generate(),
          botId,
          userId,
          guildId,
          level: 1,
          totalMessages: 1,
          lastMessageAt: new Date(),
        },
      });

      return {
        success: true,
        data: {
          levelUp: false,
          level: memoryLevel.level,
          totalMessages: memoryLevel.totalMessages + 1,
        },
      };
    } catch (error) {
      this.logger.error('Error updating memory level:', error);
      return {
        success: false,
        error: `Lỗi khi cập nhật memory level: ${error.message}`,
      };
    }
  }

  /**
   * Check và xử lý level up cho user (gọi từ cron job)
   */
  async checkAndProcessLevelUp(
    botId: string,
    userId: string,
    guildId: string,
    channelId: string,
  ): Promise<void> {
    try {
      const whereClause = {
        botId,
        userId,
        guildId: guildId || undefined,
      };

      const memoryLevel = await this.prisma.botMemoryLevel.findUnique({
        where: {
          botId_userId_guildId: whereClause as any,
        },
      });

      if (!memoryLevel) return;

      // Tính level dựa trên số tin nhắn
      let newLevel = 1;
      const totalMessages = memoryLevel.totalMessages;

      if (totalMessages >= 1000) newLevel = 5;
      else if (totalMessages >= 500) newLevel = 4;
      else if (totalMessages >= 200) newLevel = 3;
      else if (totalMessages >= 20) newLevel = 2;

      // Nếu level up
      if (newLevel !== memoryLevel.level) {
        await this.prisma.botMemoryLevel.update({
          where: { id: memoryLevel.id },
          data: { level: newLevel },
        });

        // Cập nhật level cho tất cả memories của user này
        await this.prisma.botMemory.updateMany({
          where: { botId, userId, guildId },
          data: { level: newLevel, messageCount: totalMessages },
        });

        // Get user info để hiển thị
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, avatar: true },
        });

        const levelEmojis = ['📝', '📚', '🎓', '🧠', '💎'];
        const emoji = levelEmojis[newLevel - 1] || '📝';

        // Gửi tin nhắn thông báo level up vào channel
        const levelUpContent = `🎉 **Chúc mừng ${user?.username || 'Unknown'} đã lên cấp!**\n\n${emoji} Level ${memoryLevel.level} → Level ${newLevel}\n📊 Tổng tin nhắn: ${totalMessages}`;

        await this.messageService.sendMessage(
          {
            content: levelUpContent,
            channelId,
            type: 'text',
            mentionAuthor: false,
          },
          botId,
        );

        this.logger.log(
          `User ${userId} leveled up from ${memoryLevel.level} to ${newLevel}`,
        );
      }
    } catch (error) {
      this.logger.error('Error in checkAndProcessLevelUp:', error);
    }
  }

  /**
   * Lấy memory level của user
   */
  async getMemoryLevel(
    botId: string,
    userId: string,
    guildId?: string,
  ): Promise<BotActionResult> {
    try {
      const whereClause = {
        botId,
        userId,
        guildId: guildId || undefined,
      };

      const memoryLevel = await this.prisma.botMemoryLevel.findUnique({
        where: {
          botId_userId_guildId: whereClause as any,
        },
      });

      if (!memoryLevel) {
        return {
          success: true,
          data: {
            level: 0,
            totalMessages: 0,
            nextLevelAt: 50,
          },
        };
      }

      // Tính số tin nhắn cần cho level tiếp theo
      let nextLevelAt = 0;
      if (memoryLevel.level === 1) nextLevelAt = 50;
      else if (memoryLevel.level === 2) nextLevelAt = 200;
      else if (memoryLevel.level === 3) nextLevelAt = 500;
      else if (memoryLevel.level === 4) nextLevelAt = 1000;

      return {
        success: true,
        data: {
          ...memoryLevel,
          nextLevelAt,
          progress:
            nextLevelAt > 0
              ? Math.min(
                  100,
                  Math.floor((memoryLevel.totalMessages / nextLevelAt) * 100),
                )
              : 100,
        },
      };
    } catch (error) {
      this.logger.error('Error getting memory level:', error);
      return {
        success: false,
        error: `Lỗi khi lấy memory level: ${error.message}`,
      };
    }
  }

  /**
   * Xóa memory
   */
  async deleteMemory(
    botId: string,
    userId: string,
    key: string,
    guildId?: string,
  ): Promise<BotActionResult> {
    try {
      const whereClause = {
        botId,
        userId,
        guildId: guildId || undefined,
        key,
      };

      await this.prisma.botMemory.delete({
        where: {
          botId_userId_guildId_key: whereClause as any,
        },
      });

      return {
        success: true,
        response: '✅ Đã xóa memory',
      };
    } catch (error) {
      this.logger.error('Error deleting memory:', error);
      return {
        success: false,
        error: `Lỗi khi xóa memory: ${error.message}`,
      };
    }
  }

  /**
   * Dọn dẹp memories hết hạn
   */
  async cleanupExpiredMemories(): Promise<void> {
    try {
      const result = await this.prisma.botMemory.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} expired memories`);
    } catch (error) {
      this.logger.error('Error cleaning up expired memories:', error);
    }
  }

  /**
   * Dọn dẹp notifications hết hạn
   */
  async cleanupExpiredNotifications(): Promise<void> {
    try {
      const result = await this.prisma.botNotification.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} expired notifications`);
    } catch (error) {
      this.logger.error('Error cleaning up expired notifications:', error);
    }
  }
}
